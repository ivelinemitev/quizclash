# 02 --- Cluster B: Routing and Forms

## Course objective

Build routes and forms; know what runs on the server and what runs in
the browser; mutate through Server Actions; validate once with Zod.

## What to build

### 1. Route tree

Use Next.js App Router with: - public routes; - a main `(app)` route
group where appropriate.

Suggested logical routes: - `/` - `/create` - `/join` - `/room/[code]` -
`/game/[code]` - `/results/[code]`

Do not force this exact filesystem if a simpler App Router structure
better satisfies the same behavior.

### 2. Shared Zod form validation

At least one real form must use the same Zod schema on client and
server.

Good candidate: Create Game: - nickname; - topic.

Also validate Join Game: - nickname; - room code.

Demonstrate server enforcement by sending an invalid payload directly
(for example with curl or an equivalent request) and confirming the
server rejects it.

### 3. Server Component

Make the main appropriate data-reading page a Server Component. Data
must be fetched server-side.

Verify in browser devtools that the page is not doing an unnecessary
client-side data fetch.

### 4. Server Actions

Use Server Actions for form mutations. Do not create an API route plus
manual `fetch` merely to submit these forms.

### 5. Loading and error handling

Add: - `loading.tsx` for an async route; - an error boundary; - an
empty/not-found state where useful.

### Authentication

Authentication is explicitly out of scope for QuizClash. Players are
temporary nicknames within a room.

## Questions Claude must be able to answer after implementation

-   For every interactive component, why is it server or client?
-   Where does each validation rule run?
-   What happens to the UI during a slow/flaky async operation?

## Acceptance criteria

-   App Router is used correctly.
-   At least one shared schema demonstrably rejects invalid input on
    both sides.
-   Server Actions handle mutations.
-   A server-rendered data path exists.
-   Loading and error states are visible/testable.
-   Claude documents server/client component decisions in `PROGRESS.md`.
