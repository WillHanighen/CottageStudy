import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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
	`);
}

export type StudySet = {
	id: string;
	user_id: string;
	title: string;
	description: string;
	is_public: number;
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
		const setId = id();
		const t = now();
		db.run(
			`INSERT INTO sets (id, user_id, title, description, is_public, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
		const result = db.run(
			`UPDATE sets
			 SET title = ?, description = ?, is_public = ?, updated_at = ?
			 WHERE id = ? AND user_id = ?`,
			[
				input.title,
				input.description,
				input.isPublic ? 1 : 0,
				now(),
				input.setId,
				input.userId
			]
		);
		return result.changes > 0;
	},

	touchSet(setId: string): void {
		db.run(`UPDATE sets SET updated_at = ? WHERE id = ?`, [now(), setId]);
	},

	deleteSet(setId: string, userId: string): boolean {
		const result = db.run(`DELETE FROM sets WHERE id = ? AND user_id = ?`, [setId, userId]);
		return result.changes > 0;
	},

	replaceCards(setId: string, cards: Array<{ term: string; definition: string }>): void {
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
