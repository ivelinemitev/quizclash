"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { finalizeGameAction } from "@/app/game/[code]/actions";

type RoomStatusResponse = {
  status: "lobby" | "playing" | "finished";
};

/**
 * Rendered for a would-be player who tried to join while the room's game
 * was already playing/finished — they have no playerId and were never
 * added to `state.players`, so they just wait here until the current game
 * ends and land on the results page, same as everyone who actually played.
 */
export function LateJoinWaiter({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/room/${code}/status`);
      const state = (await response.json()) as RoomStatusResponse;

      if (state.status === "finished") {
        await finalizeGameAction(code);
        router.push(`/results/${code}`);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [code, router]);

  return null;
}
