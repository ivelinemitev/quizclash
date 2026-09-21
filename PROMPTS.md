# Claude Code --- Step-by-Step Prompts

## Step 0 --- Architecture review only

``` text
Read CLAUDE.md, ARCHITECTURE.md, 00-PROJECT-SCOPE.md and PROGRESS.md.

Do not write application code.

Review the locked architecture against the current repository and the 2–3 day timebox.

Verify especially:
- Next.js App Router on Cloudflare Workers;
- current Wrangler + vinext deployment path;
- D1/Drizzle ownership;
- Durable Object multiplayer ownership;
- Workers AI + Vectorize role;
- KV as rebuildable cache;
- Queue as non-critical/stretch work.

Do not expand scope and do not replace technologies.

Return only:
1. blockers;
2. ambiguities that genuinely require a decision;
3. complexity risks;
4. minimal implementation order;
5. any current Cloudflare compatibility concern that should be verified before coding.

Stop and wait.
```

## Step 1 and later

For every phase prompt, begin with:

``` text
Read CLAUDE.md, ARCHITECTURE.md, 00-PROJECT-SCOPE.md, PROGRESS.md, and the current phase specification.

Implement only the current phase.
Before coding, state a short plan and report any conflict with ARCHITECTURE.md.
After implementation run checks/tests, verify acceptance criteria, update PROGRESS.md, and stop.
```
