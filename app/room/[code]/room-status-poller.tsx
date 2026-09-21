"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { finalizeGameAction } from "@/app/game/[code]/actions";

type RoomStatusResponse = {
  status: "lobby" | "playing" | "finished" | "ended";
};

/**
 * Used on both `/room/[code]` (the lobby) and `/results/[code]` (waiting
 * for the host to start another round) — both are Server Components that
 * fetch state once per request, so nothing else would notice a player
 * joining, the host starting a round, or the host starting a *next* round
 * on the same room. This polls in the background: while the room is still
 * "lobby" or "finished" it calls `router.refresh()` on no-op ticks (so the
 * server-rendered player list/results stay live), and navigates instead
 * the moment it actually observes a transition (into "playing", or into
 * "finished" for the first time while this viewer was still in "lobby").
 * Never mounted/polls once the room is "ended" — that's terminal, nothing
 * left to wait for.
 */
export function RoomStatusPoller({
  code,
  playerId,
  initialStatus,
}: {
  code: string;
  playerId: string;
  initialStatus: "lobby" | "playing" | "finished" | "ended";
}) {
  const router = useRouter();

  useEffect(() => {
    if (initialStatus === "playing" || initialStatus === "ended") return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/room/${code}/status`);
      const state = (await response.json()) as RoomStatusResponse;

      if (state.status === "playing") {
        router.push(`/game/${code}?playerId=${encodeURIComponent(playerId)}`);
      } else if (state.status === "finished" && initialStatus === "lobby") {
        await finalizeGameAction(code);
        router.push(`/results/${code}?playerId=${encodeURIComponent(playerId)}`);
      } else {
        router.refresh();
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [initialStatus, code, playerId, router]);

  return null;
}
