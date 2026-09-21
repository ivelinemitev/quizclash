"use server";

import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";

export type StartGameActionState = {
  formError?: string;
};

export async function startGameAction(
  _prevState: StartGameActionState,
  formData: FormData,
): Promise<StartGameActionState> {
  const roomCode = String(formData.get("roomCode") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const quizId = Number.parseInt(String(formData.get("quizId") ?? ""), 10);
  const questionTimeoutMs = Number.parseInt(String(formData.get("questionTimeoutMs") ?? ""), 10);

  if (!roomCode || !playerId || !Number.isFinite(quizId) || !Number.isFinite(questionTimeoutMs)) {
    return { formError: "Missing room, player, quiz, or timer information." };
  }

  const { getQuizById } = await import("@/lib/db/queries");
  const quiz = await getQuizById(quizId);
  if (!quiz) {
    return { formError: "Could not find the quiz for this room." };
  }

  const { getRoomStub } = await import("@/lib/rooms/client");
  const result = await getRoomStub(roomCode).start(playerId, quiz, quizId, questionTimeoutMs);

  if (!result.ok) {
    logAuditEvent({ action: "start_game", actor: playerId, target: roomCode, outcome: "failed" });
    return { formError: result.error };
  }

  logAuditEvent({ action: "start_game", actor: playerId, target: roomCode, outcome: "success" });
  redirect(`/game/${roomCode}?playerId=${encodeURIComponent(playerId)}`);
}
