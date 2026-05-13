import { normalizeDistractorList } from '$lib/mcDistractors';
import {
	MAX_CARDS_PER_SET,
	MAX_CARD_DEFINITION_CHARS,
	MAX_CARD_TERM_CHARS,
	MAX_SET_DESCRIPTION_CHARS,
	MAX_SET_TITLE_CHARS
} from '$lib/notecardLimits';

export const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
export const MAX_GUIDE_CHARS = 256_000;

export type GeneratedCard = {
	term: string;
	definition: string;
	incorrect_definitions?: string[];
	incorrect_terms?: string[];
};

export type GenerateResult =
	| { status: 'ok'; title: string; description: string; cards: GeneratedCard[] }
	| { status: 'needs_more_info'; reason: string };

const SYSTEM_PROMPT = [
	'You convert study guides into flashcards.',
	'',
	'First decide whether the provided guide contains enough discrete, factual content to make at least 4 useful flashcards.',
	'If it does NOT (too short, too vague, off-topic, asks you to invent the topic, or is just a prompt to generate something), respond with:',
	'{"status":"needs_more_info","reason":"<one short sentence describing what is missing>"}',
	'',
	'Otherwise respond with:',
	'{"status":"ok","title":"<short title or empty string>","description":"<1–3 plain sentences summarizing what this set covers and who it is for; empty string if unsure>","cards":[{"term":"...","definition":"...","incorrect_definitions":[...],"incorrect_terms":[...]}, ...]}',
	'',
	'Description: concise, helpful blurb for the set detail page—no markdown, no bullet lists, no "this set contains…" meta filler.',
	'',
	`Hard limit: at most ${MAX_CARDS_PER_SET} cards. The app will reject more.`,
	'',
	'CARD COUNT: Use your judgment. A dense 10-page guide might yield 80 cards. Sparse bullet points might yield 12. There is no target—cover the material proportionally without padding or rushing.',
	'',
	'EXCLUDE a card if:',
	'- The fact is incorrect or you suspect it is wrong',
	'- The "term" is an abstract category, not a specific person/place/event/concept (e.g., "Turning Point" or "Class System Basis")',
	'- It duplicates another card or nearly duplicates it with minor wording change',
	'- It defines something by what it is NOT or by correcting an error (no meta-commentary)',
	'- It requires context like "according to the practice exam" or "contrary to what was claimed"',
	'',
	'EXAMPLE CARD:',
	'{"term":"Blitzkrieg","definition":"German lightning war tactic in WWII using fast-moving tanks, aircraft, paratroopers, and infantry to overwhelm enemies.","incorrect_definitions":["A defensive trench warfare strategy used in WWI","A naval blockade using U-boats to cut off supply lines","The Nazi plan to exterminate the Jewish population"],"incorrect_terms":["Lightning Strike","Panzer Division","Luftwaffe Tactics"]}',
	'',
	`For EACH card, ALWAYS provide up to three "incorrect_definitions" AND up to three "incorrect_terms". Both arrays must be populated — never empty, never omitted.`,
	'WRONG ANSWER RULES:',
	'- incorrect_definitions: complete sentences that sound like real definitions in the SAME topic domain. These appear as wrong choices when the user is shown the term.',
	'- incorrect_terms: short labels or names that sound like real terms in the SAME topic domain. These appear as wrong choices when the user is shown the definition.',
	'- NEVER include meta-text like "distractor", "NOT", "wrong", "fake", "incorrect", or descriptions of what the field should contain',
	'- NEVER paraphrase or negate the correct answer (e.g., "NOT a noble who received land")',
	'- Each distractor must stand alone as a believable wrong option, not explain itself',
	'- No duplicates within or across cards',
	`Terms must be ${MAX_CARD_TERM_CHARS} characters or fewer. Definitions must be ${MAX_CARD_DEFINITION_CHARS} characters or fewer.`,
	'Each card tests one discrete, specific fact. No duplicate cards. No numbering in terms.',
	'Output ONLY JSON. No markdown, no commentary, no explanations.'
].join('\n');

const RESPONSE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		status: { type: 'string', enum: ['ok', 'needs_more_info'] },
		reason: { type: 'string' },
		title: { type: 'string' },
		description: { type: 'string', maxLength: MAX_SET_DESCRIPTION_CHARS },
		cards: {
			type: 'array',
			maxItems: MAX_CARDS_PER_SET,
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					term: { type: 'string' },
					definition: { type: 'string' },
					incorrect_definitions: {
						type: 'array',
						items: { type: 'string', maxLength: MAX_CARD_DEFINITION_CHARS },
						minItems: 0,
						maxItems: 3
					},
					incorrect_terms: {
						type: 'array',
						items: { type: 'string', maxLength: MAX_CARD_TERM_CHARS },
						minItems: 0,
						maxItems: 3
					}
				},
				required: ['term', 'definition', 'incorrect_definitions', 'incorrect_terms']
			}
		}
	},
	required: ['status']
} as const;

export type OpenRouterError = {
	kind: 'auth' | 'rate_limit' | 'upstream' | 'invalid_response';
	status: number;
	message: string;
};

export class OpenRouterRequestError extends Error {
	kind: OpenRouterError['kind'];
	status: number;
	constructor(err: OpenRouterError) {
		super(err.message);
		this.name = 'OpenRouterRequestError';
		this.kind = err.kind;
		this.status = err.status;
	}
}

function clampString(s: unknown, max: number): string {
	if (typeof s !== 'string') return '';
	return s.length > max ? s.slice(0, max) : s;
}

function normalizeResult(raw: unknown): GenerateResult {
	if (!raw || typeof raw !== 'object') {
		throw new OpenRouterRequestError({
			kind: 'invalid_response',
			status: 502,
			message: 'Model returned a non-object response.'
		});
	}
	const obj = raw as Record<string, unknown>;
	const status = obj.status;
	if (status === 'needs_more_info') {
		return {
			status: 'needs_more_info',
			reason: clampString(obj.reason, 600) || 'The study guide does not contain enough information to generate flashcards.'
		};
	}
	if (status === 'ok') {
		const cardsRaw = Array.isArray(obj.cards) ? (obj.cards as unknown[]) : [];
		const cards: GeneratedCard[] = cardsRaw
			.map((c) => {
				const o = (c ?? {}) as Record<string, unknown>;
				const term = clampString(o.term, MAX_CARD_TERM_CHARS).trim();
				const definition = clampString(o.definition, MAX_CARD_DEFINITION_CHARS).trim();
				const defList = Array.isArray(o.incorrect_definitions) ? o.incorrect_definitions : [];
				const termList = Array.isArray(o.incorrect_terms) ? o.incorrect_terms : [];
				const incorrect_definitions = normalizeDistractorList(defList, definition, 3, MAX_CARD_DEFINITION_CHARS);
				const incorrect_terms = normalizeDistractorList(termList, term, 3, MAX_CARD_TERM_CHARS);
				const out: GeneratedCard = { term, definition };
				if (incorrect_definitions.length > 0 || incorrect_terms.length > 0) {
					if (incorrect_definitions.length > 0) out.incorrect_definitions = incorrect_definitions;
					if (incorrect_terms.length > 0) out.incorrect_terms = incorrect_terms;
				}
				return out;
			})
			.filter((c) => c.term && c.definition)
			.slice(0, MAX_CARDS_PER_SET);

		if (cards.length === 0) {
			return {
				status: 'needs_more_info',
				reason: 'The model produced no usable cards. Add more concrete content and try again.'
			};
		}

		return {
			status: 'ok',
			title: clampString(obj.title, MAX_SET_TITLE_CHARS).trim(),
			description: clampString(obj.description, MAX_SET_DESCRIPTION_CHARS).trim(),
			cards
		};
	}
	throw new OpenRouterRequestError({
		kind: 'invalid_response',
		status: 502,
		message: 'Model returned an unrecognized status.'
	});
}

/**
 * Calls OpenRouter chat-completions with structured outputs. The provided
 * `apiKey` is used solely for the Authorization header on this single fetch
 * and is never stored or logged.
 */
export async function generateCardsFromGuide(input: {
	apiKey: string;
	guide: string;
	model?: string;
	signal?: AbortSignal;
	referer?: string;
	title?: string;
}): Promise<GenerateResult> {
	const model = (input.model && input.model.trim()) || DEFAULT_MODEL;

	const body = {
		model,
		temperature: 0.2,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{
				role: 'user',
				content: `Study guide:\n\n${input.guide}`
			}
		],
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'flashcard_response',
				strict: true,
				schema: RESPONSE_SCHEMA
			}
		}
	};

	const headers: Record<string, string> = {
		'content-type': 'application/json',
		authorization: `Bearer ${input.apiKey}`
	};
	if (input.referer) headers['http-referer'] = input.referer;
	if (input.title) headers['x-title'] = input.title;

	let res: Response;
	try {
		res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: input.signal
		});
	} catch {
		throw new OpenRouterRequestError({
			kind: 'upstream',
			status: 502,
			message: 'Could not reach OpenRouter.'
		});
	}

	if (!res.ok) {
		let detail = '';
		try {
			const j = (await res.json()) as { error?: { message?: string } };
			detail = j?.error?.message ?? '';
		} catch {
			// ignore
		}
		const kind: OpenRouterError['kind'] =
			res.status === 401 || res.status === 403
				? 'auth'
				: res.status === 429
					? 'rate_limit'
					: 'upstream';
		throw new OpenRouterRequestError({
			kind,
			status: res.status,
			message: detail || `OpenRouter responded with ${res.status}.`
		});
	}

	let payload: { choices?: Array<{ message?: { content?: string } }> };
	try {
		payload = (await res.json()) as typeof payload;
	} catch {
		throw new OpenRouterRequestError({
			kind: 'invalid_response',
			status: 502,
			message: 'OpenRouter returned non-JSON.'
		});
	}

	const content = payload?.choices?.[0]?.message?.content;
	if (typeof content !== 'string' || !content.trim()) {
		throw new OpenRouterRequestError({
			kind: 'invalid_response',
			status: 502,
			message: 'Model returned an empty response.'
		});
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new OpenRouterRequestError({
			kind: 'invalid_response',
			status: 502,
			message: 'Model output was not valid JSON.'
		});
	}

	return normalizeResult(parsed);
}
