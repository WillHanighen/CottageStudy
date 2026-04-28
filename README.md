# CottageStudy

A focused, Quizlet-style study tool. Build flashcard sets and practice them in
four complementary modes — flashcards, learn, quiz, and match.

CottageStudy is the second site in the [CottageIndustries](https://cottageindustries.xyz)
network and is deployed at **`study.cottageindustries.xyz`**. It shares the
parent site's dark zinc + orange visual language and the same opinion that
small, fast, focused tools beat sprawling ones.

```bash
bun install
cp .env.example .env       # fill in the keys (see docs/development.md)
bun run dev                # http://localhost:5173
```

## Stack

| Layer       | Choice                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------- |
| Runtime     | [Bun](https://bun.com) 1.x                                                                   |
| Framework   | [SvelteKit](https://kit.svelte.dev) on `@sveltejs/adapter-node`, Svelte 5 with runes         |
| Styling     | [Tailwind CSS v4](https://tailwindcss.com) (Vite plugin, no `tailwind.config.js`)            |
| Auth        | [Clerk](https://clerk.com) via [`svelte-clerk`](https://github.com/wobsoriano/svelte-clerk)  |
| Bot defense | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) on the sign-in screen |
| Persistence | SQLite via Bun's built-in [`bun:sqlite`](https://bun.com/docs/api/sqlite)                    |

## What's in the box

- **Authenticated study set library** at `/dashboard` (Clerk session required).
- **Public set discovery** at `/explore` (anyone can browse sets marked public).
- **Set editor** with a JS-driven row editor that round-trips a JSON cards
  payload through a hidden form field on submit.
- **Four study modes** per set, each at its own route. See
  [`docs/study-modes.md`](./docs/study-modes.md).
- **Drop-in graceful auth**. If Clerk keys are missing the app boots without
  auth and the protected routes simply 303 to `/sign-in` — useful for first-run
  smoke tests.

## Documentation

| Topic                                            | What's inside                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [Architecture](./docs/architecture.md)           | System overview, data model, request lifecycle, auth + Turnstile flow, file map                |
| [Study modes](./docs/study-modes.md)             | Behavior, controls, and internals for Flashcards / Learn / Quiz / Match                        |
| [Development](./docs/development.md)             | Local setup, scripts, env vars, common tasks, debugging the auth dev loop                      |
| [Deployment](./docs/deployment.md)               | Docker image, plain Bun runtime, SQLite persistence, public env baking, ops checklist          |

## License

Source-available, all rights reserved by the owner unless a `LICENSE` file says
otherwise. Contact via [cottageindustries.xyz](https://cottageindustries.xyz).
