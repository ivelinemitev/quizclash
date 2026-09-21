# QuizClash

A small multiplayer quiz game (2–6 players, 5 questions, 4 answers each) built as a Next.js App Router application deployed to Cloudflare Workers via [vinext](https://vinext.dev). See `CLAUDE.md`/`ARCHITECTURE.md` for the full spec and `PROGRESS.md` for what's implemented so far.

## Prerequisites

- Node.js 20.9+ (this project has been run on Node 26)
- A Cloudflare account (for deploying and for the Workers AI binding)

## Local development

There are two ways to run this app locally, depending on whether you need Cloudflare bindings:

**Plain Next.js (fast iteration, no Cloudflare bindings):**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This runs on Node, not the Workers runtime — routes that use a Cloudflare binding (e.g. `/api/health`'s runtime check, or anything using `env.AI`) won't behave the same here.

**Under the real Workers runtime (needed once bindings are involved):**

```bash
npm run build:vinext
npm run start:vinext
```

This builds with vinext and runs the built Worker locally via Wrangler at [http://localhost:8787](http://localhost:8787). Requires `npx wrangler login` and a `workers.dev` subdomain on your account (registered automatically on first deploy). `wrangler.jsonc` sets `"remote": true` on the `DB`/`CACHE`/`VECTORIZE` bindings, so local dev reads/writes the same real D1/KV/Vectorize resources as production (the `AI` binding is always remote regardless) — there's no separate local-only dataset to keep in sync, but it also means local testing affects real data (there's only one environment for this project).

## Deploying to Cloudflare

This project deploys as **two Cloudflare Workers**: the main `quizclash` Worker (this Next.js app), and a small standalone `quizclash-rooms` Worker (`workers/rooms/`) that hosts the `RoomDurableObject` class and the post-game Queue consumer — vinext owns the main Worker's entrypoint, so a Durable Object class can't be exported from the same bundle; the main Worker reaches it via a cross-script Durable Object binding instead. Deploy the rooms Worker first (the main Worker's binding depends on it existing):

```bash
npx wrangler login
npm run deploy:rooms
npm run build:vinext
npm run deploy:vinext
```

Wrangler will print each deployed `https://<name>.<subdomain>.workers.dev` URL.

**First-time setup under a different Cloudflare account:** the D1 database, KV namespace, and Vectorize index referenced in `wrangler.jsonc` are tied to the account that created them. On a fresh account, provision your own and update the IDs:

```bash
npx wrangler d1 create quizclash-db --binding DB --update-config
npx wrangler kv namespace create quizclash-cache --binding CACHE --update-config
npx wrangler vectorize create quizclash-questions --preset "@cf/baai/bge-small-en-v1.5" --binding VECTORIZE --update-config
npx wrangler d1 migrations apply quizclash-db --local
npx wrangler d1 migrations apply quizclash-db --remote
```

**Secrets:** set them with `npx wrangler secret put <NAME>` — never put secret values in `.dev.vars` or `.env*` (both gitignored) or in `wrangler.jsonc` (which *is* committed, since it only holds binding configuration, never secret values).

## Current scope

Implemented so far: shared Zod validation, Server Actions for the Create/Join forms, deployment to Cloudflare Workers, real topic-based quiz generation (Workers AI JSON mode → shared schema validation → Vectorize near-duplicate check → D1 via Drizzle), a KV cache of recently-played topics, and real multiplayer coordination via a Durable Object (`workers/rooms/`) — join/start/answer-submission are authoritative server-side, with idempotent scoring and a per-question timeout, and completed games persist to D1 with a post-game Queue event feeding a KV leaderboard snapshot. See `PROGRESS.md` for phase-by-phase status and known limitations (rate limiting/audit logging and the final architecture write-up are still ahead).

A full architecture diagram and walkthrough will be added here during the final verification phase.
