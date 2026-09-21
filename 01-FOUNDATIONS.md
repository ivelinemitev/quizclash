# 01 --- Part 1: Foundations

## Objective

Build the local application foundation before Cloudflare-specific
persistence or multiplayer coordination.

## Scope

-   TypeScript
-   React
-   Next.js
-   basic UI
-   shared domain types
-   local mock quiz data only

## Build

Create the minimal pages/components needed to demonstrate the product
locally: - Home - Create Game - Join Game - Room/Lobby - Game - Results

At this phase, room/game data may be mocked or in-memory for UI
development. Do not implement D1, KV, Durable Objects, Queues, Workers
AI, or Vectorize yet.

## Domain rules

-   2--6 players per room.
-   5 questions per quiz.
-   4 answers per question.
-   one `correctAnswerIndex`.
-   one submitted answer per player per question.
-   correct = 1 point.
-   five questions complete the game.

## Question schema

Create a shared Zod schema that can later be reused by AI generation and
server-side validation.

It must reject: - fewer/more than 5 questions; - fewer/more than 4
answers; - empty question/answer text; - duplicate answers within a
question; - correct index outside 0--3.

## UI principle

Keep the interface intentionally small. This is a technical exercise,
not a design-system project.

## Acceptance criteria

-   Project runs locally.
-   TypeScript is strict and passes.
-   A mocked five-question quiz can be rendered end-to-end.
-   Shared question schema has tests for valid and invalid payloads.
-   No Cloudflare service is introduced in this phase.
