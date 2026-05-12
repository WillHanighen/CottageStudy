import { json } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { decryptEnvelope, type Envelope } from '$lib/server/ai/keypair';
import {
	generateCardsFromGuide,
	MAX_GUIDE_CHARS,
	OpenRouterRequestError
} from '$lib/server/ai/openrouter';
import { SITE_URL, SITE_NAME } from '$lib/seo';
import type { RequestHandler } from './$types';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function checkRateLimit(userId: string, now: number): { ok: true } | { ok: false; retryAfter: number } {
	const existing = buckets.get(userId);
	if (!existing || existing.resetAt <= now) {
		buckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return { ok: true };
	}
	if (existing.count >= RATE_LIMIT_MAX) {
		return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
	}
	existing.count += 1;
	return { ok: true };
}

function isEnvelope(v: unknown): v is Envelope {
	if (!v || typeof v !== 'object') return false;
	const o = v as Record<string, unknown>;
	return (
		typeof o.encryptedKey === 'string' &&
		typeof o.iv === 'string' &&
		typeof o.ciphertext === 'string' &&
		o.encryptedKey.length > 0 &&
		o.iv.length > 0 &&
		o.ciphertext.length > 0
	);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { userId } = getAuth(locals);
	if (!userId) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const rl = checkRateLimit(userId, Date.now());
	if (!rl.ok) {
		return json(
			{ error: 'rate_limited', retryAfter: rl.retryAfter },
			{
				status: 429,
				headers: { 'retry-after': String(rl.retryAfter) }
			}
		);
	}

	let envelope: unknown;
	try {
		envelope = await request.json();
	} catch {
		return json({ error: 'invalid_body' }, { status: 400 });
	}
	if (!isEnvelope(envelope)) {
		return json({ error: 'invalid_envelope' }, { status: 400 });
	}

	let plaintext: string;
	try {
		plaintext = await decryptEnvelope(envelope);
	} catch {
		return json({ error: 'decrypt_failed' }, { status: 400 });
	}

	let payload: { apiKey?: unknown; guide?: unknown; model?: unknown };
	try {
		payload = JSON.parse(plaintext) as typeof payload;
	} catch {
		return json({ error: 'invalid_payload' }, { status: 400 });
	}

	const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
	const guide = typeof payload.guide === 'string' ? payload.guide : '';
	const model = typeof payload.model === 'string' ? payload.model.trim() : undefined;

	if (!apiKey) {
		return json({ error: 'missing_api_key' }, { status: 400 });
	}
	if (!guide.trim()) {
		return json({ error: 'missing_guide' }, { status: 400 });
	}
	if (guide.length > MAX_GUIDE_CHARS) {
		return json(
			{ error: 'guide_too_long', limit: MAX_GUIDE_CHARS },
			{ status: 413 }
		);
	}

	const encoder = new TextEncoder();
	const sse = (event: string, data: string) =>
		encoder.encode(`event: ${event}\ndata: ${data}\n\n`);

	/**
	 * Cloudflare (and similar proxies) time out origins that send no bytes for ~100s (524).
	 * OpenRouter can exceed that on large guides. Stream SSE with immediate headers + periodic
	 * comment pings so the tunnel stays alive until the model responds.
	 */
	const stream = new ReadableStream({
		async start(controller) {
			const pingMs = 15_000;
			controller.enqueue(encoder.encode(': connected\n\n'));
			const pingInterval = setInterval(() => {
				controller.enqueue(encoder.encode(': ping\n\n'));
			}, pingMs);

			try {
				const result = await generateCardsFromGuide({
					apiKey,
					guide,
					model,
					referer: SITE_URL,
					title: SITE_NAME
				});
				controller.enqueue(sse('result', JSON.stringify({ ok: true, result })));
			} catch (err) {
				if (err instanceof OpenRouterRequestError) {
					controller.enqueue(
						sse(
							'error',
							JSON.stringify({
								error: err.kind,
								message: err.message
							})
						)
					);
				} else {
					controller.enqueue(sse('error', JSON.stringify({ error: 'unknown' })));
				}
			} finally {
				clearInterval(pingInterval);
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream; charset=utf-8',
			'cache-control': 'no-store',
			// Helps reverse proxies forward chunks promptly (nginx etc.)
			'x-accel-buffering': 'no'
		}
	});
};
