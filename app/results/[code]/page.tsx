import { redirect } from "next/navigation";
import Link from "next/link";
import { RoomStatusPoller } from "@/app/room/[code]/room-status-poller";
import { endGameAction } from "./actions";
import { EndedRedirect } from "./ended-redirect";
import { NextRoundForm } from "./next-round-form";

type ResultsPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nickname?: string; playerId?: string }>;
};

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { code } = await params;
  const { nickname, playerId } = await searchParams;

  const { getLatestResultsForRoom } = await import("@/lib/db/queries");
  const results = await getLatestResultsForRoom(code);

  if (!results) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex w-full max-w-sm flex-col gap-4 px-6 py-24 text-center">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            No completed game found for this room
          </h1>
          <Link
            href="/create"
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Host a new game
          </Link>
        </main>
      </div>
    );
  }

  let isHost = false;
  let roomStatus: "lobby" | "playing" | "finished" | "ended" = "finished";
  if (playerId) {
    const { getRoomStub } = await import("@/lib/rooms/client");
    const state = await getRoomStub(code).getPublicState();

    // A slow/reloading client can land here after the host already started
    // the next round — send them straight to it instead of showing a stale
    // "waiting" view for a round that's already moved on.
    if (state.status === "playing") {
      redirect(`/game/${code}?playerId=${encodeURIComponent(playerId)}`);
    }
    isHost = playerId === state.hostPlayerId;
    roomStatus = state.status;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {playerId && roomStatus !== "ended" ? (
        <RoomStatusPoller code={code} playerId={playerId} initialStatus={roomStatus} />
      ) : null}
      <main className="flex w-full max-w-sm flex-col gap-6 px-6 py-24">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Room {code} - {results.topic}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Results
          </h1>
        </div>
        <ol className="flex flex-col gap-2">
          {results.ranking.map((player) => (
            <li
              key={player.nickname}
              className="flex items-center justify-between rounded-md border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:text-zinc-50"
            >
              <span>
                {player.rank}. {player.nickname}
                {player.nickname === nickname ? " (you)" : ""}
              </span>
              <span className="font-medium">{player.score} pts</span>
            </li>
          ))}
        </ol>
        {roomStatus === "ended" && playerId ? (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              The host ended this game. Thanks for playing!
            </p>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Back to home
            </Link>
            <EndedRedirect seconds={5} />
          </div>
        ) : isHost && playerId ? (
          <>
            <NextRoundForm roomCode={code} playerId={playerId} />
            <form action={endGameAction}>
              <input type="hidden" name="roomCode" value={code} />
              <input type="hidden" name="playerId" value={playerId} />
              <button
                type="submit"
                className="w-full text-center text-sm text-zinc-500 underline transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                End game for everyone
              </button>
            </form>
          </>
        ) : playerId ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Waiting for the host to start the next round...
          </p>
        ) : (
          <Link
            href="/create"
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-5 font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Host a new game
          </Link>
        )}
      </main>
    </div>
  );
}
