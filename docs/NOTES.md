## What broke (found via live play-testing, not code review)

- The per-question timeout alarm was never rescheduled after a "fast"
  advance (everyone answers before time runs out) — the room would
  silently stop progressing after one such question.
- D1 persistence of a completed game was wired to only one of the two
  ways a game can actually finish (a player's own answer completing
  question 5) — a game that finished via the timeout alarm firing, with
  no HTTP caller in that path, was never persisted.
- A non-host player sitting in the lobby had no way to discover the host
  had started the game, short of a manual page refresh.
- Nobody's player list — host included — live-updated as others joined
  the lobby; the poller only reacted to *status* transitions, never to a
  same-status join.
- The results page for an "ended" session was a dead end: no way back to
  the app and no automatic redirect.

## What I'd change for production

- Real session/reconnect handling — right now a player's identity is a
  UUID in the URL, with no way to recover it if lost.
- A genuine multi-round session model. Replaying a room currently works,
  but the player roster locks after round 1 starts on purpose (see
  "known limitations" below) — a real product would need late joins
  between rounds to actually work.
- A fact-checking/grounding layer, if factual correctness ever mattered
  for real — see the explicit limitation below; nothing here attempts it.
- Real metrics/dashboards. Audit logging today is `[AUDIT]`-prefixed
  `console.log` lines, greppable via `wrangler tail` — adequate for a
  learning exercise, not for production observability.
- A consumer (or at least an alert) on the dead-letter queue. Messages
  that exhaust their retries land in `quizclash-post-game-dlq` and just
  sit there today — nothing reprocesses or surfaces them.

## Known AI factual-correctness limitation (explicit)

- `QuizSchema` (Zod) guarantees **structure** only: exactly 5 questions,
  4 distinct non-empty answers each, a valid `correctAnswerIndex`.
- Vectorize guarantees **similarity** only: "this looks like a question
  already asked for this topic," never "this answer is true."
- Neither layer, nor both together, proves any question or its
  marked-correct answer is factually accurate. This is a deliberate,
  documented MVP limitation stated directly in `CLAUDE.md`/`ARCHITECTURE.md`

## Known limitations

- A late joiner (someone who tries to join after a room's first round has
  already started) can only ever wait and view results — never play —
  for that room's entire lifetime, including any later rounds. This was
  a deliberate scoping choice when multi-round play was added, to avoid
  reopening late-join complexity a second time.
- A finished-but-not-explicitly-ended room auto-expires after 30 minutes
  of inactivity via a Durable Object Alarm; before that, it's fully
  resumable (the host can start another round at any time).
- Local development against `next dev` (plain Node) cannot exercise any
  Cloudflare-binding-dependent code path — that requires
  `build:vinext`/`start:vinext`, which talks to the same real, remote
  D1/KV/Vectorize resources as production (there is no separate local
  dataset for this project).