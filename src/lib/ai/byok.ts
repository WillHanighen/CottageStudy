/**
 * Tiny localStorage wrapper for the user's OpenRouter API key and preferred
 * model. The key never leaves the browser except inside the encrypted
 * envelope sent to /api/ai/generate-cards.
 */

const KEY_STORAGE = 'cottage.ai.openrouterKey';
const MODEL_STORAGE = 'cottage.ai.model';

export const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
export const MAX_GUIDE_CHARS = 96_000;

function hasStorage(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return typeof window.localStorage !== 'undefined';
	} catch {
		return false;
	}
}

export function loadApiKey(): string {
	if (!hasStorage()) return '';
	try {
		return window.localStorage.getItem(KEY_STORAGE) ?? '';
	} catch {
		return '';
	}
}

export function saveApiKey(key: string): void {
	if (!hasStorage()) return;
	try {
		const trimmed = key.trim();
		if (trimmed) {
			window.localStorage.setItem(KEY_STORAGE, trimmed);
		} else {
			window.localStorage.removeItem(KEY_STORAGE);
		}
	} catch {
		// ignore quota / privacy errors
	}
}

export function clearApiKey(): void {
	if (!hasStorage()) return;
	try {
		window.localStorage.removeItem(KEY_STORAGE);
	} catch {
		// ignore
	}
}

export function loadModel(): string {
	if (!hasStorage()) return DEFAULT_MODEL;
	try {
		const v = window.localStorage.getItem(MODEL_STORAGE);
		return v && v.trim() ? v.trim() : DEFAULT_MODEL;
	} catch {
		return DEFAULT_MODEL;
	}
}

export function saveModel(model: string): void {
	if (!hasStorage()) return;
	try {
		const trimmed = model.trim();
		if (trimmed && trimmed !== DEFAULT_MODEL) {
			window.localStorage.setItem(MODEL_STORAGE, trimmed);
		} else {
			window.localStorage.removeItem(MODEL_STORAGE);
		}
	} catch {
		// ignore
	}
}
