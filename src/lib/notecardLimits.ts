/** Validation limits for flashcard sets (server-enforced). */
export const MAX_SET_TITLE_CHARS = 256;
export const MAX_SET_DESCRIPTION_CHARS = 8192;
export const MAX_CARD_TERM_CHARS = 128;
export const MAX_CARD_DEFINITION_CHARS = 4096;
/** Hard cap on how many notecards a set may contain (create, edit, import, AI output). */
export const MAX_CARDS_PER_SET = 150;
/** Max plausible wrong answers per side (MC uses up to 3 distractors + 1 correct). */
export const MAX_MC_DISTRACTORS_PER_SIDE = 3;
