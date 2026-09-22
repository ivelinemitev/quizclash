"use server";

import { logAuditEvent } from "@/lib/audit/log";

export type SubmitAnswerActionResult =
  | {
      ok: true;
      correct: boolean;
      correctAnswerIndex: number;
      score: number;
      roomFinished: boolean;
    }
  | { ok: false; error: string };

/**
 * The single place D1/Queue persistence for a finished game is triggered
 * from — called whenever *any* caller (a player's own answer completing
 * the last question, or a client's poll noticing the room finished via
 * the Durable Object's timeout alarm, which has no HTTP caller of its own
 * to react from) sees the room is finished. Safe to call as often as
 * needed: `claimResults()` on the DO only ever returns the ranking once.
 */
export async function finalizeGameAction(roomCode: string): Promise<void> {
  try {
    const { getRoomStub } = await import("@/lib/rooms/client");
    const claim = await getRoomStub(roomCode).claimResults();
    if (!claim) return; // Not finished yet, or already persisted — no-op.

    const { persistCompletedGame } = await import("@/lib/db/queries");
    const { finishedAt } = await persistCompletedGame({
      roomCode,
      quizId: claim.quizId,
      ranking: claim.ranking,
    });

    // Only the finish is audit-logged here, not every per-question answer —
    // that would be noise rather than an "important mutation."
    logAuditEvent({
      action: "finish_game",
      actor: "system",
      target: roomCode,
      outcome: "success",
      details: { ranking: claim.ranking },
    });

    const { env } = await import("cloudflare:workers");
    await env.POST_GAME.send({
      roomCode,
      quizId: claim.quizId,
      ranking: claim.ranking,
      finishedAt,
    });
  } catch {
    // Best-effort: the completed game is already authoritative in the
    // Durable Object; a D1/Queue hiccup here must not turn a real finished
    // game into an error for the player. A later call (another poll, a
    // retry) will pick it back up since `claimResults` hasn't succeeded yet.
  }
}

export async function submitAnswerAction(
  roomCode: string,
  playerId: string,
  questionIndex: number,
  answerIndex: number,
  idempotencyKey: string,
): Promise<SubmitAnswerActionResult> {
  const { getRoomStub } = await import("@/lib/rooms/client");
  const result = await getRoomStub(roomCode).submitAnswer(
    playerId,
    questionIndex,
    answerIndex,
    idempotencyKey,
  );

  if (!result.ok) {
    logAuditEvent({
      action: "submit_answer",
      actor: playerId,
      target: roomCode,
      outcome: "failed",
      details: { questionIndex, error: result.error },
    });
    return result;
  }

  logAuditEvent({
    action: "submit_answer",
    actor: playerId,
    target: roomCode,
    outcome: result.correct ? "correct" : "incorrect",
    details: { questionIndex, score: result.score },
  });

  if (result.roomFinished) {
    await finalizeGameAction(roomCode);
  }

  return {
    ok: true,
    correct: result.correct,
    correctAnswerIndex: result.correctAnswerIndex,
    score: result.score,
    roomFinished: result.roomFinished,
  };
}
