import { asc, desc, eq, sql } from "drizzle-orm";
import type { Quiz } from "@/lib/quiz/schema";
import { getDb } from "./client";
import { completedGames, gameResults, questions, quizzes } from "./schema";

/**
 * Used as a fallback when generating a fresh quiz for a topic keeps
 * hitting the near-duplicate check (common for narrow, well-known topics
 * where the model gravitates toward the same handful of facts). Matches
 * case/whitespace-insensitively, same normalization as the Vectorize
 * topic filter. Picks randomly among matches so repeat plays of a topic
 * with multiple stored quizzes don't always land on the same one.
 */
export async function findExistingQuizIdForTopic(topic: string): Promise<number | null> {
  const db = getDb();
  const normalized = topic.trim().toLowerCase();

  const [match] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(sql`lower(trim(${quizzes.topic})) = ${normalized}`)
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return match?.id ?? null;
}

export async function getQuizById(quizId: number): Promise<Quiz | null> {
  const db = getDb();

  const [quizRow] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
  if (!quizRow) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.position));

  return {
    topic: quizRow.topic,
    questions: questionRows.map((row) => ({
      text: row.text,
      answers: [row.answer0, row.answer1, row.answer2, row.answer3],
      correctAnswerIndex: row.correctAnswerIndex as 0 | 1 | 2 | 3,
    })),
  };
}

export type RankingEntry = { nickname: string; score: number; rank: number };

export async function persistCompletedGame(input: {
  roomCode: string;
  quizId: number;
  ranking: RankingEntry[];
}): Promise<{ gameId: number; finishedAt: string }> {
  const db = getDb();
  const finishedAt = new Date().toISOString();

  const [game] = await db
    .insert(completedGames)
    .values({ roomCode: input.roomCode, quizId: input.quizId, finishedAt })
    .returning({ id: completedGames.id });

  await db.insert(gameResults).values(
    input.ranking.map((entry) => ({
      gameId: game.id,
      nickname: entry.nickname,
      score: entry.score,
      rank: entry.rank,
    })),
  );

  return { gameId: game.id, finishedAt };
}

export async function getLatestResultsForRoom(
  roomCode: string,
): Promise<{ topic: string; ranking: RankingEntry[] } | null> {
  const db = getDb();

  const [game] = await db
    .select({ id: completedGames.id, quizId: completedGames.quizId })
    .from(completedGames)
    .where(eq(completedGames.roomCode, roomCode))
    .orderBy(desc(completedGames.id))
    .limit(1);
  if (!game) return null;

  const [quizRow] = await db
    .select({ topic: quizzes.topic })
    .from(quizzes)
    .where(eq(quizzes.id, game.quizId));

  const results = await db
    .select({ nickname: gameResults.nickname, score: gameResults.score, rank: gameResults.rank })
    .from(gameResults)
    .where(eq(gameResults.gameId, game.id))
    .orderBy(asc(gameResults.rank));

  return { topic: quizRow?.topic ?? "", ranking: results };
}
