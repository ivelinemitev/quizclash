import Link from "next/link";

const STEPS = [
  "Host picks a topic and creates a room",
  "Share the room code with everyone playing",
  "Everyone answers the same 5 questions",
  "See the final ranking as soon as question 5 ends",
];

const FEATURES = [
  {
    title: "5 questions, no fluff",
    description: "Every game is exactly 5 questions, so it never drags.",
  },
  {
    title: "AI-generated topics",
    description: "Pick any topic — a fresh quiz is written for you on the spot.",
  },
  {
    title: "2-6 players",
    description: "Quick pickup games with friends, no accounts needed.",
  },
  {
    title: "Live scoring",
    description: "Answers are scored the moment everyone's in, no waiting around.",
  },
];

// This page runs a fixed dark theme throughout (matching its own hero
// illustration), unlike the rest of the app, which still follows system
// light/dark mode via `dark:` classes.
function CtaButtons() {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row">
      <Link
        href="/create"
        className="flex h-12 flex-1 items-center justify-center rounded-full bg-zinc-50 px-5 font-medium text-black transition-colors hover:bg-zinc-300"
      >
        Host a game
      </Link>
      <Link
        href="/join"
        className="flex h-12 flex-1 items-center justify-center rounded-full border border-white/20 px-5 font-medium text-zinc-50 transition-colors hover:bg-white/10"
      >
        Join a game
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-black font-sans">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-black/20 px-6 py-4 backdrop-blur-sm">
        <span className="text-lg font-semibold tracking-tight text-zinc-50">QuizClash</span>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/join" className="text-zinc-300 transition-colors hover:text-white">
            Join a game
          </Link>
          <Link
            href="/create"
            className="flex h-9 items-center justify-center rounded-full bg-zinc-50 px-4 text-black transition-colors hover:bg-zinc-300"
          >
            Host a game
          </Link>
        </nav>
      </header>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <img
          src="/hero-background.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            Live trivia, ready in seconds
          </h1>
          <p className="max-w-md text-lg text-zinc-300">
            QuizClash is a quick multiplayer quiz game. Pick a topic, share a
            room code, and race through 5 questions with 2-6 players.
          </p>
          <CtaButtons />
        </div>

        <div
          aria-hidden
          className="animate-bounce absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-500"
        >
          ↓
        </div>
      </section>

      <div className="relative flex flex-1 justify-center overflow-hidden">
        {/* Ambient continuation of the hero illustration — same asset, no
            new image — so the page reads as one world instead of a hard
            cut into flat black. Scaled up and heavily blurred/darkened. */}
        <img
          src="/hero-background.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.12] blur-3xl"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(167,139,250,0.16),_transparent_70%)]"
        />

        <main className="relative z-10 flex w-full max-w-6xl flex-col gap-20 px-6 py-20 sm:px-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-2 rounded-xl border border-violet-400/20 bg-white/[0.03] p-6 shadow-[0_0_30px_-15px_rgba(167,139,250,0.6)] transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]"
              >
                <p className="font-medium text-zinc-50">{feature.title}</p>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            <h2 className="text-sm font-medium tracking-wide text-zinc-400 uppercase">
              How it works
            </h2>
            <ol className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/10 text-sm font-semibold text-violet-300 shadow-[0_0_16px_-4px_rgba(167,139,250,0.7)]">
                    {index + 1}
                  </span>
                  <span className="text-zinc-50">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
            <p className="rounded-full border border-violet-400/20 bg-white/[0.03] px-4 py-2 text-center text-xs text-zinc-400">
              Built on Cloudflare Workers, D1, Durable Objects, and Workers AI
              — a learning exercise, not a product.
            </p>
            <CtaButtons />
          </div>
        </main>
      </div>
    </div>
  );
}
