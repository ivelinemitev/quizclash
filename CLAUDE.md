@AGENTS.md
# QuizClash --- Claude Code Instructions

## Mission

Build QuizClash as a strict **2--3 day Cloudflare learning exercise**
using Spec-Driven Development.

Do not implement future phases early.

## Mandatory documents

Before implementing **every phase**, read:

1.  `CLAUDE.md`
2.  `ARCHITECTURE.md`
3.  `00-PROJECT-SCOPE.md`
4.  the current phase specification
5.  `PROGRESS.md`

## Source-of-truth precedence

If documents conflict:

1.  `CLAUDE.md` --- process/global constraints
2.  `ARCHITECTURE.md` --- technology, deployment architecture,
    boundaries, data ownership
3.  current phase spec
4.  `00-PROJECT-SCOPE.md`

Do not resolve architecture conflicts by improvising. Stop and report
them.

## Locked deployment path

This is a **Next.js App Router application on Cloudflare Workers**.

Use: - current Wrangler 4.x; - vinext as the Next.js → Workers
deployment path; - `wrangler.jsonc` as the Cloudflare Worker/bindings
configuration source of truth; - Cloudflare bindings rather than
invented service APIs; - `wrangler types` after binding changes.

For a clean project, prefer:

``` bash
npm create cloudflare@latest -- quizclash --framework=next
```

For an existing Next.js project, verify compatibility and use current
vinext/Wrangler setup.

Do not silently switch to: - Cloudflare Pages; - OpenNext; - Vercel; - a
Node/Express backend; - another hosting/runtime architecture.

If current Cloudflare tooling disagrees with the spec, verify current
official Cloudflare documentation and report the mismatch before
changing architecture.

## Product

-   2--6 players per room.
-   Host creates room and chooses topic.
-   Players join by room code + nickname.
-   Exactly 5 questions.
-   Exactly 4 distinct answers per question.
-   One `correctAnswerIndex`.
-   Correct answer = 1 point.
-   Wrong/timeout = 0.
-   Final ranking after question 5.

No auth, profiles, friends, chat, matchmaking, uploads, achievements,
admin panel, or complex scoring.

## Cloudflare scope

Core selected building blocks: 1. D1 + Drizzle 2. Durable Objects 3.
Workers AI + Vectorize 4. KV 5. Queues

R2 and Cron are out of scope.

Queue is the first feature allowed to become stretch-only if the timebox
is threatened.

## Engineering rules

-   Server Components by default.
-   Client Components only for browser interactivity.
-   Server Actions for form-style mutations where appropriate.
-   Zod validates all trust boundaries.
-   Active room state belongs to its Durable Object.
-   Durable relational history belongs to D1.
-   KV contains only rebuildable cache data.
-   AI output is untrusted until Zod validation.
-   Vectorize detects similarity, not factual correctness.
-   Background Queue work cannot be required for correctness of the
    completed game.
-   Never let the browser calculate authoritative score.
-   Prefer the smallest correct implementation.
-   No speculative abstraction layers or infrastructure.

## SDD workflow

For every phase:

1.  Read mandatory documents.
2.  Inspect current repository state.
3.  State a short implementation plan.
4.  Identify any spec/architecture conflict before coding.
5.  Implement only the current phase.
6.  Run relevant tests/checks.
7.  Verify every acceptance criterion.
8.  Update `PROGRESS.md`.
9.  Stop and report results.

Do not automatically continue to the next phase.

## Cloudflare configuration rule

Generated current-toolchain configuration is preferable to hand-copying
stale tutorial configuration.

Do not manually rewrite vinext/Vite/Wrangler generated files unless
there is a concrete reason.

Never commit: - secrets; - `.dev.vars`; - account credentials.

Commit: - `wrangler.jsonc`; - migrations; - source code; - non-secret
configuration.

## Question contract

``` ts
type Question = {
  text: string;
  answers: [string, string, string, string];
  correctAnswerIndex: 0 | 1 | 2 | 3;
};
```

Shared Zod validation must enforce exactly five questions, four
distinct/non-empty answers, and valid correct index.

This is structural validation only. Do not claim it proves factual
correctness.

## Definition of done

Final repository must contain: - working deployed application; -
tests/checks passing; - README setup/deployment instructions; -
architecture diagram; - explanation of data placement; - notes on
surprises/mistakes/production changes; - explicit known limitations; -
updated `PROGRESS.md`.
