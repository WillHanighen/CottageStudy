import { fail, redirect } from '@sveltejs/kit';
import { NotecardLimitError } from '$lib/server/notecardValidation';
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

		let cards: Array<{
			term: string;
			definition: string;
			incorrect_definitions?: string[];
			incorrect_terms?: string[];
		}> = [];
		try {
			const parsed = JSON.parse(cardsRaw);
			if (Array.isArray(parsed)) {
				cards = parsed
					.map((c) => {
						const obj = (c ?? {}) as Record<string, unknown>;
						const incorrect_definitions = Array.isArray(obj.incorrect_definitions)
							? obj.incorrect_definitions.map((x) => String(x ?? ''))
							: undefined;
						const incorrect_terms = Array.isArray(obj.incorrect_terms)
							? obj.incorrect_terms.map((x) => String(x ?? ''))
							: undefined;
						return {
							term: String(obj.term ?? ''),
							definition: String(obj.definition ?? ''),
							...(incorrect_definitions ? { incorrect_definitions } : {}),
							...(incorrect_terms ? { incorrect_terms } : {})
						};
					})
					.filter((c) => c.term.trim() || c.definition.trim());
			}
		} catch {
			return fail(400, { error: 'Could not read flashcard data.', title, description });
		}

		let setId: string;
		try {
			setId = queries.createSet({ userId, title, description, isPublic });
			if (cards.length > 0) {
				queries.replaceCards(setId, cards);
			}
		} catch (err) {
			if (err instanceof NotecardLimitError) {
				return fail(400, { error: err.message, title, description });
			}
			throw err;
		}

		throw redirect(303, `/sets/${setId}`);
	}
};
