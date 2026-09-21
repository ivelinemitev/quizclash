import { z } from "zod";

export const NicknameSchema = z
  .string()
  .trim()
  .min(1, "Nickname is required")
  .max(20, "Nickname must be 20 characters or fewer");

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,8}$/, "Room code must be 4-8 letters/numbers");

export const QUESTION_TIMEOUT_OPTIONS_SECONDS = [15, 20, 30, 45, 60] as const;

export const QuestionTimeoutSecondsSchema = z.coerce
  .number()
  .refine(
    (value): value is (typeof QUESTION_TIMEOUT_OPTIONS_SECONDS)[number] =>
      QUESTION_TIMEOUT_OPTIONS_SECONDS.includes(
        value as (typeof QUESTION_TIMEOUT_OPTIONS_SECONDS)[number],
      ),
    { message: "Choose one of the offered time limits." },
  );

export const TopicSchema = z
  .string()
  .trim()
  .min(1, "Topic is required")
  .max(60, "Topic must be 60 characters or fewer");

// Shared between the initial "create room" form and the "start next round"
// form on the results page, so both offer the exact same preset list.
export const TOPIC_PRESETS = [
  "Space Exploration",
  "Ancient Egypt",
  "World History",
  "Science & Technology",
  "Movies & TV",
  "Sports",
  "Music",
  "Video Games",
];
export const CUSTOM_TOPIC_VALUE = "__custom__";

export const CreateGameInputSchema = z.object({
  nickname: NicknameSchema,
  topic: TopicSchema,
  questionTimeoutSeconds: QuestionTimeoutSecondsSchema,
});

export const JoinGameInputSchema = z.object({
  nickname: NicknameSchema,
  roomCode: RoomCodeSchema,
});

// The host starting another round in the same room — no nickname (they're
// already a registered player), just a fresh topic/timeout plus enough to
// identify the room and the caller.
export const NextRoundInputSchema = z.object({
  roomCode: RoomCodeSchema,
  playerId: z.string().min(1),
  topic: TopicSchema,
  questionTimeoutSeconds: QuestionTimeoutSecondsSchema,
});

export type CreateGameInput = z.infer<typeof CreateGameInputSchema>;
export type JoinGameInput = z.infer<typeof JoinGameInputSchema>;
export type NextRoundInput = z.infer<typeof NextRoundInputSchema>;
