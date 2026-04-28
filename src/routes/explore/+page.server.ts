import { db, type StudySet } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type PublicSet = StudySet & { card_count: number };

export const load: PageServerLoad = () => {
	const sets = db
		.query<PublicSet, []>(
			`SELECT s.*, COUNT(c.id) AS card_count
			 FROM sets s
			 LEFT JOIN cards c ON c.set_id = s.id
			 WHERE s.is_public = 1
			 GROUP BY s.id
			 HAVING card_count > 0
			 ORDER BY s.updated_at DESC
			 LIMIT 60`
		)
		.all();
	return { sets };
};
