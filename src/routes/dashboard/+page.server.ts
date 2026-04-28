import { redirect } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { userId } = getAuth(locals);
	if (!userId) throw redirect(303, '/sign-in?redirect=/dashboard');

	const sets = queries.listSetsByUser(userId);
	return { sets };
};
