# Deployment

CottageStudy is a SvelteKit app with `@sveltejs/adapter-node`. The build
output is a self-contained Node-compatible bundle in `./build/` that Bun runs
directly. There are two well-trodden paths: the [Docker image](#docker) (the
default) and [plain Bun](#plain-bun) on whichever host you like.

## Build artifact

`bun run build` produces:

```
build/
├── client/      Static assets, hashed
├── server/      SSR bundle
├── env.js
├── handler.js
├── index.js     Entrypoint — `bun run start` boots this
└── shims.js
```

It listens on `process.env.PORT` (default 3000), binds to
`process.env.HOST` (default `0.0.0.0`), and reads `process.env.ORIGIN` to
enforce same-origin POSTs when behind a proxy. Body size is capped by
`process.env.BODY_SIZE_LIMIT` (default 512 KB upstream; the Docker image
bumps this to `2M`).

## Docker

The [`Dockerfile`](../Dockerfile) is a 3-stage build (`base`, `deps`,
`builder`, `runner`) using `oven/bun:1`.

```bash
docker build -t cottage-study \
    --build-arg PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
    --build-arg PUBLIC_TURNSTILE_SITE_KEY=0x4AA... \
    .

docker run -p 3000:3000 \
    --env-file .env \
    -v $(pwd)/data:/data \
    cottage-study
```

Things to know:

- **`PUBLIC_*` vars are baked at build time.** The `--build-arg` flags above
  feed them into the `builder` stage so they end up in the client bundle. If
  you change a `PUBLIC_*` value you must rebuild the image.
- **Server-only secrets are runtime.** `CLERK_SECRET_KEY` and
  `TURNSTILE_SECRET_KEY` come from `--env-file` (or `-e`) and can be rotated
  without rebuilding.
- **`/data` is the database volume.** The image sets `DB_PATH=/data/study.db`
  and runs as the unprivileged `bun` user. Mount `/data` as a host volume or
  named volume so SQLite (and its WAL files) survive container restarts.
- **Port** is `EXPOSE`d as 3000. The `CMD` is `bun run build/index.js`.
- **`/reset`** is automatically 404'd because `NODE_ENV=production` is set in
  the runner stage.

### Runtime env in the container

`Dockerfile` sets these defaults; override via `-e` or `--env-file`:

| Variable          | Default            | Purpose                                                  |
| ----------------- | ------------------ | -------------------------------------------------------- |
| `NODE_ENV`        | `production`       | Toggles fail-closed Turnstile + disables `/reset`.       |
| `PORT`            | `3000`             | adapter-node listens here.                               |
| `HOST`            | `0.0.0.0`          | adapter-node bind address.                               |
| `BODY_SIZE_LIMIT` | `2M`               | Override if you want to ingest larger card payloads.     |
| `DB_PATH`         | `/data/study.db`   | The volume mount target.                                 |

### Reverse proxy

If you put Caddy / nginx / Cloudflare in front, set `ORIGIN` to the public
URL (e.g. `https://study.cottageindustries.xyz`) — adapter-node uses it for
CSRF protection on form posts. Without it, mismatched-origin errors look like
`Cross-site POST form submissions are forbidden` in production logs.

## Plain Bun

Useful when you don't want a container — single VPS, systemd unit, fly
machine, etc.

```bash
bun install --production
bun run build

DB_PATH=/var/lib/cottage-study/study.db \
PORT=3000 \
HOST=0.0.0.0 \
ORIGIN=https://study.cottageindustries.xyz \
NODE_ENV=production \
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
CLERK_SECRET_KEY=sk_live_... \
PUBLIC_TURNSTILE_SITE_KEY=0x4AA... \
TURNSTILE_SECRET_KEY=0x4AA... \
bun run start
```

`PUBLIC_*` keys must be in the environment of `bun run build` to make it into
the client bundle. Server-only keys only need to be present at runtime.

### Example systemd unit

```ini
# /etc/systemd/system/cottage-study.service
[Unit]
Description=CottageStudy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=cottage
WorkingDirectory=/opt/cottage-study
EnvironmentFile=/etc/cottage-study/env
ExecStart=/usr/local/bin/bun run /opt/cottage-study/build/index.js
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
```

`/etc/cottage-study/env` should contain the same vars listed in
[Plain Bun](#plain-bun) above. Make sure the `cottage` user owns whatever
directory `DB_PATH` points at.

## Persistence

SQLite with WAL is more than enough for this workload. A few things to keep
in mind:

- **Mount the parent directory**, not just the `.db` file. WAL mode produces
  `study.db-wal` and `study.db-shm` next to the main file, and they need to
  travel together.
- **Backups**: `sqlite3 /data/study.db ".backup '/backups/study-$(date +%F).db'"`
  is safe with WAL. A naïve `cp` while writes are happening will produce a
  corrupt copy.
- **No connection pool needed.** `bun:sqlite` is in-process and the SvelteKit
  app is single-process by design — multiple containers writing to the same
  SQLite file is *not* supported.

## Operational checklist

Before promoting to prod the first time:

- [ ] Real Clerk live keys (`pk_live_…`, `sk_live_…`) present in env.
- [ ] Turnstile widget hostnames include the public domain.
- [ ] Clerk redirect allowlist includes `https://<your-domain>/sign-in/sso-callback`.
- [ ] `ORIGIN` matches the public URL exactly (scheme + host, no trailing slash).
- [ ] `DB_PATH` points at a persistent volume; the directory exists and is
      writable by the container/user.
- [ ] `NODE_ENV=production` is set (this is what makes `/reset` 404 and what
      flips Turnstile to fail-closed mode).
- [ ] First user signs up successfully end-to-end with a real OAuth provider.
- [ ] Backup job for the SQLite file is scheduled.

## Scaling

CottageStudy is intentionally a single-node app. Horizontal scaling would
require swapping `bun:sqlite` for a shared store (Postgres or Turso would
both fit) — see the schema in [`db.ts`](../src/lib/server/db.ts) for what
that migration would touch. Until then, vertical scaling is the answer:
SQLite over WAL on a fast disk handles tens of millions of reads per minute
on commodity hardware, and the read-heavy workload here barely registers.

## Logging + observability

Currently: `console.log` to stdout, captured by whatever runs the process.
There is no structured logger or APM hook. If you need it, the lightest
option is to add a small `lib/server/log.ts` helper that emits ndjson and
swap the relevant call sites.
