import {
	MAX_CARD_DEFINITION_CHARS,
	MAX_CARD_TERM_CHARS,
	MAX_SET_TITLE_CHARS
} from '$lib/notecardLimits';

export const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
export const MAX_GUIDE_CHARS = 96_000;

export type GenerateResult =
	| { status: 'ok'; title: string; cards: Array<{ term: string; definition: string }> }
	| { status: 'needs_more_info'; reason: string };

const SYSTEM_PROMPT = [
	'You convert study guides into flashcards.',
	'',
	'First decide whether the provided guide contains enough discrete, factual content to make at least 4 useful flashcards.',
	'If it does NOT (too short, too vague, off-topic, asks you to invent the topic, or is just a prompt to generate something), respond with:',
	'{"status":"needs_more_info","reason":"<one short sentence describing what is missing>"}',
	'',
	'Otherwise respond with:',
	'{"status":"ok","title":"<short title or empty string>","cards":[{"term":"...","definition":"..."}, ...]}',
	'',
	`Aim for 8 to 40 cards. Terms must be ${MAX_CARD_TERM_CHARS} characters or fewer. Definitions must be ${MAX_CARD_DEFINITION_CHARS} characters or fewer.`,
	'Each card should test a single discrete fact. Do not duplicate cards. Do not include numbering in the term.',
	'Output ONLY JSON conforming to the schema. No markdown, no commentary.'
].join('\n');

const RESPONSE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		status: { type: 'string', enum: ['ok', 'needs_more_info'] },
		reason: { type: 'string' },
		title: { type: 'string' },
		cards: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					term: { type: 'string' },
					definition: { type: 'string' }
				},
				required: ['term', 'definition']
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
		const cards = cardsRaw
			.map((c) => {
				const o = (c ?? {}) as Record<string, unknown>;
				return {
					term: clampString(o.term, MAX_CARD_TERM_CHARS).trim(),
					definition: clampString(o.definition, MAX_CARD_DEFINITION_CHARS).trim()
				};
			})
			.filter((c) => c.term && c.definition)
			.slice(0, 80);

		if (cards.length === 0) {
			return {
				status: 'needs_more_info',
				reason: 'The model produced no usable cards. Add more concrete content and try again.'
			};
		}

		return {
			status: 'ok',
			title: clampString(obj.title, MAX_SET_TITLE_CHARS).trim(),
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
