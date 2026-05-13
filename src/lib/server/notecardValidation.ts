import type { CardRow } from '$lib/cardRow';
import {
	MAX_CARDS_PER_SET,
	MAX_CARD_DEFINITION_CHARS,
	MAX_CARD_TERM_CHARS,
	MAX_MC_DISTRACTORS_PER_SIDE,
	MAX_SET_DESCRIPTION_CHARS,
	MAX_SET_TITLE_CHARS
} from '$lib/notecardLimits';

/** Thrown when persisted set/card strings exceed documented limits — never bypassed by callers. */
export class NotecardLimitError extends Error {
	readonly name = 'NotecardLimitError';
	constructor(message: string) {
		super(message);
	}
}

export function checkSetLimits(title: string, description: string): string | null {
	if (title.length > MAX_SET_TITLE_CHARS) {
		return `Title is too long (max ${MAX_SET_TITLE_CHARS} characters).`;
	}
	if (description.length > MAX_SET_DESCRIPTION_CHARS) {
		return `Description is too long (max ${MAX_SET_DESCRIPTION_CHARS} characters).`;
	}
	return null;
}

/**
 * Validates card sides against stored length (same trimming as `replaceCards` in `db.ts`).
 * `cardIndex` increments only across rows that persist (same order as inserts).
 */
export function checkCardsLimits(cards: CardRow[]): string | null {
	const persistedCount = cards.reduce((acc, c) => {
		const term = c.term.trim();
		const def = c.definition.trim();
		return !term && !def ? acc : acc + 1;
	}, 0);
	if (persistedCount > MAX_CARDS_PER_SET) {
		return `A set can have at most ${MAX_CARDS_PER_SET} notecards (this would save ${persistedCount}). Split into multiple sets or remove some cards.`;
	}

	let cardIndex = 0;
	for (const c of cards) {
		const term = c.term.trim();
		const def = c.definition.trim();
		if (!term && !def) continue;
		cardIndex += 1;
		if (term.length > MAX_CARD_TERM_CHARS) {
			return `Card ${cardIndex}: term is too long (max ${MAX_CARD_TERM_CHARS} characters).`;
		}
		if (def.length > MAX_CARD_DEFINITION_CHARS) {
			return `Card ${cardIndex}: definition is too long (max ${MAX_CARD_DEFINITION_CHARS} characters).`;
		}
		const defs = Array.isArray(c.incorrect_definitions) ? c.incorrect_definitions : [];
		const terms = Array.isArray(c.incorrect_terms) ? c.incorrect_terms : [];
		if (defs.length > MAX_MC_DISTRACTORS_PER_SIDE) {
			return `Card ${cardIndex}: at most ${MAX_MC_DISTRACTORS_PER_SIDE} incorrect definitions.`;
		}
		if (terms.length > MAX_MC_DISTRACTORS_PER_SIDE) {
			return `Card ${cardIndex}: at most ${MAX_MC_DISTRACTORS_PER_SIDE} incorrect terms.`;
		}
		for (let i = 0; i < defs.length; i++) {
			const s = typeof defs[i] === 'string' ? defs[i].trim() : '';
			if (s.length > MAX_CARD_DEFINITION_CHARS) {
				return `Card ${cardIndex}: incorrect definition ${i + 1} is too long (max ${MAX_CARD_DEFINITION_CHARS} characters).`;
			}
		}
		for (let i = 0; i < terms.length; i++) {
			const s = typeof terms[i] === 'string' ? terms[i].trim() : '';
			if (s.length > MAX_CARD_TERM_CHARS) {
				return `Card ${cardIndex}: incorrect term ${i + 1} is too long (max ${MAX_CARD_TERM_CHARS} characters).`;
			}
		}
	}
	return null;
}

export function assertSetLimits(title: string, description: string): void {
	const err = checkSetLimits(title, description);
	if (err) throw new NotecardLimitError(err);
}

export function assertCardsLimits(cards: CardRow[]): void {
	const err = checkCardsLimits(cards);
	if (err) throw new NotecardLimitError(err);
}
