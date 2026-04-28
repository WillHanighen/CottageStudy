# Development

Practical guide to working on CottageStudy locally — setup, scripts, env vars,
common tasks, and the rough edges that have caught me before.

## Prerequisites

- **Bun 1.x** ([install](https://bun.com/docs/installation)). The lockfile is
  `bun.lock`, the runtime is `bun --bun vite`, the SQLite driver is
  `bun:sqlite`. There is no fallback to Node.
- A **Clerk** account if you want sign-in to work locally. Without keys the
  app boots but `/dashboard` and `/sets/*` redirect to `/sign-in`.
- A **Cloudflare Turnstile** site + secret key if you want the sign-in screen
  to be functional. Without them `verifyTurnstile` fails open in dev so OAuth
  buttons stay clickable.

## First-time setup

```bash
git clone <repo>
cd study
bun install
cp .env.example .env
# edit .env (see below)
bun run dev
```

Open `http://localhost:5173`. The SQLite file is created on first boot at the
path in `DB_PATH` (default `./data/study.db`). The `data/` directory is
gitignored.

## Environment variables

Source: [`.env.example`](../.env.example). Loaded by SvelteKit via
`$env/static/private` and `$env/dynamic/{private,public}`.

| Variable                       | Required          | Where it's read                                                        | Notes                                                                     |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | for auth          | `+layout.server.ts`, `hooks.server.ts`                                 | Format `pk_(test\|live)_<base64>`. Baked into the client bundle at build. |
| `CLERK_SECRET_KEY`             | for auth          | `hooks.server.ts`, `+layout.server.ts`                                 | Format `sk_(test\|live)_<base64>`. Server-only.                           |
| `PUBLIC_TURNSTILE_SITE_KEY`    | for sign-in       | `SignInProviders.svelte`                                               | Public, baked into the client bundle.                                     |
| `TURNSTILE_SECRET_KEY`         | for sign-in       | `lib/server/turnstile.ts`                                              | Server-only. Missing → fail-open in dev, error in prod.                  |
| `DB_PATH`                      | optional          | `lib/server/db.ts`                                                     | Defaults to `./data/study.db`. Created with `mkdir -p` on import.         |
| `NODE_ENV`                     | optional          | `lib/server/turnstile.ts`, `routes/reset/+server.ts`                   | `production` flips Turnstile to fail-closed and 404s `/reset`.            |
| `PORT`                         | runtime only      | `adapter-node` reads it at start                                       | Defaults to 3000.                                                         |
| `ORIGIN`                       | prod runtime only | `adapter-node` enforces same-origin POSTs against this                | Set to your public URL when behind a proxy.                               |

Anything starting with `PUBLIC_` is exposed to the client and is baked into
the production bundle at `bun run build` time. Server-only variables can be
swapped at runtime without rebuilding.

### Clerk dashboard checklist

In [dashboard.clerk.com](https://dashboard.clerk.com):

1. **API Keys** — copy publishable + secret into `.env`.
2. **User & Authentication → Social Connections** — enable Google and GitHub.
   The sign-in screen calls `signIn.sso({ strategy: 'oauth_google' })` and
   `'oauth_github'`; if those connections aren't enabled the buttons error.
3. **Paths** — Clerk needs to know where to land users after OAuth. The app
   renders `<AuthenticateWithRedirectCallback />` at `/sign-in/sso-callback`
   so add that as a redirect URL.

### Turnstile checklist

In [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile:

1. Create a widget. Add `localhost`, your dev tunnel host (if any), and the
   production hostname to the allowed hostnames.
2. Copy the site key and secret into `.env`.

## Scripts

```bash
bun run dev          # vite dev server on :5173
bun run build        # production bundle into ./build via adapter-node
bun run preview      # serve the production build locally
bun run start        # bun ./build/index.js (production server)
bun run check        # svelte-kit sync + svelte-check (typecheck)
bun run check:watch  # the above in watch mode
```

Run `bun run check` before pushing — there is no CI yet, so it's the only
typecheck guardrail.

## Project conventions

- **TypeScript over JavaScript everywhere.** Even one-off helpers go in `.ts`
  files. The user's project rule is explicit on this.
- **Bun-first.** Use `bun:sqlite` (not `better-sqlite3`), `bun --bun` to keep
  Bun as the runtime, and `bun install` rather than `npm`. Avoid pulling in
  Node-only deps unless you have to.
- **Server queries belong in `db.ts`.** If you find yourself writing
  `db.query(...)` inside a `+page.server.ts`, hoist it into the `queries`
  object. The one exception so far is `/explore` because the read is
  uncorrelated with any user.
- **Auth checks happen in the loader.** Don't lean on `hooks.server.ts`
  alone — it only covers `/dashboard` and `/sets`, and the resource-level
  rules (set ownership, public visibility) need per-route knowledge.
- **Forms use SvelteKit actions, not `fetch`.** All mutations
  (`/sets/new`, `/sets/[id]/edit`, set delete) are progressive-enhanced
  forms. The cards array round-trips as JSON in a hidden field — see
  [`CardRowsEditor.svelte`](../src/lib/components/CardRowsEditor.svelte).
- **No emojis in source or copy.** Visual emphasis is the job of typography
  (Fraunces italic) and color (orange accent), not unicode glyphs.

## Common tasks

### Add a column to `sets` or `cards`

There is no migration tool. The flow is:

1. Edit the `CREATE TABLE` in `initDb()` so fresh installs get the new
   schema.
2. Add an idempotent `ALTER TABLE` guarded by a `PRAGMA table_info` check, so
   existing dev databases pick up the column without exploding.
3. Update the relevant TypeScript type in `db.ts` (`StudySet`, `Card`, etc.).
4. Add or update queries in the `queries` object.

Example pattern for the idempotent ALTER:

```ts
const cols = db.query<{ name: string }, []>(`PRAGMA table_info(sets)`).all();
if (!cols.some((c) => c.name === 'archived_at')) {
    db.exec(`ALTER TABLE sets ADD COLUMN archived_at INTEGER`);
}
```

### Reset the local database

```bash
rm -rf data
bun run dev
```

WAL files (`study.db-wal`, `study.db-shm`) live next to the main DB and can
be removed too.

### Reset Clerk session cookies

If you've been swapping between Clerk dev tenants and the sign-in flow keeps
bouncing you, hit:

```
http://localhost:5173/reset
```

That endpoint clears every cookie on the origin and 303s back to `/`. It's
disabled in production builds.

### Inspect the database

```bash
sqlite3 data/study.db
.mode column
.headers on
SELECT s.id, s.title, count(c.id) AS cards
FROM sets s LEFT JOIN cards c ON c.set_id = s.id
GROUP BY s.id;
```

## Debugging

### "Auth handler errors on every request"

Cause: Clerk keys are missing or malformed. The boot regex
`/^pk_(test|live)_[A-Za-z0-9+/=_-]{16,}$/` is strict. If your key looks like
`pk_test_…` but doesn't match, double-check for stray quotes or trailing
whitespace in `.env`.

The fallback path runs a no-op auth handler (`noAuth` in `hooks.server.ts`)
that pretends every visitor is anonymous. You'll see `[study] Clerk keys not
configured — auth is disabled.` in the dev console at boot.

### "OAuth button is greyed out"

The button is gated on a successful Turnstile verification. Either:

- The Turnstile widget hasn't produced a token yet (give it a second).
- `PUBLIC_TURNSTILE_SITE_KEY` is wrong or unset and the widget never loads.
- `/api/turnstile/verify` returned 4xx — check the network tab.

In dev you can leave `TURNSTILE_SECRET_KEY` empty and `verifyTurnstile`
will still return `success: true`.

### "Stuck redirecting to /sign-in?redirect=…"

You're hitting the protected-route gate. Either sign in, or — if you've
fallen into a session loop — visit `/reset` to clear cookies.

### Vite HMR keeps full-reloading

`+page.svelte` and `+page.server.ts` changes trigger a SSR-side reload by
design. If you're seeing it for non-route files, restart `bun run dev`; in my
experience Tailwind v4's plugin occasionally loses track of theme changes
after large edits.

## Code style

- Tabs in source, single-quoted strings (matches the existing tree).
- Comments explain *why*, not *what*. The repo deliberately keeps narrative
  comments out — see existing files for the bar.
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) — runes mode
  is forced on by `svelte.config.js` for everything outside `node_modules`.
- Co-locate component-specific state and types inside the `<script lang="ts">`
  block. Cross-cutting types go in `lib/server/db.ts` (server) or `lib/index.ts`
  (client/shared).

## Optional: VS Code setup

`.vscode/extensions.json` (if you set one up) should recommend:

- `svelte.svelte-vscode` (Svelte language server)
- `bradlc.vscode-tailwindcss` (Tailwind class autocomplete)
- `oven.bun-vscode` (Bun runtime hooks)

The repo otherwise has no editor config — settings are user choice.
