"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { NextRoundInputSchema } from "@/lib/room/schema";

export type StartNextRoundActionState = {
  errors?: {
    topic?: string[];
    questionTimeoutSeconds?: string[];
  };
  formError?: string;
};

const GENERATION_ERROR_MESSAGES = {
  ai_unavailable: "AI is temporarily unavailable. Please try again in a moment.",
  invalid_ai_output: "Could not generate a valid quiz for this topic. Please try again.",
  near_duplicate:
    "These questions look too similar to an existing quiz. Try a different topic, or try again.",
} as const;

export async function startNextRoundAction(
  _prevState: StartNextRoundActionState,
  formData: FormData,
): Promise<StartNextRoundActionState> {
  const result = NextRoundInputSchema.safeParse({
    roomCode: formData.get("roomCode"),
    playerId: formData.get("playerId"),
    topic: formData.get("topic"),
    questionTimeoutSeconds: formData.get("questionTimeoutSeconds"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { roomCode, playerId, topic, questionTimeoutSeconds } = result.data;
  const ip = (await headers()).get("cf-connecting-ip") ?? "unknown";

  // Same rate limit as the initial /create flow — this still triggers a
  // real AI generation call (or the reuse fallback), so it needs the same
  // protection against being hammered.
  const { checkCreateGameRateLimit } = await import("@/lib/security/rate-limit");
  const allowed = await checkCreateGameRateLimit(`create:${ip}`);
  if (!allowed) {
    logAuditEvent({
      action: "start_next_round",
      actor: playerId,
      target: roomCode,
      outcome: "rate_limited",
    });
    return {
      formError: "You're creating games too quickly. Please wait a moment and try again.",
    };
  }

  const { createQuizForTopic } = await import("@/lib/quiz/create-quiz");
  const outcome = await createQuizForTopic(topic);

  if (!outcome.ok) {
    logAuditEvent({
      action: "start_next_round",
      actor: playerId,
      target: roomCode,
      outcome: outcome.reason,
      details: { topic },
    });
    return { formError: GENERATION_ERROR_MESSAGES[outcome.reason] };
  }

  const { getQuizById } = await import("@/lib/db/queries");
  const quiz = await getQuizById(outcome.quizId);
  if (!quiz) {
    return { formError: "Could not load the generated quiz. Please try again." };
  }

  const { getRoomStub } = await import("@/lib/rooms/client");
  const startResult = await getRoomStub(roomCode).start(
    playerId,
    quiz,
    outcome.quizId,
    questionTimeoutSeconds * 1000,
  );

  if (!startResult.ok) {
    logAuditEvent({
      action: "start_next_round",
      actor: playerId,
      target: roomCode,
      outcome: "start_failed",
    });
    return { formError: startResult.error };
  }

  logAuditEvent({
    action: "start_next_round",
    actor: playerId,
    target: roomCode,
    outcome: outcome.reused ? "success_reused_quiz" : "success",
    details: { topic, quizId: outcome.quizId },
  });

  redirect(`/game/${roomCode}?playerId=${encodeURIComponent(playerId)}`);
}

export async function endGameAction(formData: FormData): Promise<void> {
  const roomCode = String(formData.get("roomCode") ?? "");
  const playerId = String(formData.get("playerId") ?? "");

  if (!roomCode || !playerId) return;

  const { getRoomStub } = await import("@/lib/rooms/client");
  const result = await getRoomStub(roomCode).endGame(playerId);

  logAuditEvent({
    action: "end_game",
    actor: playerId,
    target: roomCode,
    outcome: result.ok ? "success" : "failed",
  });

  // Re-render the same results page either way — on success it now shows
  // the "ended" state; on failure (e.g. a non-host somehow submitted this)
  // it just shows the same view again, same as before the attempt.
  redirect(`/results/${roomCode}?playerId=${encodeURIComponent(playerId)}`);
}
