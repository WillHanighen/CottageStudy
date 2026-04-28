import { error, redirect } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const set = queries.getSetWithCards(params.id);
	if (!set) throw error(404);
	const { userId } = getAuth(locals);
	if (!set.is_public && set.user_id !== userId) {
		if (!userId) throw redirect(303, `/sign-in?redirect=/sets/${params.id}/match`);
		throw error(403, 'Private set.');
	}
	if (set.cards.length < 3) throw redirect(303, `/sets/${set.id}`);
	return { set };
};
