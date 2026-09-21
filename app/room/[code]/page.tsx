import Link from "next/link";
import { LateJoinWaiter } from "./late-join-waiter";
import { RoomStatusPoller } from "./room-status-poller";
import { StartGameForm } from "./start-game-form";

type RoomPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    nickname?: string;
    playerId?: string;
    topic?: string;
    quizId?: string;
    questionTimeoutMs?: string;
  }>;
};

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { code } = await params;
  const { playerId, nickname, topic, quizId, questionTimeoutMs } = await searchParams;

  const { getRoomStub } = await import("@/lib/rooms/client");
  const state = await getRoomStub(code).getPublicState();

  if (!playerId) {
    if (state.status === "playing") {
      // Joined too late to play this round — wait here rather than being
      // dropped mid-question; they were never added as a scored player.
      return (
        <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
          <LateJoinWaiter code={code} />
          <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              A game is already in progress
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {nickname ? `Hang tight, ${nickname} — ` : ""}this room&apos;s current game is
              still playing. You&apos;ll land on the results as soon as it finishes.
            </p>
          </main>
        </div>
      );
    }

    if (state.status === "finished" || state.status === "ended") {
      const { finalizeGameAction } = await import("@/app/game/[code]/actions");
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

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            You haven&apos;t joined this room
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Use the &ldquo;Join a game&rdquo; link with this room&apos;s code to get a player ID.
          </p>
          <Link
            href="/join"
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Join a game
          </Link>
        </main>
      </div>
    );
  }

  const isHost = playerId === state.hostPlayerId;
  const gameHref = `/game/${code}?playerId=${encodeURIComponent(playerId)}`;
  const parsedQuizId = quizId ? Number.parseInt(quizId, 10) : null;
  const parsedQuestionTimeoutMs = questionTimeoutMs ? Number.parseInt(questionTimeoutMs, 10) : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <RoomStatusPoller code={code} playerId={playerId} initialStatus={state.status} />
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-24">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Room code</p>
          <p className="text-4xl font-semibold tracking-widest text-black dark:text-zinc-50">
            {code}
          </p>
          {topic ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Topic: {topic}</p>
          ) : null}
          {parsedQuestionTimeoutMs !== null ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Time per question: {Math.round(parsedQuestionTimeoutMs / 1000)}s
            </p>
          ) : null}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Players ({state.players.length})
          </p>
          <ul className="flex flex-col gap-1">
            {state.players.map((player) => (
              <li
                key={player.id}
                className="rounded-md border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
              >
                {player.nickname}
                {player.id === playerId ? (player.id === state.hostPlayerId ? " (you, host)" : " (you)") : ""}
              </li>
            ))}
          </ul>
        </div>

        {state.status === "lobby" && isHost && parsedQuizId !== null && parsedQuestionTimeoutMs !== null ? (
          <StartGameForm
            roomCode={code}
            playerId={playerId}
            quizId={parsedQuizId}
            questionTimeoutMs={parsedQuestionTimeoutMs}
          />
        ) : null}
        {state.status === "lobby" && !isHost ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Waiting for the host to start the game...
          </p>
        ) : null}
        {state.status === "playing" ? (
          <Link
            href={gameHref}
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Rejoin game in progress
          </Link>
        ) : null}
        {state.status === "finished" || state.status === "ended" ? (
          <Link
            href={`/results/${code}?playerId=${encodeURIComponent(playerId)}`}
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            View results
          </Link>
        ) : null}
      </main>
    </div>
  );
}
