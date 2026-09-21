# 07 --- Final Verification and Walkthrough

## Required final artifacts

The course wrap expects three outcomes:

### 1. A working application

Deploy QuizClash and verify: - create a quiz by topic; - receive five
structurally valid questions; - create a room; - join from at least one
second client; - start; - answer all five questions; -
concurrent/replayed answers do not double-score; - show final ranking; -
persist final result.

### 2. Notes to review

Create `docs/NOTES.md` containing: - what surprised you; - what broke; -
what you initially misunderstood; - what you would change in
production; - known AI factual-correctness limitation; - what was
intentionally excluded due to the 2--3 day timebox.

### 3. Short architecture walkthrough

README must contain an architecture diagram and enough explanation to
present it from memory.

The walkthrough must explain:

-   Next.js App Router and server/client boundaries.
-   Server Actions and shared Zod validation.
-   Cloudflare Workers runtime.
-   D1 as durable relational source of truth.
-   KV as disposable/rebuildable cache.
-   Durable Object as single-writer coordinator for an active room.
-   Workers AI as quiz generator.
-   Vectorize as semantic duplicate detection, not factual verification.
-   Queue as retryable post-game work, if completed.

## Architecture diagram target

``` text
Browser(s)
    |
Next.js / Server Actions
    |
Cloudflare runtime
    |
    +---- Workers AI ----> Zod validation ----> Vectorize duplicate check
    |                                             |
    |                                             v
    |                                             D1
    |
    +---- Durable Object: Room <---- players submit answers
    |             |
    |             +---- final durable result ----> D1
    |                                             |
    |                                             +---- Queue (stretch)
    |                                                     |
    |                                                     v
    +-----------------------------------------------> KV cache
```

## Final reviewer questions

Be ready to answer: 1. Why is an active room in a Durable Object instead
of D1 or KV? 2. Why can KV be deleted without corrupting the
application? 3. How do retries avoid double-scoring? 4. What validates
AI output? 5. What is and is not guaranteed about factual correctness?
6. Why was R2 excluded? 7. Why was Cron excluded? 8. Which components
are Server Components and which are Client Components? 9. What would
fail if a Node-only dependency were introduced? 10. What happens if
Workers AI or the Queue is temporarily unavailable?

## Done

Only mark the project complete when: - deployment works; - checks/tests
pass; - README architecture diagram exists; - NOTES exists; - known
limitations are explicit; - `PROGRESS.md` has no unresolved core
acceptance criteria.
