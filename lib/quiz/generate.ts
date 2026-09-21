import { QuizSchema, type Question, type Quiz } from "./schema";

/**
 * The generation model reliably writes the correct answer first — a common
 * LLM bias, not something a prompt instruction fixes reliably. Shuffling
 * server-side guarantees a uniform random position regardless of model
 * behavior. `random` is injectable (defaults to `Math.random`) so tests can
 * assert exact permutations instead of relying on statistical sampling.
 */
export function shuffleAnswers(question: Question, random: () => number = Math.random): Question {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const answers = order.map((i) => question.answers[i]) as Question["answers"];
  const correctAnswerIndex = order.indexOf(
    question.correctAnswerIndex,
  ) as Question["correctAnswerIndex"];

  return { ...question, answers, correctAnswerIndex };
}

export type QuizGenerationDeps = {
  generateQuestions: (topic: string) => Promise<unknown>;
  embed: (texts: string[]) => Promise<number[][]>;
  findNearDuplicate: (embedding: number[], topic: string) => Promise<boolean>;
};

export type QuizGenerationFailureReason = "ai_unavailable" | "invalid_ai_output" | "near_duplicate";

export type QuizGenerationResult =
  | { ok: true; quiz: Quiz; embeddings: number[][] }
  | { ok: false; reason: QuizGenerationFailureReason };

/**
 * Never trusts raw AI output: it is only accepted once it parses against the
 * same QuizSchema used for validation elsewhere, and only once none of its
 * question embeddings look like a near-duplicate of an already-stored one.
 */
export async function generateValidatedQuiz(
  topic: string,
  deps: QuizGenerationDeps,
): Promise<QuizGenerationResult> {
  let raw: unknown;
  try {
    raw = await deps.generateQuestions(topic);
  } catch {
    return { ok: false, reason: "ai_unavailable" };
  }

  const candidate = {
    topic,
    questions: (raw as { questions?: unknown } | undefined)?.questions,
  };
  const parsed = QuizSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_ai_output" };
  }

  const quiz: Quiz = {
    ...parsed.data,
    questions: parsed.data.questions.map((question) => shuffleAnswers(question)),
  };

  let embeddings: number[][];
  try {
    embeddings = await deps.embed(quiz.questions.map((question) => question.text));
  } catch {
    return { ok: false, reason: "ai_unavailable" };
  }

  // Checked concurrently rather than in a sequential loop — these are 5
  // independent Vectorize queries with no dependency on each other.
  const duplicateChecks = await Promise.all(
    embeddings.map((embedding) => deps.findNearDuplicate(embedding, topic)),
  );
  if (duplicateChecks.some(Boolean)) {
    return { ok: false, reason: "near_duplicate" };
  }

  return { ok: true, quiz, embeddings };
}
