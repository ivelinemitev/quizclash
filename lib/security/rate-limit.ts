import { env } from "cloudflare:workers";

/**
 * 5 requests/minute per key. Chosen because `/create` triggers a real
 * Workers AI generation call + embedding call + Vectorize query + D1
 * writes — generous enough for legitimate retries (e.g. re-submitting
 * after a near-duplicate rejection), tight enough to cap worst-case AI
 * spend from a single source.
 */
export async function checkCreateGameRateLimit(key: string): Promise<boolean> {
  const { success } = await env.CREATE_GAME_LIMITER.limit({ key });
  return success;
}
