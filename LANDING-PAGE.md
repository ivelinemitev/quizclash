# Landing Page --- Modernized Home Route

## Status

Addition to the project, not part of the `00`--`07` phase sequence.
Read alongside `CLAUDE.md`/`ARCHITECTURE.md`/`01-FOUNDATIONS.md` --
those remain the source of truth for anything this spec doesn't
explicitly override.

## Objective

Replace the current bare `app/page.tsx` hero (product name + two
buttons) with a more polished, modern landing page that still gets a
visitor to Create or Join within one click. This is a deliberate,
scoped exception to `01-FOUNDATIONS.md`'s "keep the interface
intentionally small... this is a technical exercise, not a
design-system project" --- not a green light to turn QuizClash into a
marketing site.

## Relationship to project scope

- This is an **addition** to the original `00`--`07` sequence, not a
  replacement of any Cloudflare-learning objective. `CLAUDE.md`'s core
  mission (Cloudflare building blocks) is unaffected --- this spec only
  touches the presentational Home route.
- No new npm dependencies: no animation library, no icon library, no
  UI kit. Tailwind utility classes only, matching what `/create`,
  `/join`, `/room/[code]`, `/game/[code]`, and `/results/[code]`
  already use.
- Does not change, and is not blocked by, anything in Phase 07
  (`07-FINAL-VERIFICATION.md`). The architecture diagram/walkthrough
  that phase requires stays in the README, not on this page.

## Scope

Single route: `app/page.tsx`. Stays a **Server Component** --- no new
Client Component boundary, no new "use client" file introduced by this
spec.

Content, top to bottom:

1. **Hero** --- product name, one short value-proposition line, and the
   two existing calls to action (Host a game / Join a game), styled
   more deliberately than the current centered-text-and-two-buttons
   layout (larger type, tighter hierarchy, a bit of breathing room) but
   still no hero image/illustration.
2. **How it works** --- 3--4 short steps as a plain numbered list (e.g.
   "Host picks a topic and creates a room" -> "Share the room code" ->
   "Everyone answers 5 questions" -> "See the final ranking"). No
   icon set, no illustrated step graphics.
3. **"Built on Cloudflare" strip** --- one line naming the stack
   (Workers, D1, Durable Objects, Workers AI) as a nod to this being a
   learning exercise, not a sales pitch. No logos to source; text only.
4. **Closing CTA** --- repeats the same Host/Join buttons so a visitor
   who scrolled past the hero still has an obvious next step.

Must keep working dark/light mode via the same `dark:` Tailwind
classes already used throughout the app (see `app/create/page.tsx` /
`app/room/[code]/page.tsx` for the established color pattern:
`zinc-50`/`black` backgrounds, `zinc-500`/`zinc-400` secondary text).

## Non-goals

- No testimonials, pricing, blog, customer logos, or social proof
  placeholders.
- No photos, illustrations, or video.
- No animation library (no Framer Motion, GSAP, etc.) and no
  hand-rolled scroll/parallax effects.
- No icon library (no Lucide, Heroicons, etc.) --- if a visual accent
  is truly needed, use plain typography/borders, consistent with how
  the rest of the app already looks.
- No new design-token system, no new color palette --- reuse what
  already exists.
- No SEO/meta-tag deep-dive beyond what `app/layout.tsx` already
  provides.
- No real gameplay screenshots or GIFs in this pass (see "Explicitly
  out of scope" below).

## Acceptance criteria

- `app/page.tsx` remains a Server Component.
- No new entries added to `package.json` dependencies/devDependencies.
- `/` still links directly to `/create` and `/join`, with no
  additional steps, modal, or scroll-gate in front of those links.
- `npm run typecheck`, `npm run lint`, and `npm run build` all still
  pass with no changes needed elsewhere.
- Visibly more considered than the current hero when viewed in a
  browser, in both light and dark mode.
- Fits in roughly one viewport-and-a-bit of scroll on a typical desktop
  width --- this is a quick, confident landing moment, not a long
  scroll-driven marketing page.

## Explicitly out of scope for this spec

- Real screenshots or short clips of actual gameplay (`/room`,
  `/game`, `/results`) --- would need to be captured from the live app;
  a reasonable follow-up once this page's layout is settled, not part
  of this pass.
- Any change to `/create`, `/join`, `/room/[code]`, `/game/[code]`, or
  `/results/[code]` --- this spec is scoped to `/` only.
- Any new shared layout/header/footer component used across other
  routes --- if a footer is added here, it stays local to this page.

## Open questions for whoever implements this

- Exact copy for the value-proposition line and the "how it works"
  steps --- draft reasonable copy during implementation; it doesn't
  need sign-off beyond matching the tone already used elsewhere in the
  app (see `app/page.tsx`'s current one-liner and `PROGRESS.md` for
  the project's own voice).
- Whether the "Built on Cloudflare" strip is worth keeping once the
  page is actually built and viewed --- treat it as optional polish,
  drop it if it feels like clutter in practice.
