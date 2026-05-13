/** Shared card shape for editors, JSON import/export (cottage-study v2), and DB. */
export type CardRow = {
	term: string;
	definition: string;
	/** Plausible wrong answers when the displayed prompt is the term (MC asks for a definition). */
	incorrect_definitions?: string[];
	/** Plausible wrong answers when the displayed prompt is the definition (MC asks for a term). */
	incorrect_terms?: string[];
};
