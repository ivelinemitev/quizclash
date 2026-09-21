# 05 --- Cluster E: Shared State and Background Work

## Course objective

Handle contested writes, retries, and deferred work correctly.

## A. Durable Object: one room, one writer

Create one Durable Object instance per QuizClash room using the
room/game identifier.

The Durable Object is authoritative for active game state: - players; -
host; - status: lobby / playing / finished; - current question index; -
answers for the current question; - scores; - question timing metadata.

### Required invariants

-   maximum 6 players;
-   nickname uniqueness within a room, or deterministic disambiguation;
-   game starts only once;
-   a player answers a question at most once;
-   an answer cannot be accepted for the wrong question;
-   score increments at most once for an accepted answer;
-   game finishes after question 5;
-   concurrent submissions cannot corrupt score/state.

## B. Idempotency

`submitAnswer` must accept an idempotency key.

A replay with the same key: - must not create another answer; - must not
increment score twice; - returns the previously determined result.

Cache/retain idempotency information for a bounded period appropriate to
this exercise.

## C. Internal communication

Where the architecture requires Worker-to-Durable-Object communication,
use the platform-native binding/stub mechanism rather than inventing a
public HTTP microservice boundary.

## D. Workers AI failure behavior

AI generation occurs before gameplay.

If Workers AI fails: - return a clear generation error; - do not create
a half-valid quiz/game.

Once a game has started, AI availability must not affect answer
submission or scoring.

## E. Queue

After a completed game is durably recorded, emit a small event to a
Queue.

Consumer may: - refresh leaderboard cache; - update simple aggregate
stats; - emit/process a structured audit/result event.

Requirements: - retries must be safe; - duplicate delivery must not
duplicate durable effects; - failed background processing must not
invalidate a completed game.

If timebox pressure is high, implement this section last and document it
as the selected stretch building block.

## F. Scheduled/Cron work

Cron is not selected for QuizClash MVP. Do not add it merely to satisfy
a checkbox.

## Questions Claude must be able to answer

-   What exact conflict does the Durable Object prevent?
-   What happens if the Queue consumer crashes and retries?
-   Why is the background task safe to run more than once?
-   What happens if Workers AI is unavailable?

## Acceptance criteria

-   Two or more clients can join the same room.
-   Concurrent answers remain correct.
-   Duplicate answer requests are idempotent.
-   Active game state is coordinated by the Durable Object, not KV/D1
    polling.
-   Completed durable results are stored in D1.
-   Queue work, if implemented, is retry-safe.
