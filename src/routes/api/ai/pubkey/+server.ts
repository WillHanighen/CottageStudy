import { json } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { getPublicJwk } from '$lib/server/ai/keypair';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const { userId } = getAuth(locals);
	if (!userId) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const jwk = await getPublicJwk();
	return json(
		{ jwk },
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
