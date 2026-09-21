import { env } from "cloudflare:workers";
import type {
  EndGameResult,
  JoinResult,
  PublicRoomState,
  RankingEntry,
  StartResult,
  SubmitAnswerResult,
} from "../../workers/rooms/src/room-durable-object";
import type { Quiz } from "@/lib/quiz/schema";

/**
 * `GAME_ROOMS` is a cross-script Durable Object binding (the class lives in
 * the separate `quizclash-rooms` Worker — see PROGRESS.md for why), so
 * Wrangler can't generate a typed stub for it automatically. This interface
 * mirrors `RoomDurableObject`'s public RPC methods by hand; only type-level
 * (erased at build time), so it adds no runtime coupling between the two
 * Workers beyond the binding itself.
 */
interface RoomStub {
  join(nickname: string): Promise<JoinResult>;
  start(
    playerId: string,
    quiz: Quiz,
    quizId: number,
    questionTimeoutMs: number,
  ): Promise<StartResult>;
  getPublicState(): Promise<PublicRoomState>;
  submitAnswer(
    playerId: string,
    questionIndex: number,
    answerIndex: number,
    idempotencyKey: string,
  ): Promise<SubmitAnswerResult>;
  claimResults(): Promise<{ quizId: number; ranking: RankingEntry[] } | null>;
  endGame(playerId: string): Promise<EndGameResult>;
}

export function getRoomStub(roomCode: string): RoomStub {
  return env.GAME_ROOMS.getByName(roomCode) as unknown as RoomStub;
}
