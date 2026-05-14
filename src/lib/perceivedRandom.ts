/**
 * Perceived randomness: UUIDv7 session seed → deterministic PRNG, streak caps,
 * and MC layouts that avoid repeating the correct-answer slot.
 */

/** RFC 9562 UUID v7 (timestamp + random bits). Uses Web Crypto where available. */
export function generateUuidv7(nowMs: number = Date.now()): string {
	const u8 = new Uint8Array(16);
	let ts = BigInt(nowMs);
	for (let i = 5; i >= 0; i--) {
		u8[i] = Number(ts & 0xffn);
		ts >>= 8n;
	}
	globalThis.crypto.getRandomValues(u8.subarray(6, 16));
	u8[6] = (u8[6]! & 0x0f) | 0x70;
	u8[8] = (u8[8]! & 0x3f) | 0x80;
	const hex = [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
		16,
		20
	)}-${hex.slice(20)}`;
}

/** 32-bit FNV-1a hash for stable numeric seed from a string. */
function fnv1a(str: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0 || 1;
}

/** Mulberry32 PRNG: returns floats in [0, 1). */
export function createSeededRng(seedString: string): () => number {
	let a = fnv1a(seedString) ^ fnv1a(seedString.split('').reverse().join(''));
	if (a === 0) a = 88675123;
	return function mulberry32() {
		let t = (a += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

/** Fisher–Yates in place. */
export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = arr[i]!;
		arr[i] = arr[j]!;
		arr[j] = tmp;
	}
}

const MAX_REPEAT_STREAK = 3;

/**
 * Weighted random pick among `pool`; if repeating `last` would exceed maxRepeat in a row, exclude `last`.
 * When only one enabled type remains, repeats are allowed so the learner is not blocked.
 */
export function pickWeightedExcludingMaxStreak<T extends string>(
	pool: readonly T[],
	weights: Record<T, number>,
	last: T | null,
	runLength: number,
	rng: () => number,
	maxRepeat = MAX_REPEAT_STREAK
): T {
	if (pool.length === 0) {
		throw new Error('pickWeightedExcludingMaxStreak: empty pool');
	}

	const eligible =
		pool.length <= 1
			? [...pool]
			: pool.filter((k) => !(last !== null && k === last && runLength >= maxRepeat));

	let use = eligible.length ? eligible : [...pool];
	let total = 0;
	for (const k of use) total += weights[k] ?? 0;
	if (total <= 0) return use[Math.floor(rng() * use.length)]!;

	let r = rng() * total;
	for (const k of use) {
		r -= weights[k] ?? 0;
		if (r < 0) return k;
	}
	return use[use.length - 1]!;
}

/** Update `{ kind, len }` after showing a round of kind `chosen`. */
export function advanceKindRunState<T>(
	state: { kind: T | null; len: number },
	chosen: T
): { kind: T; len: number } {
	if (state.kind === chosen) return { kind: chosen, len: state.len + 1 };
	return { kind: chosen, len: 1 };
}

/**
 * Shuffle MC options until the normalized correct answer does not land on `avoidSlot` (previous MC slot, 0..3).
 * If impossible in rare cases, swaps the correct answer to a neighbor slot that differs from `avoidSlot`.
 */
export function repositionMcChoicesAvoidRepeatedSlot(
	choicesInput: readonly string[],
	correctAnswer: string,
	normalizeEquality: (s: string) => string,
	avoidCorrectSlot: number | null,
	rng: () => number
): string[] {
	const choices = [...choicesInput];
	const targetNorm = normalizeEquality(correctAnswer);

	const idxOfCorrect = () =>
		choices.findIndex((c) => normalizeEquality(String(c)) === targetNorm);

	if (avoidCorrectSlot === null || choices.length <= 1) {
		shuffleInPlace(choices, rng);
		return choices;
	}

	const validLayout = (): boolean => {
		const ix = idxOfCorrect();
		return ix >= 0 && ix !== avoidCorrectSlot;
	};

	for (let attempt = 0; attempt < 56; attempt++) {
		shuffleInPlace(choices, rng);
		if (validLayout()) return choices;
	}

	let ix = idxOfCorrect();
	if (ix < 0) return choices;

	if (ix === avoidCorrectSlot) {
		const swapWith = ix === choices.length - 1 ? ix - 1 : ix + 1;
		[choices[ix], choices[swapWith]] = [choices[swapWith]!, choices[ix]!];
		if (idxOfCorrect() === avoidCorrectSlot) {
			[choices[0], choices[1]] = [choices[1]!, choices[0]!];
		}
	}
	return choices;
}
