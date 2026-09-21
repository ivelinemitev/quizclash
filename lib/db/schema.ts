import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  generatedBy: text("generated_by"),
});

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  position: integer("position").notNull(),
  text: text("text").notNull(),
  answer0: text("answer_0").notNull(),
  answer1: text("answer_1").notNull(),
  answer2: text("answer_2").notNull(),
  answer3: text("answer_3").notNull(),
  correctAnswerIndex: integer("correct_answer_index").notNull(),
});

export const completedGames = sqliteTable("completed_games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomCode: text("room_code").notNull(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
});

export const gameResults = sqliteTable("game_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => completedGames.id),
  nickname: text("nickname").notNull(),
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
});
