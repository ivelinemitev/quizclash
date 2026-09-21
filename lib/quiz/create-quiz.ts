import { env } from "cloudflare:workers";
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { questions, quizzes } from "@/lib/db/schema";
import { findExistingQuizIdForTopic } from "@/lib/db/queries";
import { generateValidatedQuiz, type QuizGenerationFailureReason } from "./generate";

// Swapped from the 70B model, and from `json_schema` to the looser
// `json_object` response format, purely for latency (live-measured:
// json_schema's constrained decoding cost ~3.5s on its own, independent of
// model size; this model is also faster than the 70B one once that's
// removed). QuizSchema still structurally gates output either way — this
// was never a factual-correctness guarantee under either configuration.
const GENERATION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const DUPLICATE_SCORE_THRESHOLD = 0.92;
const RECENT_TOPICS_KEY = "recent-topics";
const RECENT_TOPICS_LIMIT = 10;

async function generateQuestions(topic: string) {
  const result = await env.AI.run(GENERATION_MODEL, {
    messages: [
      {
        role: "system",
        content:
          'You write trivia quiz questions. Respond with ONLY a JSON object of the exact shape {"questions":[{"text":string,"answers":[string,string,string,string],"correctAnswerIndex":0|1|2|3}]}. Always return exactly 5 questions, each with exactly 4 distinct short answers and one zero-based correctAnswerIndex. No prose, no markdown fences.',
      },
      { role: "user", content: `Write exactly 5 trivia questions about the topic: ${topic}` },
    ],
    response_format: { type: "json_object" },
    // Default max_tokens truncated the JSON mid-object (observed live,
    // finish_reason: "length"), leaving unparseable output. 5 questions
    // with 4 short answers each comfortably fits in this budget.
    max_tokens: 1200,
  });

  // JSON Mode only guarantees syntactically valid JSON, not this specific
  // shape. Observed live: `response` is sometimes the already-parsed
  // object, sometimes still the raw JSON string. Handle both; QuizSchema is
  // the real gate regardless of which shape (or garbage) comes back.
  const response = (result as { response: unknown }).response;
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  }
  return response;
}

async function embed(texts: string[]): Promise<number[][]> {
  const result = await env.AI.run(EMBEDDING_MODEL, { text: texts });
  // The ambient type unions in the async (request_id-only) response shape;
  // this call is synchronous, so `data` is always present (verified live).
  return (result as { data: number[][] }).data;
}

// Trims/lowercases so preset topics and custom-typed topics that only
// differ by casing or surrounding whitespace still match the same
// Vectorize metadata filter value.
function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase();
}

async function findNearDuplicate(embedding: number[], topic: string): Promise<boolean> {
  const result = await env.VECTORIZE.query(embedding, {
    topK: 1,
    filter: { topic: normalizeTopic(topic) },
  });
  const best = result.matches[0];
  return Boolean(best && best.score >= DUPLICATE_SCORE_THRESHOLD);
}

async function cacheRecentTopic(topic: string): Promise<void> {
  const raw = await env.CACHE.get(RECENT_TOPICS_KEY);
  const existing: string[] = raw ? JSON.parse(raw) : [];
  const updated = [topic, ...existing.filter((entry) => entry !== topic)].slice(
    0,
    RECENT_TOPICS_LIMIT,
  );
  await env.CACHE.put(RECENT_TOPICS_KEY, JSON.stringify(updated));
}

/**
 * Purely a rebuildable read cache: if KV is cleared or unavailable this
 * returns an empty list and the app stays correct — D1 remains the only
 * source of truth for which quizzes actually exist.
 */
export async function getRecentTopics(): Promise<string[]> {
  try {
    const raw = await env.CACHE.get(RECENT_TOPICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export type CreateQuizOutcome =
  | { ok: true; quizId: number; reused: boolean }
  | { ok: false; reason: QuizGenerationFailureReason };

export async function createQuizForTopic(topic: string): Promise<CreateQuizOutcome> {
  const result = await generateValidatedQuiz(topic, {
    generateQuestions,
    embed,
    findNearDuplicate,
  });

  if (!result.ok) {
    // Regenerating kept landing on content too similar to an existing
    // quiz for this topic — rather than a dead end, reuse one of those
    // existing quizzes instead of failing the create outright. Fresh
    // generation is still always tried first; this is only a fallback.
    if (result.reason === "near_duplicate") {
      const existingQuizId = await findExistingQuizIdForTopic(topic);
      if (existingQuizId !== null) {
        return { ok: true, quizId: existingQuizId, reused: true };
      }
    }
    return result;
  }

  const db = getDb();
  const [insertedQuiz] = await db
    .insert(quizzes)
    .values({ topic, generatedBy: GENERATION_MODEL })
    .returning({ id: quizzes.id });

  // Neither depends on the other's result — both only need `insertedQuiz.id`
  // and the already-validated quiz/embeddings — so they run concurrently.
  await Promise.all([
    db.insert(questions).values(
      result.quiz.questions.map((question, index) => ({
        quizId: insertedQuiz.id,
        position: index,
        text: question.text,
        answer0: question.answers[0],
        answer1: question.answers[1],
        answer2: question.answers[2],
        answer3: question.answers[3],
        correctAnswerIndex: question.correctAnswerIndex,
      })),
    ),
    env.VECTORIZE.upsert(
      result.quiz.questions.map((question, index) => ({
        id: `${insertedQuiz.id}-${index}`,
        values: result.embeddings[index],
        metadata: { quizId: insertedQuiz.id, topic: normalizeTopic(topic) },
      })),
    ),
  ]);

  // Best-effort: the recent-topics cache is disposable and never
  // authoritative, so it never needs to block the response.
  after(() => cacheRecentTopic(topic).catch(() => {}));

  return { ok: true, quizId: insertedQuiz.id, reused: false };
}
