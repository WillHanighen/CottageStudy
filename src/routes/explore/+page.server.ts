import { db, type StudySet } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type PublicSet = StudySet & { card_count: number };

const RESULT_LIMIT = 60;

export const load: PageServerLoad = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();

	if (!q) {
		const sets = db
			.query<PublicSet, []>(
				`SELECT s.*, COUNT(c.id) AS card_count
				 FROM sets s
				 LEFT JOIN cards c ON c.set_id = s.id
				 WHERE s.is_public = 1
				 GROUP BY s.id
				 HAVING card_count > 0
				 ORDER BY s.updated_at DESC
				 LIMIT ?`
			)
			.all(RESULT_LIMIT);
		return { sets, q: '' };
	}

	// SQLite LIKE: escape backslash + % + _ so user input is treated literally.
	const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
	const like = `%${escaped}%`;

	const sets = db
		.query<PublicSet, [string, string, number]>(
			`SELECT s.*, COUNT(c.id) AS card_count
			 FROM sets s
			 LEFT JOIN cards c ON c.set_id = s.id
			 WHERE s.is_public = 1
			   AND (s.title LIKE ? ESCAPE '\\' OR s.description LIKE ? ESCAPE '\\')
			 GROUP BY s.id
			 HAVING card_count > 0
			 ORDER BY s.updated_at DESC
			 LIMIT ?`
		)
		.all(like, like, RESULT_LIMIT);

	return { sets, q };
};
