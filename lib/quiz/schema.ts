import { z } from "zod";

const CorrectAnswerIndex = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const QuestionSchema = z
  .object({
    text: z.string().min(1),
    answers: z.tuple([
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
      z.string().min(1),
    ]),
    correctAnswerIndex: CorrectAnswerIndex,
  })
  .refine((question) => new Set(question.answers).size === question.answers.length, {
    message: "answers must be distinct",
    path: ["answers"],
  });

export const QuizSchema = z.object({
  topic: z.string().min(1),
  questions: z.array(QuestionSchema).length(5),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
