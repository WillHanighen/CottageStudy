import { error, fail, redirect } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const set = queries.getSetWithCards(params.id);
	if (!set) throw error(404, 'Study set not found');

	const { userId } = getAuth(locals);
	const isOwner = userId === set.user_id;

	const hasReported = Boolean(
		userId && !isOwner && queries.hasUserReportedSet(params.id, userId)
	);

	if (!set.is_public && !isOwner) {
		if (!userId) throw redirect(303, `/sign-in?redirect=/sets/${params.id}`);
		throw error(403, 'This set is private.');
	}

	return { set, isOwner, isAuthenticated: Boolean(userId), hasReported };
};

export const actions: Actions = {
	report: async ({ params, locals }) => {
		const { userId } = getAuth(locals);
		if (!userId) throw redirect(303, `/sign-in?redirect=/sets/${params.id}`);

		const result = queries.addSetReport(params.id, userId);
		if (!result.ok) {
			if (result.error === 'owner') return fail(400, { reportError: 'You cannot report your own set.' });
			if (result.error === 'not_public') return fail(400, { reportError: 'This set is not public.' });
			throw error(404, 'Study set not found');
		}

		if (result.demoted) throw redirect(303, '/explore?demoted=1');
		throw redirect(303, `/sets/${params.id}?reported=1`);
	},

	delete: async ({ params, locals }) => {
		const { userId } = getAuth(locals);
		if (!userId) return fail(401, { error: 'Sign in required.' });
		const ok = queries.deleteSet(params.id, userId);
		if (!ok) return fail(404, { error: 'Set not found or not yours.' });
		throw redirect(303, '/dashboard');
	}
};
