import Link from "next/link";
import { GameBoard } from "./game-board";

type GamePageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ playerId?: string }>;
};

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { code } = await params;
  const { playerId } = await searchParams;

  if (!playerId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Missing player</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Go back to the room to rejoin before playing.
          </p>
          <Link
            href={`/room/${code}`}
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Back to room
          </Link>
        </main>
      </div>
    );
  }

  const { getRoomStub } = await import("@/lib/rooms/client");
  const state = await getRoomStub(code).getPublicState();

  if (state.status === "finished") {
    // Covers landing here after the room finished via the timeout alarm
    // (no player's own answer triggered the D1 persist in that case).
    const { finalizeGameAction } = await import("./actions");
    await finalizeGameAction(code);

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Game finished</h1>
          <Link
            href={`/results/${code}`}
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            View results
          </Link>
        </main>
      </div>
    );
  }

  if (state.status !== "playing" || !state.currentQuestion || state.quizId === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Game hasn&apos;t started yet
          </h1>
          <Link
            href={`/room/${code}`}
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Back to room
          </Link>
        </main>
      </div>
    );
  }

  const nickname = state.players.find((player) => player.id === playerId)?.nickname ?? "Player";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col gap-6 px-6 py-24">
        <GameBoard
          code={code}
          playerId={playerId}
          nickname={nickname}
          initialQuestionIndex={state.currentQuestionIndex}
          totalQuestions={state.totalQuestions}
          initialQuestion={state.currentQuestion}
          initialScore={state.scores[playerId] ?? 0}
          initialQuestionDeadline={state.currentQuestionDeadline}
        />
      </main>
    </div>
  );
}
