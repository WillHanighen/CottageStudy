import {
	MAX_CARD_DEFINITION_CHARS,
	MAX_CARD_TERM_CHARS,
	MAX_MC_DISTRACTORS_PER_SIDE
} from '$lib/notecardLimits';

/** Stored on each card (SQLite JSON + cottage-study/v2 export). */
export type McDistractors = {
	incorrect_definitions: string[];
	incorrect_terms: string[];
};

export function emptyMcDistractors(): McDistractors {
	return { incorrect_definitions: [], incorrect_terms: [] };
}

function normalizeEquality(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Clamp, dedupe within array, drop matches to `exclude`, cap length char-wise. */
export function normalizeDistractorList(
	raw: unknown[],
	exclude: string,
	maxItems: number,
	maxChars: number
): string[] {
	const ex = normalizeEquality(exclude);
	const out: string[] = [];
	const seen = new Set<string>();
	for (const x of raw) {
		if (typeof x !== 'string') continue;
		const t = x.trim();
		if (!t) continue;
		const clipped = t.length > maxChars ? t.slice(0, maxChars) : t;
		const key = normalizeEquality(clipped);
		if (key === ex || seen.has(key)) continue;
		seen.add(key);
		out.push(clipped);
		if (out.length >= maxItems) break;
	}
	return out;
}

export function parseMcDistractorsJson(raw: string | null | undefined): McDistractors | null {
	if (raw == null || raw === '') return null;
	try {
		const o = JSON.parse(raw) as Record<string, unknown>;
		if (!o || typeof o !== 'object') return null;
		const defRaw = Array.isArray(o.incorrect_definitions) ? o.incorrect_definitions : [];
		const termRaw = Array.isArray(o.incorrect_terms) ? o.incorrect_terms : [];
		const incorrect_definitions = normalizeDistractorList(
			defRaw,
			'',
			MAX_MC_DISTRACTORS_PER_SIDE,
			MAX_CARD_DEFINITION_CHARS
		);
		const incorrect_terms = normalizeDistractorList(termRaw, '', MAX_MC_DISTRACTORS_PER_SIDE, MAX_CARD_TERM_CHARS);
		if (incorrect_definitions.length === 0 && incorrect_terms.length === 0) return null;
		return { incorrect_definitions, incorrect_terms };
	} catch {
		return null;
	}
}

export function serializeMcDistractorsForDb(m: McDistractors | null | undefined): string | null {
	if (!m) return null;
	const trimmed: McDistractors = {
		incorrect_definitions: normalizeDistractorList(
			m.incorrect_definitions,
			'',
			MAX_MC_DISTRACTORS_PER_SIDE,
			MAX_CARD_DEFINITION_CHARS
		),
		incorrect_terms: normalizeDistractorList(
			m.incorrect_terms,
			'',
			MAX_MC_DISTRACTORS_PER_SIDE,
			MAX_CARD_TERM_CHARS
		)
	};
	if (trimmed.incorrect_definitions.length === 0 && trimmed.incorrect_terms.length === 0) return null;
	return JSON.stringify(trimmed);
}

type CardLike = {
	id?: string;
	term: string;
	definition: string;
	mc_distractors?: McDistractors | null;
};

function shuffle<T>(arr: T[], rng: () => number): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Build four shuffled MC options (1 correct + up to 3 wrong). Prefer stored plausible distractors, then other cards.
 */
export function buildMcChoices(
	card: CardLike,
	allCards: CardLike[],
	askDefinition: boolean,
	rng: () => number = Math.random
): string[] {
	const correctAnswer = askDefinition ? card.definition : card.term;
	const normalize = normalizeEquality;

	const stored = card.mc_distractors
		? askDefinition
			? card.mc_distractors.incorrect_definitions
			: card.mc_distractors.incorrect_terms
		: [];

	const wrong: string[] = [];
	const seenWrong = new Set<string>();
	const pushWrong = (s: string) => {
		const t = s.trim();
		if (!t) return;
		if (normalize(t) === normalize(correctAnswer)) return;
		const k = normalize(t);
		if (seenWrong.has(k)) return;
		seenWrong.add(k);
		wrong.push(t);
	};

	for (const s of shuffle(stored.slice(), rng)) {
		pushWrong(s);
		if (wrong.length >= 3) break;
	}

	const others = allCards.filter((c) => {
		if (card.id && c.id) return c.id !== card.id;
		return !(c.term === card.term && c.definition === card.definition);
	});
	const distractorPool = others
		.map((c) => (askDefinition ? c.definition : c.term))
		.filter((t, i, arr) => arr.indexOf(t) === i && normalize(t) !== normalize(correctAnswer));

	for (const s of shuffle(distractorPool, rng)) {
		pushWrong(s);
		if (wrong.length >= 3) break;
	}

	return shuffle([correctAnswer, ...wrong.slice(0, 3)], rng);
}
