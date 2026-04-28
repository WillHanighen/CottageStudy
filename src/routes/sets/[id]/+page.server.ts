import { error, fail, redirect } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const set = queries.getSetWithCards(params.id);
	if (!set) throw error(404, 'Study set not found');

	const { userId } = getAuth(locals);
	const isOwner = userId === set.user_id;

	if (!set.is_public && !isOwner) {
		if (!userId) throw redirect(303, `/sign-in?redirect=/sets/${params.id}`);
		throw error(403, 'This set is private.');
	}

	return { set, isOwner };
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		const { userId } = getAuth(locals);
		if (!userId) return fail(401, { error: 'Sign in required.' });
		const ok = queries.deleteSet(params.id, userId);
		if (!ok) return fail(404, { error: 'Set not found or not yours.' });
		throw redirect(303, '/dashboard');
	}
};
