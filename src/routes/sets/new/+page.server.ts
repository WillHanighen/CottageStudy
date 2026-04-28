import { fail, redirect } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { userId } = getAuth(locals);
	if (!userId) throw redirect(303, '/sign-in?redirect=/sets/new');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { userId } = getAuth(locals);
		if (!userId) throw redirect(303, '/sign-in');

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const isPublic = data.get('is_public') === 'on';
		const cardsRaw = String(data.get('cards') ?? '[]');

		if (!title) {
			return fail(400, { error: 'Title is required.', title, description });
		}
		if (title.length > 200) {
			return fail(400, { error: 'Title is too long (max 200 characters).', title, description });
		}

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
			return fail(400, { error: 'Could not read flashcard data.', title, description });
		}

		const setId = queries.createSet({ userId, title, description, isPublic });
		if (cards.length > 0) {
			queries.replaceCards(setId, cards);
		}

		throw redirect(303, `/sets/${setId}`);
	}
};
