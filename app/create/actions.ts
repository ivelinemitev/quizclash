"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { generateRoomCode } from "@/lib/quiz/mock-data";
import { CreateGameInputSchema } from "@/lib/room/schema";

export type CreateGameActionState = {
  errors?: {
    nickname?: string[];
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

export async function createGameAction(
  _prevState: CreateGameActionState,
  formData: FormData,
): Promise<CreateGameActionState> {
  const result = CreateGameInputSchema.safeParse({
    nickname: formData.get("nickname"),
    topic: formData.get("topic"),
    questionTimeoutSeconds: formData.get("questionTimeoutSeconds"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { nickname, topic, questionTimeoutSeconds } = result.data;
  const ip = (await headers()).get("cf-connecting-ip") ?? "unknown";

  // Imported dynamically (rather than at module scope) so this file has no
  // static dependency on `cloudflare:workers` — it stays loadable, and this
  // validation path stays testable, outside the real Workers runtime.
  const { checkCreateGameRateLimit } = await import("@/lib/security/rate-limit");
  const allowed = await checkCreateGameRateLimit(`create:${ip}`);
  if (!allowed) {
    logAuditEvent({ action: "create_game", actor: nickname, target: "-", outcome: "rate_limited" });
    return {
      formError: "You're creating games too quickly. Please wait a moment and try again.",
    };
  }

  const { createQuizForTopic } = await import("@/lib/quiz/create-quiz");
  const outcome = await createQuizForTopic(topic);

  if (!outcome.ok) {
    logAuditEvent({
      action: "create_game",
      actor: nickname,
      target: "-",
      outcome: outcome.reason,
      details: { topic },
    });
    return { formError: GENERATION_ERROR_MESSAGES[outcome.reason] };
  }

  const code = generateRoomCode();
  const { getRoomStub } = await import("@/lib/rooms/client");
  const joinResult = await getRoomStub(code).join(nickname);

  if (!joinResult.ok) {
    logAuditEvent({ action: "create_game", actor: nickname, target: code, outcome: "join_failed" });
    return { formError: joinResult.error };
  }

  logAuditEvent({
    action: "create_game",
    actor: joinResult.nickname,
    target: code,
    outcome: outcome.reused ? "success_reused_quiz" : "success",
    details: { topic, quizId: outcome.quizId },
  });

  const params = new URLSearchParams({
    nickname: joinResult.nickname,
    playerId: joinResult.playerId,
    topic,
    quizId: String(outcome.quizId),
    questionTimeoutMs: String(questionTimeoutSeconds * 1000),
  });

  redirect(`/room/${code}?${params.toString()}`);
}
