# 00 --- Project Scope and Building Blocks

## Goal

Build a small multiplayer quiz application that naturally demonstrates
approximately five Cloudflare building blocks without using every
platform service.


## QuizClash game loop

1.  Host enters a topic and nickname.
2.  Server creates a 5-question quiz.
3.  Host receives a room code.
4.  1--5 additional players join with the room code and a nickname.
5.  Host starts the game.
6.  All players receive the same question.
7.  Each player can answer once.
8.  The room advances after all active players answer or the question
    timeout expires.
9.  Correct answer = 1 point.
10. After 5 questions, final ranking is shown and the completed result
    is persisted.

## Non-goals

-   Authentication
-   Player profiles
-   Matchmaking
-   Chat
-   Friends
-   Avatars/uploads
-   Payments
-   Admin UI
-   Tournament system
-   Complex scoring
-   Production-grade factual verification of AI-generated trivia

## Selected Cloudflare building blocks

### D1 --- SQL database

Use for related durable records: - quizzes; - questions; - completed
games; - final player results.

### KV --- key-value cache

Use for a small rebuildable read-heavy value, for example: - cached
recent/popular quiz topics or a cached leaderboard snapshot.

KV is never the source of truth.

### Durable Objects --- coordination

Use one Durable Object per active room.

It owns: - connected/active players; - game status; - current question
index; - submitted answers; - scores; - idempotency for answer
submission.

### Workers AI + Vectorize --- LLM and semantic similarity

Workers AI generates exactly five questions for a topic.

Vectorize stores question embeddings and is used only to detect/reduce
near-duplicate generated questions. It does not establish factual truth.

### Queues --- background work

After a game finishes, enqueue a small non-critical event, such as
leaderboard/statistics refresh or audit/result processing.

If the 2--3 day timebox is at risk, Queues is the first selected block
allowed to become a clearly documented stretch feature.

## Data placement rule

For every new datum, answer: 1. Is it active contested room state? →
Durable Object. 2. Is it durable relational source-of-truth data? → D1.
3. Is it rebuildable hot/read-heavy data? → KV. 4. Is it an embedding
used for similarity? → Vectorize. 5. Is it deferred work that can retry?
→ Queue.

Do not put files in D1. Do not use KV for primary data.

## Success criteria

TA reviewer can create a game, join from a second client, play five
questions, see correct scoring/final ranking, and understand why each
Cloudflare component exists.
