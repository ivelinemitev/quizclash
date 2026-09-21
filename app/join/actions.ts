"use server";

import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { JoinGameInputSchema } from "@/lib/room/schema";

export type JoinGameActionState = {
  errors?: {
    nickname?: string[];
    roomCode?: string[];
  };
  formError?: string;
};

export async function joinGameAction(
  _prevState: JoinGameActionState,
  formData: FormData,
): Promise<JoinGameActionState> {
  const result = JoinGameInputSchema.safeParse({
    nickname: formData.get("nickname"),
    roomCode: formData.get("roomCode"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { nickname, roomCode } = result.data;
  const { getRoomStub } = await import("@/lib/rooms/client");
  const joinResult = await getRoomStub(roomCode).join(nickname);

  if (!joinResult.ok) {
    logAuditEvent({
      action: "join_room",
      actor: nickname,
      target: roomCode,
      outcome: joinResult.reason,
    });

    if (joinResult.reason === "not_joinable") {
      // The game is already playing or finished — send them to the room
      // page's holding view instead of a dead-end error. No playerId is
      // issued, so they're never added to `state.players`/`state.scores`
      // and can't affect the in-progress question's answer tally.
      const params = new URLSearchParams({ nickname });
      redirect(`/room/${roomCode}?${params.toString()}`);
    }

    return { formError: joinResult.error };
  }

  logAuditEvent({
    action: "join_room",
    actor: joinResult.nickname,
    target: roomCode,
    outcome: "success",
  });

  const params = new URLSearchParams({
    nickname: joinResult.nickname,
    playerId: joinResult.playerId,
  });
  redirect(`/room/${roomCode}?${params.toString()}`);
}
