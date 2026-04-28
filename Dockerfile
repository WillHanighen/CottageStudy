FROM oven/bun:1 AS base
WORKDIR /app

# ---- Install deps (cached) ----
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---- Build the app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These public env vars are baked into the client bundle at build time. Pass them via
# `--build-arg` if you want to embed them; otherwise set them at runtime + rebuild.
ARG PUBLIC_CLERK_PUBLISHABLE_KEY=""
ARG PUBLIC_TURNSTILE_SITE_KEY=""
ENV PUBLIC_CLERK_PUBLISHABLE_KEY=$PUBLIC_CLERK_PUBLISHABLE_KEY
ENV PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY

RUN bun run build

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BODY_SIZE_LIMIT=2M
ENV DB_PATH=/data/study.db

# Production-only deps for the runtime
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/build ./build

# SQLite WAL files live in /data, mount as a volume in production.
RUN mkdir -p /data && chown -R bun:bun /data

USER bun
EXPOSE 3000
VOLUME ["/data"]
CMD ["bun", "run", "build/index.js"]
