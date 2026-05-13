import { error } from '@sveltejs/kit';
import { queries } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
	const set = queries.getSetWithCards(params.id);
	if (!set) throw error(404, 'Study set not found');

	const { userId } = getAuth(locals);
	const isOwner = userId === set.user_id;
	if (!set.is_public && !isOwner) {
		throw error(403, 'This set is private.');
	}

	const cards = set.cards.map((c) => {
		const base = { term: c.term, definition: c.definition };
		const m = c.mc_distractors;
		if (!m || (m.incorrect_definitions.length === 0 && m.incorrect_terms.length === 0)) {
			return base;
		}
		return {
			...base,
			...(m.incorrect_definitions.length > 0 ? { incorrect_definitions: m.incorrect_definitions } : {}),
			...(m.incorrect_terms.length > 0 ? { incorrect_terms: m.incorrect_terms } : {})
		};
	});

	const payload = {
		format: 'cottage-study/v2',
		exported_at: new Date().toISOString(),
		title: set.title,
		description: set.description,
		is_public: !!set.is_public,
		cards
	};

	const slug =
		set.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'set';
	const filename = `${slug}.cottage-study.json`;

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${filename}"`,
			'cache-control': 'no-store'
		}
	});
};
