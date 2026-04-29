import { error, fail, redirect } from '@sveltejs/kit';
import { NotecardLimitError } from '$lib/server/notecardValidation';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const { userId } = getAuth(locals);
	if (!userId) throw redirect(303, `/sign-in?redirect=/sets/${params.id}/edit`);

	const set = queries.getSetWithCards(params.id);
	if (!set) throw error(404, 'Set not found');
	if (set.user_id !== userId) throw error(403, 'Not your set.');

	return { set };
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		const { userId } = getAuth(locals);
		if (!userId) throw redirect(303, '/sign-in');

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const isPublic = data.get('is_public') === 'on';
		const cardsRaw = String(data.get('cards') ?? '[]');

		if (!title) return fail(400, { error: 'Title is required.' });

		let cards: Array<{ term: string; definition: string }> = [];
		try {
			const parsed = JSON.parse(cardsRaw);
			if (Array.isArray(parsed)) {
				cards = parsed
					.map((c) => ({
						term: String(c?.term ?? ''),
						definition: String(c?.definition ?? '')
					}))
					.filter((c) => c.term.trim() || c.definition.trim());
			}
		} catch {
			return fail(400, { error: 'Could not parse cards.' });
		}

		try {
			const updated = queries.updateSet({
				setId: params.id,
				userId,
				title,
				description,
				isPublic
			});
			if (!updated) return fail(404, { error: 'Set not found.' });
			queries.replaceCards(params.id, cards);
		} catch (err) {
			if (err instanceof NotecardLimitError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}

		throw redirect(303, `/sets/${params.id}`);
	}
};
