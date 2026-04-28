import { json } from '@sveltejs/kit';
import { verifyTurnstile } from '$lib/server/turnstile';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let token: string | null = null;
	try {
		const body = (await request.json()) as { token?: string };
		token = body.token ?? null;
	} catch {
		return json({ success: false, error: 'Invalid request body' }, { status: 400 });
	}

	const ip = getClientAddress();
	const result = await verifyTurnstile(token, ip);

	if (!result.success) {
		return json({ success: false, error: result.error }, { status: 400 });
	}
	return json({ success: true });
};
