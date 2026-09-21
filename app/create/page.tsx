import { CreateForm } from "./create-form";

// Reads a Cloudflare binding (KV) server-side; must not be statically
// prerendered, or Next would execute that read (and fail to resolve
// `cloudflare:workers`) at build time instead of per-request.
export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const { getRecentTopics } = await import("@/lib/quiz/create-quiz");
  const recentTopics = await getRecentTopics();

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-24">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Host a game
        </h1>
        <CreateForm />
        {recentTopics.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recently played topics
            </p>
            <ul className="flex flex-wrap gap-2">
              {recentTopics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-black/[.08] px-3 py-1 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-400"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
