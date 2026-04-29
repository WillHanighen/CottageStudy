# Architecture

CottageStudy is a single-process SvelteKit app served by Bun. There is no
separate API tier, no ORM, no migration tool, and no client-side state store —
state lives in the database, loaders pull it through `+page.server.ts`, and
forms or URL navigation push it back. Auth is delegated to Clerk; spam
protection on sign-in is delegated to Turnstile.

This document covers the moving parts in the order you'd hit them when
following a request through the system.

## Top-level layout

```
src/
├── app.css                    Tailwind theme, font registration, custom keyframes (.grain, .rise-in)
├── app.html                   Document shell + Geist / Fraunces font preconnects
├── app.d.ts                   App.Locals shape (Clerk auth as callable vs object — see comments)
├── hooks.server.ts            Clerk handler + protected-route gate + initDb()
├── lib/
│   ├── seo.ts                 Site name/tagline, OG/Twitter helpers, SITE_URL (`PUBLIC_SITE_URL`)
│   ├── clerk.ts               Stub re-exports for components that import from svelte-clerk
│   ├── ai/                    Client-side only (safe for the browser bundle)
│   │   ├── byok.ts            Types/constants for BYOK payloads to `/api/ai/generate-cards`
│   │   └── encrypt.ts         Hybrid RSA-OAEP (server pubkey from `/api/ai/pubkey`) + AES-GCM envelope
│   ├── components/
│   │   ├── AiGenerateModal.svelte BYOK wizard on /sets/new (paste guide + model + encrypted key)
│   │   ├── Background.svelte     Fixed grid pattern + radial blur orbs + vignette
│   │   ├── CardRowsEditor.svelte Reactive rows editor used by /sets/new and /sets/[id]/edit
│   │   ├── Footer.svelte
│   │   ├── Header.svelte         Top nav with conditional Clerk session menu
│   │   ├── Seo.svelte           Meta/canonical/json-ld wrapper (consumes `$lib/seo`)
│   │   └── SignInProviders.svelte OAuth buttons gated on a Turnstile token
│   └── server/
│       ├── ai/
│       │   ├── keypair.ts        Ephemeral per-process RSA-2048; decrypt AES-wrapped BYOK payloads
│       │   └── openrouter.ts     `generateCardsFromGuide` → OpenRouter chat completions (JSON schema)
│       ├── auth.ts               getAuth(locals) helper that tolerates svelte-clerk's runtime shape
│       ├── db.ts                 bun:sqlite handle, schema bootstrap, query catalogue
│       └── turnstile.ts         POST to challenges.cloudflare.com/turnstile/v0/siteverify
└── routes/
    ├── +layout.{svelte,server.ts}        ClerkProvider wrapper, SSR initial state via buildClerkProps
    ├── +page.svelte                       Marketing landing page
    ├── manifest.webmanifest/+server.ts   Web App Manifest (`prerender: true`, icons/theme from `$lib/seo`)
    ├── api/
    │   ├── ai/
    │   │   ├── pubkey/+server.ts           GET RSA public JWK for client-side encryption (auth required)
    │   │   └── generate-cards/+server.ts   POST decrypted BYOK envelope → OpenRouter; rate-limited
    │   └── turnstile/verify/+server.ts    POST endpoint called by SignInProviders before OAuth
    ├── robots.txt/+server.ts              Crawler rules
    ├── reset/+server.ts                   Dev-only cookie nuker for sign-in loops (404s in prod)
    ├── sign-in/                           Custom sign-in screen + OAuth callback handler
    ├── sitemap.xml/+server.ts             Lists static routes + public sets (uses `queries` + `$lib/seo`)
    ├── dashboard/                         Authenticated set library
    ├── explore/                           Public sets feed (queries SQLite inline for search/filter)
    └── sets/
        ├── new/                           Create a set + initial cards (+ optional AiGenerateModal)
        └── [id]/
            ├── +page.{svelte,server.ts}   Set hub: mode picker + card list + delete action
            ├── edit/                       Edit metadata + cards
            ├── export/+server.ts           GET JSON download (`cottage-study/v1`); visibility same as viewer
            ├── study/                      Flashcards mode
            ├── learn/                      Adaptive learn mode
            ├── quiz/                       Graded test mode
            └── match/                      Timed pairing game
```

The split between `lib/server/` and `lib/components/` is enforced by SvelteKit:
anything imported from `$lib/server/*` is guaranteed to never reach the client
bundle, which is how the `bun:sqlite` handle and Turnstile secret stay
server-only.

## Data model

Schema lives in [`src/lib/server/db.ts`](../src/lib/server/db.ts) and is
created on first boot via `initDb()`, which is called from `hooks.server.ts`.
There is no migration system — the app is small enough that a fresh
`CREATE TABLE IF NOT EXISTS` plus deliberate, additive schema changes is
sufficient. If you add a column, do it via `ALTER TABLE` + an idempotent
`PRAGMA table_info` check.

```sql
CREATE TABLE sets (
    id          TEXT PRIMARY KEY,        -- crypto.randomUUID()
    user_id     TEXT NOT NULL,           -- Clerk user id
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_public   INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,        -- ms epoch
    updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_sets_user ON sets(user_id, updated_at DESC);

CREATE TABLE cards (
    id         TEXT PRIMARY KEY,
    set_id     TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    term       TEXT NOT NULL,
    definition TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_cards_set ON cards(set_id, position);
```

WAL mode is on (`PRAGMA journal_mode = WAL`) and foreign keys are enforced
(`PRAGMA foreign_keys = ON`). The cascade on `cards.set_id` means deleting a
set wipes its cards in one transaction.

The `queries` object in `db.ts` is the only place that talks to SQLite. Every
public route handler calls it through `$lib/server/db`. If you find yourself
writing `db.query` outside `db.ts`, it should probably move into `queries`.

## Request lifecycle

Every request flows through `src/hooks.server.ts`. The hook is composed of two
handlers in sequence:

1. **Clerk handler** (or a no-op stub when keys aren't configured) — populates
   `event.locals.auth` with an `AuthObject` matching the
   [Clerk backend SDK](https://clerk.com/docs/references/backend/overview).
2. **`protect` handler** — for any path under `/dashboard` or `/sets`, if
   `getAuth(locals).userId` is null, redirects to
   `/sign-in?redirect=<encoded path>`.

Detection logic (`isClerkConfigured`) checks the publishable + secret key
shapes and gracefully falls back to the no-auth handler if either is missing.
The fallback is what makes a clean clone with an empty `.env` boot far enough
to see the landing page.

`getAuth(locals)` exists because `svelte-clerk` historically assigned
`locals.auth` as a callable rather than the AuthObject directly. The helper
unifies both shapes so route code can keep doing `getAuth(locals).userId`.

### Per-route loader pattern

All authenticated routes follow the same pattern:

```ts
export const load: PageServerLoad = ({ params, locals }) => {
    const { userId } = getAuth(locals);
    if (!userId) throw redirect(303, `/sign-in?redirect=...`);

    const data = queries.something(userId, params.id);
    if (!data) throw error(404);
    if (!data.is_public && data.user_id !== userId) throw error(403);

    return { data };
};
```

This 401/403 logic is intentionally repeated rather than abstracted. It's a
handful of lines, the redirect target depends on the route, and the visibility
rule for each resource (set vs card vs public feed) is local knowledge.

### Mutations

Mutations are SvelteKit `actions`. Both `/sets/new` and `/sets/[id]/edit`
serialize the cards array as a JSON string in a hidden `<input>`, parse it
server-side, validate, and call `queries.replaceCards(setId, cards)` which
wraps `DELETE + INSERT` in a single `db.transaction(...)`. Replacing rather
than diffing is deliberate — the editor is small enough that the simpler
approach wins.

The set delete action lives at `?/delete` on the set hub page and is invoked
by a `<form method="POST" use:enhance>` after a confirmation step.

## Auth + Turnstile flow

The sign-in screen at `/sign-in` is custom (we don't render Clerk's hosted
component). The flow:

1. User loads `/sign-in`. The page mounts the Turnstile widget which executes
   in the background.
2. When the widget produces a token, `SignInProviders.svelte` POSTs it to
   `/api/turnstile/verify` ([`+server.ts`](../src/routes/api/turnstile/verify/+server.ts)).
   That endpoint calls Cloudflare's `siteverify` API server-side using
   `TURNSTILE_SECRET_KEY` and the request's IP.
3. On a successful verify, the Google / GitHub buttons are enabled. Clicking
   one calls `signIn.sso({ strategy: 'oauth_google' | 'oauth_github' })`.
4. Clerk hosts the OAuth dance and redirects back to
   `/sign-in/sso-callback`, which renders the `<AuthenticateWithRedirectCallback>`
   component and hands SvelteKit's `goto` to Clerk via
   `routerPush` / `routerReplace` props on `ClerkProvider`.

In dev, if `TURNSTILE_SECRET_KEY` is unset `verifyTurnstile` fails open with
`success: true` so the sign-in flow remains usable. In production it returns
an error.

`/reset` is a 303-with-`Set-Cookie: Max-Age=0` endpoint that clears every
cookie for the origin. It's there to break Clerk session loops when you've
been swapping between dev tenants — and it 404s when `NODE_ENV=production`.

## AI-assisted card generation (BYOK)

Authenticated users can draft cards from pasted study guides on **`/sets/new`**
via **bring-your-own-key** OpenRouter access. CottageStudy never stores API
credentials: the user's key is bundled with the guide JSON, encrypted client-side
(`$lib/ai/encrypt.ts`) with an ephemeral RSA-OAEP-2048 public key from **`GET /api/ai/pubkey`**,
then posted to **`POST /api/ai/generate-cards`**. The server holds the matching
private key only in memory for the lifetime of the process (regenerated at
startup), decrypts (`$lib/server/ai/keypair.ts`), forwards the plaintext key in
memory to OpenRouter (`$lib/server/ai/openrouter.ts`), and replies with `{ title?, cards[] }`
or `{ status: needs_more_info, reason }`. Per-user rate limiting applies to
successful route handling (see `RATE_LIMIT_*` in the endpoint).

There is no `OPENROUTER_*` secret in `.env`; the product model is purely BYOK.
[`$lib/seo`](../src/lib/seo.ts) exposes `SITE_URL` (built from optional `PUBLIC_SITE_URL`) sent as `http-referer` /
`x-title` per OpenRouter’s attribution headers.

## Layout + styling

`+layout.svelte` wraps the entire app in `<ClerkProvider>` (when configured)
and renders `<Background />`, `<Header />`, the route's content, and
`<Footer />`. The `routerPush`/`routerReplace` props normalize Clerk's
post-OAuth absolute URLs into SvelteKit-friendly path-only navigations.

Tailwind v4 is set up via the Vite plugin only; there is no `tailwind.config.js`.
Theme extensions live as `@theme` blocks in `app.css`. Three custom
animations / utilities are notable:

- `.grain` — a tiled SVG noise overlay for raised cards.
- `.rise-in` — entry animation used on hero sections and big result banners.
- The flashcard 3D flip uses `transform-style: preserve-3d` plus
  `backface-visibility: hidden` on inner faces. See
  [study modes](./study-modes.md#flashcards) for the gory bits.

## Why no broad REST layer

Page data flows through `+page.server.ts` loaders; mutations favour SvelteKit
`actions`. Thin JSON routes exist where a page action is awkward — Turnstile
verification, **`/api/ai/*`** BYOK decryption + proxy — but they intentionally
mirror the adjacent UI and reuse the same `getAuth`-style gate. Keeping the
SQLite `queries` object as the backbone avoids a sprawling parallel API surface;
the BYOK endpoints never persist third-party payloads beyond decrypt-in-flight.
