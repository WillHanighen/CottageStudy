import { TURNSTILE_SECRET_KEY } from '$env/static/private';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = {
	success: boolean;
	error?: string;
};

export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string): Promise<TurnstileResult> {
	if (!TURNSTILE_SECRET_KEY) {
		// Fail-open in dev when not configured; surface a clear error in production.
		if (process.env.NODE_ENV === 'production') {
			return { success: false, error: 'Turnstile not configured on the server.' };
		}
		return { success: true };
	}

	if (!token) {
		return { success: false, error: 'Missing Turnstile token.' };
	}

	const body = new URLSearchParams();
	body.set('secret', TURNSTILE_SECRET_KEY);
	body.set('response', token);
	if (remoteIp) body.set('remoteip', remoteIp);

	try {
		const res = await fetch(VERIFY_URL, { method: 'POST', body });
		const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
		if (data.success) return { success: true };
		return {
			success: false,
			error: data['error-codes']?.join(', ') ?? 'Verification failed.'
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Network error verifying token.'
		};
	}
}
