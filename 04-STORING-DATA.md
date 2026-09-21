# 04 --- Cluster D: Storing Data

## Course objective

Put each kind of data in the correct store. QuizClash intentionally uses
D1, KV, and Vectorize from this cluster. R2 is not selected because the
product has no files/uploads in the MVP.

## A. D1 + Drizzle

### Schema

Design a small relational schema with Drizzle for durable data.

Minimum useful entities: - `quizzes` - `questions` - `completed_games` -
`game_results`

Avoid storing active room coordination state in D1.

### Migration

-   generate the first migration;
-   apply it locally;
-   apply it to the deployed environment using the appropriate workflow.

### Unanticipated schema change exercise

After the initial migration, make one small realistic schema change,
e.g. add `topic` metadata or `generated_by` to a quiz. Generate/apply a
second migration and update affected code.

## B. KV

Store exactly one useful rebuildable/read-heavy value.

Recommended: - `leaderboard:recent` snapshot; or - popular/recent topic
cache.

Requirements: - D1 remains source of truth; - application remains
correct if KV is cleared; - document eventual consistency implications.

## C. Workers AI quiz generation

Implement topic-based quiz generation.

Input: - topic string.

Output: - exactly 5 questions; - exactly 4 distinct answers each; -
exactly one `correctAnswerIndex` per question.

Pipeline: 1. validate topic; 2. call Workers AI; 3. parse structured
output; 4. validate with shared Zod schema; 5. reject malformed output;
6. persist accepted quiz/questions in D1.

Do not trust model output before validation.

## D. Vectorize

Embed accepted question text and store embeddings in Vectorize.

Use similarity search to identify near-duplicate questions before
accepting/persisting a generated quiz.

Keep this rule deliberately simple. Do not build a RAG system.

Vectorize guarantees semantic similarity only. It does **not** prove
that a trivia answer is factually correct.

## E. Factual correctness limitation

Document explicitly: - `correctAnswerIndex` guarantees one answer is
represented as correct; - Zod guarantees structural consistency; -
neither Zod nor Vectorize proves factual truth; - production trivia
would require stronger grounding/review; - an independent AI critic may
be added only as a stretch goal.

## Questions Claude must be able to answer

-   Why does each datum live where it does?
-   What are D1 transaction limitations relevant to the implementation?
-   Why is KV not primary storage?
-   Why does file data not belong in D1?
-   What does Vectorize add that keyword matching does not?

## Acceptance criteria

-   D1 is provisioned.
-   Drizzle schema and migrations work.
-   At least two migrations exist by the end of the exercise.
-   KV is used only for rebuildable state.
-   AI output is validated before persistence.
-   A malformed AI payload cannot be stored.
-   Vectorize performs a real similarity query.
-   R2 is explicitly documented as not selected, not accidentally
    forgotten.
