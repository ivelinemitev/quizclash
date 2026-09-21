import { describe, expect, it } from "vitest";
import { QuestionSchema, QuizSchema } from "./schema";

const validQuestion = {
  text: "What is the capital of France?",
  answers: ["Paris", "Lyon", "Marseille", "Nice"],
  correctAnswerIndex: 0,
};

function makeQuiz(questions: unknown[] = Array.from({ length: 5 }, () => validQuestion)) {
  return { topic: "Geography", questions };
}

describe("QuestionSchema", () => {
  it("accepts a valid question", () => {
    expect(QuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("rejects fewer than 4 answers", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      answers: ["Paris", "Lyon", "Marseille"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 answers", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      answers: ["Paris", "Lyon", "Marseille", "Nice", "Cannes"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty question text", () => {
    const result = QuestionSchema.safeParse({ ...validQuestion, text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty answer text", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      answers: ["Paris", "", "Marseille", "Nice"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate answers", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      answers: ["Paris", "Paris", "Marseille", "Nice"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a correctAnswerIndex outside 0-3", () => {
    expect(QuestionSchema.safeParse({ ...validQuestion, correctAnswerIndex: 4 }).success).toBe(
      false,
    );
    expect(QuestionSchema.safeParse({ ...validQuestion, correctAnswerIndex: -1 }).success).toBe(
      false,
    );
  });
});

describe("QuizSchema", () => {
  it("accepts a valid 5-question quiz", () => {
    expect(QuizSchema.safeParse(makeQuiz()).success).toBe(true);
  });

  it("rejects fewer than 5 questions", () => {
    const result = QuizSchema.safeParse(
      makeQuiz(Array.from({ length: 4 }, () => validQuestion)),
    );
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 questions", () => {
    const result = QuizSchema.safeParse(
      makeQuiz(Array.from({ length: 6 }, () => validQuestion)),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a quiz containing a malformed question", () => {
    const result = QuizSchema.safeParse(
      makeQuiz([
        { ...validQuestion, answers: ["Paris", "Paris", "Marseille", "Nice"] },
        validQuestion,
        validQuestion,
        validQuestion,
        validQuestion,
      ]),
    );
    expect(result.success).toBe(false);
  });
});
