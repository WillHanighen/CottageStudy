import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { assertCardsLimits, assertSetLimits } from '$lib/server/notecardValidation';

const DB_PATH = process.env.DB_PATH ?? './data/study.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

let initialized = false;

export function initDb(): void {
	if (initialized) return;
	initialized = true;

	db.exec(`
		CREATE TABLE IF NOT EXISTS sets (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			is_public INTEGER NOT NULL DEFAULT 0,
			public_locked INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_sets_user ON sets(user_id, updated_at DESC);

		CREATE TABLE IF NOT EXISTS cards (
			id TEXT PRIMARY KEY,
			set_id TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
			term TEXT NOT NULL,
			definition TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_id, position);

		CREATE TABLE IF NOT EXISTS set_reports (
			set_id TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
			reporter_user_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (set_id, reporter_user_id)
		);
		CREATE INDEX IF NOT EXISTS idx_set_reports_set ON set_reports(set_id);
	`);

	const hasPublicLocked = db
		.query<{ n: number }, []>(
			`SELECT COUNT(*) AS n FROM pragma_table_info('sets') WHERE name = 'public_locked'`
		)
		.get()?.n;
	if (!hasPublicLocked) {
		db.exec(`ALTER TABLE sets ADD COLUMN public_locked INTEGER NOT NULL DEFAULT 0`);
	}
}

export type StudySet = {
	id: string;
	user_id: string;
	title: string;
	description: string;
	is_public: number;
	public_locked: number;
	created_at: number;
	updated_at: number;
};

export type Card = {
	id: string;
	set_id: string;
	term: string;
	definition: string;
	position: number;
	created_at: number;
};

export type StudySetWithCount = StudySet & { card_count: number };
export type StudySetWithCards = StudySet & { cards: Card[] };

const now = () => Date.now();
const id = () => crypto.randomUUID();

export const queries = {
	listPublicSetsForSitemap(limit = 5000): Array<{ id: string; updated_at: number }> {
		return db
			.query<{ id: string; updated_at: number }, [number]>(
				`SELECT s.id, s.updated_at
				 FROM sets s
				 INNER JOIN cards c ON c.set_id = s.id
				 WHERE s.is_public = 1
				 GROUP BY s.id
				 ORDER BY s.updated_at DESC
				 LIMIT ?`
			)
			.all(limit);
	},

	listSetsByUser(userId: string): StudySetWithCount[] {
		return db
			.query<StudySetWithCount, [string]>(
				`SELECT s.*, COUNT(c.id) AS card_count
				 FROM sets s
				 LEFT JOIN cards c ON c.set_id = s.id
				 WHERE s.user_id = ?
				 GROUP BY s.id
				 ORDER BY s.updated_at DESC`
			)
			.all(userId);
	},

	getSet(setId: string): StudySet | null {
		return db.query<StudySet, [string]>(`SELECT * FROM sets WHERE id = ?`).get(setId);
	},

	getSetWithCards(setId: string): StudySetWithCards | null {
		const set = queries.getSet(setId);
		if (!set) return null;
		const cards = db
			.query<Card, [string]>(
				`SELECT * FROM cards WHERE set_id = ? ORDER BY position ASC, created_at ASC`
			)
			.all(setId);
		return { ...set, cards };
	},

	createSet(input: { userId: string; title: string; description?: string; isPublic?: boolean }): string {
		assertSetLimits(input.title, input.description ?? '');
		const setId = id();
		const t = now();
		db.run(
			`INSERT INTO sets (id, user_id, title, description, is_public, public_locked, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
			[setId, input.userId, input.title, input.description ?? '', input.isPublic ? 1 : 0, t, t]
		);
		return setId;
	},

	updateSet(input: {
		setId: string;
		userId: string;
		title: string;
		description: string;
		isPublic: boolean;
	}): boolean {
		assertSetLimits(input.title, input.description);
		const row = db
			.query<{ public_locked: number }, [string, string]>(
				`SELECT public_locked FROM sets WHERE id = ? AND user_id = ?`
			)
			.get(input.setId, input.userId);
		if (!row) return false;
		const mayPublish = row.public_locked !== 1;
		const isPublic = Boolean(input.isPublic && mayPublish);
		const result = db.run(
			`UPDATE sets
			 SET title = ?, description = ?, is_public = ?, updated_at = ?
			 WHERE id = ? AND user_id = ?`,
			[input.title, input.description, isPublic ? 1 : 0, now(), input.setId, input.userId]
		);
		return result.changes > 0;
	},

	hasUserReportedSet(setId: string, reporterUserId: string): boolean {
		const row = db
			.query<{ n: number }, [string, string]>(
				`SELECT COUNT(*) AS n FROM set_reports WHERE set_id = ? AND reporter_user_id = ?`
			)
			.get(setId, reporterUserId);
		return (row?.n ?? 0) > 0;
	},

	/** Adds a report; at 3 distinct reporters the set is made private and locked from re-publication. */
	addSetReport(setId: string, reporterUserId: string): {
		ok: boolean;
		added: boolean;
		demoted: boolean;
		error?: 'not_found' | 'owner' | 'not_public';
	} {
		const set = queries.getSet(setId);
		if (!set) return { ok: false, added: false, demoted: false, error: 'not_found' };
		if (set.user_id === reporterUserId) return { ok: false, added: false, demoted: false, error: 'owner' };
		if (set.is_public !== 1) return { ok: false, added: false, demoted: false, error: 'not_public' };

		let added = false;
		let demoted = false;

		db.transaction(() => {
			const ins = db.run(
				`INSERT OR IGNORE INTO set_reports (set_id, reporter_user_id, created_at) VALUES (?, ?, ?)`,
				[setId, reporterUserId, now()]
			);
			added = ins.changes > 0;

			const countRow = db
				.query<{ n: number }, [string]>(`SELECT COUNT(*) AS n FROM set_reports WHERE set_id = ?`)
				.get(setId);
			const n = countRow?.n ?? 0;
			if (n >= 3) {
				const r = db.run(
					`UPDATE sets SET is_public = 0, public_locked = 1, updated_at = ? WHERE id = ? AND public_locked != 1`,
					[now(), setId]
				);
				demoted = r.changes > 0;
			}
		})();

		return { ok: true, added, demoted };
	},

	touchSet(setId: string): void {
		db.run(`UPDATE sets SET updated_at = ? WHERE id = ?`, [now(), setId]);
	},

	deleteSet(setId: string, userId: string): boolean {
		const result = db.run(`DELETE FROM sets WHERE id = ? AND user_id = ?`, [setId, userId]);
		return result.changes > 0;
	},

	replaceCards(setId: string, cards: Array<{ term: string; definition: string }>): void {
		assertCardsLimits(cards);
		const tx = db.transaction((items: Array<{ term: string; definition: string }>) => {
			db.run(`DELETE FROM cards WHERE set_id = ?`, [setId]);
			const insert = db.prepare(
				`INSERT INTO cards (id, set_id, term, definition, position, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`
			);
			items.forEach((c, i) => {
				const term = c.term.trim();
				const def = c.definition.trim();
				if (!term && !def) return;
				insert.run(id(), setId, term, def, i, now());
			});
			queries.touchSet(setId);
		});
		tx(cards);
	}
};
