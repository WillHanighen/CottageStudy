import {
	MAX_CARD_DEFINITION_CHARS,
	MAX_CARD_TERM_CHARS,
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
export function checkCardsLimits(cards: Array<{ term: string; definition: string }>): string | null {
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
	}
	return null;
}

export function assertSetLimits(title: string, description: string): void {
	const err = checkSetLimits(title, description);
	if (err) throw new NotecardLimitError(err);
}

export function assertCardsLimits(cards: Array<{ term: string; definition: string }>): void {
	const err = checkCardsLimits(cards);
	if (err) throw new NotecardLimitError(err);
}
