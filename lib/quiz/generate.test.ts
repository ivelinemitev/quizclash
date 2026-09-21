import { describe, expect, it } from "vitest";
import { generateValidatedQuiz, shuffleAnswers, type QuizGenerationDeps } from "./generate";
import type { Question } from "./schema";

const validQuestion: Question = {
  text: "What is the capital of France?",
  answers: ["Paris", "Lyon", "Marseille", "Nice"],
  correctAnswerIndex: 0,
};

const validAiOutput = {
  questions: Array.from({ length: 5 }, () => validQuestion),
};

function makeDeps(overrides: Partial<QuizGenerationDeps> = {}): QuizGenerationDeps {
  return {
    generateQuestions: async () => validAiOutput,
    embed: async (texts) => texts.map(() => [0, 0, 0]),
    findNearDuplicate: async () => false,
    ...overrides,
  };
}

describe("generateValidatedQuiz", () => {
  it("accepts a valid AI response with no near-duplicates", async () => {
    const result = await generateValidatedQuiz("Geography", makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quiz.questions).toHaveLength(5);
      expect(result.embeddings).toHaveLength(5);
      // Regardless of how the answers were shuffled, the answer at the
      // reported correctAnswerIndex must still be the actually-correct one.
      for (const question of result.quiz.questions) {
        expect(question.answers[question.correctAnswerIndex]).toBe("Paris");
      }
    }
  });

  it("reports ai_unavailable when the model call throws", async () => {
    const result = await generateValidatedQuiz(
      "Geography",
      makeDeps({
        generateQuestions: async () => {
          throw new Error("model unavailable");
        },
      }),
    );
    expect(result).toEqual({ ok: false, reason: "ai_unavailable" });
  });

  it("reports invalid_ai_output when the model returns malformed shape", async () => {
    const result = await generateValidatedQuiz(
      "Geography",
      makeDeps({
        generateQuestions: async () => ({
          questions: [validQuestion, validQuestion, validQuestion],
        }),
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_ai_output" });
  });

  it("reports invalid_ai_output when a question has duplicate answers", async () => {
    const result = await generateValidatedQuiz(
      "Geography",
      makeDeps({
        generateQuestions: async () => ({
          questions: [
            { ...validQuestion, answers: ["Paris", "Paris", "Marseille", "Nice"] },
            validQuestion,
            validQuestion,
            validQuestion,
            validQuestion,
          ],
        }),
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_ai_output" });
  });

  it("reports ai_unavailable when embedding the accepted questions fails", async () => {
    const result = await generateValidatedQuiz(
      "Geography",
      makeDeps({
        embed: async () => {
          throw new Error("embedding model unavailable");
        },
      }),
    );
    expect(result).toEqual({ ok: false, reason: "ai_unavailable" });
  });

  it("reports near_duplicate when any question embedding matches an existing one", async () => {
    let calls = 0;
    const result = await generateValidatedQuiz(
      "Geography",
      makeDeps({
        findNearDuplicate: async () => {
          calls += 1;
          return calls === 3;
        },
      }),
    );
    expect(result).toEqual({ ok: false, reason: "near_duplicate" });
  });

  it("passes the topic through to findNearDuplicate for topic-scoped matching", async () => {
    const receivedTopics: string[] = [];
    await generateValidatedQuiz(
      "Ancient Egypt",
      makeDeps({
        findNearDuplicate: async (_embedding, topic) => {
          receivedTopics.push(topic);
          return false;
        },
      }),
    );
    expect(receivedTopics).toEqual(Array(5).fill("Ancient Egypt"));
  });

  it("never calls findNearDuplicate when the AI output is invalid", async () => {
    let called = false;
    await generateValidatedQuiz(
      "Geography",
      makeDeps({
        generateQuestions: async () => ({ questions: [] }),
        findNearDuplicate: async () => {
          called = true;
          return false;
        },
      }),
    );
    expect(called).toBe(false);
  });
});

describe("shuffleAnswers", () => {
  it("reorders the answers deterministically for an injected random source", () => {
    // Fisher-Yates with random() always returning 0 always picks j=0,
    // producing the fixed permutation [1, 2, 3, 0] for a 4-element array.
    const result = shuffleAnswers(validQuestion, () => 0);
    expect(result.answers).toEqual(["Lyon", "Marseille", "Nice", "Paris"]);
    expect(result.correctAnswerIndex).toBe(3);
  });

  it("keeps the correct answer's text aligned with the new index, whatever the original position", () => {
    const question = { ...validQuestion, correctAnswerIndex: 2 as const };
    const result = shuffleAnswers(question, () => 0);
    expect(result.answers).toEqual(["Lyon", "Marseille", "Nice", "Paris"]);
    expect(result.correctAnswerIndex).toBe(1);
    expect(result.answers[result.correctAnswerIndex]).toBe("Marseille");
  });

  it("preserves the same set of answers, only reordered", () => {
    const result = shuffleAnswers(validQuestion);
    expect([...result.answers].sort()).toEqual([...validQuestion.answers].sort());
  });

  it("does not always place the correct answer first", () => {
    // Statistical guard against the exact regression reported: with the
    // real random source, the correct answer should not land on index 0
    // every single time across many independent shuffles.
    const seenIndices = new Set(
      Array.from({ length: 50 }, () => shuffleAnswers(validQuestion).correctAnswerIndex),
    );
    expect(seenIndices.size).toBeGreaterThan(1);
  });
});
