export { RoomDurableObject } from "./room-durable-object";

const LEADERBOARD_KEY = "leaderboard:recent";
const LEADERBOARD_LIMIT = 20;
const RETRY_BASE_DELAY_SECONDS = 2;

export type PostGameMessage = {
  roomCode: string;
  quizId: number;
  ranking: { nickname: string; score: number; rank: number }[];
  finishedAt: string;
};

interface Env {
  CACHE: KVNamespace;
}

export default {
  // This Worker is never called over HTTP directly — only via the Durable
  // Object stub (from the main Worker) and the Queue consumer below.
  async fetch(): Promise<Response> {
    return new Response("Not found", { status: 404 });
  },

  async queue(batch: MessageBatch<PostGameMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const raw = await env.CACHE.get(LEADERBOARD_KEY);
        const existing: PostGameMessage[] = raw ? JSON.parse(raw) : [];
        // Duplicate delivery must not duplicate durable effects: this KV
        // list is a disposable snapshot (not the durable record — that's
        // already in D1 by the time this message is enqueued), so replacing
        // any prior entry for the same room/finish time is a safe no-op on
        // retry rather than an unbounded duplicate append.
        const deduped = existing.filter(
          (entry) =>
            !(entry.roomCode === message.body.roomCode && entry.finishedAt === message.body.finishedAt),
        );
        const updated = [message.body, ...deduped].slice(0, LEADERBOARD_LIMIT);
        await env.CACHE.put(LEADERBOARD_KEY, JSON.stringify(updated));
        message.ack();
      } catch {
        // Failed background processing must not invalidate the completed
        // game (already durably in D1) — just let this one message retry,
        // with exponential backoff so a transient KV blip doesn't hammer
        // it immediately. After the consumer's configured retry limit,
        // Cloudflare routes the message to `quizclash-post-game-dlq`
        // instead of dropping it.
        message.retry({ delaySeconds: RETRY_BASE_DELAY_SECONDS ** message.attempts });
      }
    }
  },
};
