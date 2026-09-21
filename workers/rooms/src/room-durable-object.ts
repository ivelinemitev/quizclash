import { DurableObject } from "cloudflare:workers";
import type { Quiz } from "../../../lib/quiz/schema";

const MAX_PLAYERS = 6;
const DEFAULT_QUESTION_TIMEOUT_MS = 20_000;
const MIN_QUESTION_TIMEOUT_MS = 5_000;
const MAX_QUESTION_TIMEOUT_MS = 300_000;
// How long a finished round can sit with nobody starting another one or
// explicitly ending the game before it auto-expires to "ended". Reuses the
// same single per-instance alarm slot already used for question timeouts —
// the two never overlap, since one only matters while "playing" and the
// other only while "finished".
const IDLE_EXPIRY_MS = 30 * 60_000;
const STATE_KEY = "state";

type Player = { id: string; nickname: string };
type RoomStatus = "lobby" | "playing" | "finished" | "ended";
type AnswerRecord = { answerIndex: number; correct: boolean };
export type RankingEntry = { nickname: string; score: number; rank: number };

type RoomState = {
  status: RoomStatus;
  players: Player[];
  hostPlayerId: string | null;
  quiz: Quiz | null;
  quizId: number | null;
  currentQuestionIndex: number;
  scores: Record<string, number>;
  answers: Record<number, Record<string, AnswerRecord>>;
  ranking: RankingEntry[] | null;
  questionTimeoutMs: number;
  // Epoch ms the current question's timeout alarm will fire at — exposed
  // via `getPublicState()` purely so the client can render a countdown.
  // Cosmetic only: the client never decides when time is actually up,
  // the alarm does that regardless of what any display shows.
  currentQuestionDeadline: number | null;
  // The game can finish two ways: a player's own answer completes the last
  // question (a single, unambiguous caller), or the timeout alarm fires
  // with no HTTP caller at all. This flag lets `claimResults` guarantee
  // exactly one caller ever gets told "persist this" regardless of which
  // path finished it, or how many clients are polling and race to notice.
  resultsPersisted: boolean;
};

function initialState(): RoomState {
  return {
    status: "lobby",
    players: [],
    hostPlayerId: null,
    quiz: null,
    quizId: null,
    currentQuestionIndex: 0,
    scores: {},
    answers: {},
    ranking: null,
    resultsPersisted: false,
    questionTimeoutMs: DEFAULT_QUESTION_TIMEOUT_MS,
    currentQuestionDeadline: null,
  };
}

export type JoinResult =
  | { ok: true; playerId: string; nickname: string; isHost: boolean }
  | { ok: false; error: string; reason: "not_joinable" | "room_full" };

export type StartResult = { ok: true } | { ok: false; error: string };
export type EndGameResult = { ok: true } | { ok: false; error: string };

export type PublicRoomState = {
  status: RoomStatus;
  players: Player[];
  hostPlayerId: string | null;
  quizId: number | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: { text: string; answers: [string, string, string, string] } | null;
  scores: Record<string, number>;
  ranking: RankingEntry[] | null;
  currentQuestionDeadline: number | null;
};

export type SubmitAnswerResult =
  | {
      ok: true;
      correct: boolean;
      correctAnswerIndex: number;
      score: number;
      roomFinished: boolean;
      ranking: RankingEntry[] | null;
    }
  | { ok: false; error: string };

export class RoomDurableObject extends DurableObject {
  private async getState(): Promise<RoomState> {
    const stored = await this.ctx.storage.get<RoomState>(STATE_KEY);
    return stored ?? initialState();
  }

  private async setState(state: RoomState): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, state);
  }

  /** Schedules the current question's timeout alarm and records its
   * deadline so `getPublicState()` can expose it for a client countdown. */
  private async scheduleQuestionAlarm(state: RoomState): Promise<void> {
    const deadline = Date.now() + state.questionTimeoutMs;
    state.currentQuestionDeadline = deadline;
    await this.ctx.storage.setAlarm(deadline);
  }

  /** Replaces the (now-irrelevant) question alarm with an idle-expiry one
   * once a round finishes — see `alarm()` for what fires next. */
  private async scheduleIdleExpiryAlarm(state: RoomState): Promise<void> {
    state.currentQuestionDeadline = null;
    await this.ctx.storage.setAlarm(Date.now() + IDLE_EXPIRY_MS);
  }

  /**
   * Everything below reads state, mutates it, and writes it back without any
   * `await` on external work in between — Durable Objects apply an input gate
   * around storage I/O, so concurrent RPC calls to this same room instance are
   * automatically serialized. That single-writer guarantee is the entire
   * reason a Durable Object (not KV/D1 polling) owns this state; two
   * `submitAnswer` calls landing "at the same time" can never both read a
   * stale score and double-increment it.
   */

  async join(nickname: string): Promise<JoinResult> {
    const state = await this.getState();

    if (state.status !== "lobby") {
      return {
        ok: false,
        error: "This room's game is already in progress.",
        reason: "not_joinable",
      };
    }
    if (state.players.length >= MAX_PLAYERS) {
      return { ok: false, error: "This room is full.", reason: "room_full" };
    }

    const trimmed = nickname.trim();
    const existingNicknames = new Set(state.players.map((p) => p.nickname));
    let disambiguated = trimmed;
    let suffix = 2;
    while (existingNicknames.has(disambiguated)) {
      disambiguated = `${trimmed} (${suffix})`;
      suffix += 1;
    }

    const playerId = crypto.randomUUID();
    const isHost = state.players.length === 0;

    state.players.push({ id: playerId, nickname: disambiguated });
    state.scores[playerId] = 0;
    if (isHost) {
      state.hostPlayerId = playerId;
    }

    await this.setState(state);
    return { ok: true, playerId, nickname: disambiguated, isHost };
  }

  /**
   * Also callable from "finished" (not just "lobby") — that's how the same
   * room plays another round with the same players: nobody has to rejoin,
   * `players`/`hostPlayerId` are untouched, but scores/answers/ranking all
   * reset so the new round starts clean.
   */
  async start(
    playerId: string,
    quiz: Quiz,
    quizId: number,
    questionTimeoutMs: number,
  ): Promise<StartResult> {
    const state = await this.getState();

    if (state.status === "ended") {
      return { ok: false, error: "This game has ended and can't be restarted." };
    }
    if (state.status !== "lobby" && state.status !== "finished") {
      return { ok: false, error: "This game is already in progress." };
    }
    if (playerId !== state.hostPlayerId) {
      return { ok: false, error: "Only the host can start the game." };
    }

    state.status = "playing";
    state.quiz = quiz;
    state.quizId = quizId;
    state.currentQuestionIndex = 0;
    state.scores = Object.fromEntries(state.players.map((p) => [p.id, 0]));
    state.answers = {};
    state.ranking = null;
    state.resultsPersisted = false;
    // Defensive clamp: the host-facing UI only ever offers a small preset
    // list, but this RPC is reachable from any caller in the main Worker,
    // so don't trust an out-of-range value blindly.
    state.questionTimeoutMs = Math.min(
      MAX_QUESTION_TIMEOUT_MS,
      Math.max(MIN_QUESTION_TIMEOUT_MS, questionTimeoutMs || DEFAULT_QUESTION_TIMEOUT_MS),
    );

    await this.scheduleQuestionAlarm(state);
    await this.setState(state);
    return { ok: true };
  }

  /**
   * The host's explicit "we're done" action — distinct from "finished",
   * which just means the current round ended and another one could still
   * start. "ended" is terminal: `start()` never accepts it. Idempotent
   * (calling it again once already "ended" is a harmless no-op) so a
   * double click or a retried request can't error.
   */
  async endGame(playerId: string): Promise<EndGameResult> {
    const state = await this.getState();

    if (state.status === "ended") {
      return { ok: true };
    }
    if (state.status !== "finished") {
      return { ok: false, error: "The current round hasn't finished yet." };
    }
    if (playerId !== state.hostPlayerId) {
      return { ok: false, error: "Only the host can end the game." };
    }

    state.status = "ended";
    // No longer needed — cancel the pending idle-expiry alarm rather than
    // let it fire on an already-terminal room.
    await this.ctx.storage.deleteAlarm();
    await this.setState(state);
    return { ok: true };
  }

  async getPublicState(): Promise<PublicRoomState> {
    const state = await this.getState();
    const question = state.quiz?.questions[state.currentQuestionIndex];

    return {
      status: state.status,
      players: state.players,
      hostPlayerId: state.hostPlayerId,
      quizId: state.quizId,
      currentQuestionIndex: state.currentQuestionIndex,
      totalQuestions: state.quiz?.questions.length ?? 5,
      currentQuestion:
        state.status === "playing" && question
          ? { text: question.text, answers: question.answers }
          : null,
      scores: state.scores,
      ranking: state.ranking,
      currentQuestionDeadline: state.currentQuestionDeadline,
    };
  }

  async submitAnswer(
    playerId: string,
    questionIndex: number,
    answerIndex: number,
    // Accepted for API-shape/documentation purposes (spec: "submitAnswer must
    // accept an idempotency key"), but the actual replay guard below is keyed
    // on (playerId, questionIndex) state, not this value — simpler and more
    // robust than trusting a client-supplied key to be stable across retries.
    _idempotencyKey: string,
  ): Promise<SubmitAnswerResult> {
    const state = await this.getState();

    if (!state.quiz) {
      return { ok: false, error: "This room is not currently playing." };
    }
    if (!state.players.some((p) => p.id === playerId)) {
      return { ok: false, error: "You are not a player in this room." };
    }

    const question = state.quiz.questions[questionIndex];
    if (!question) {
      return { ok: false, error: "That is not a valid question." };
    }

    const questionAnswers = (state.answers[questionIndex] ??= {});
    const existing = questionAnswers[playerId];

    if (existing) {
      // Idempotent replay: same player, same question, already recorded.
      // Checked *before* the "is the room still playing" guard below, since
      // a replay of the final question's answer arrives after the room has
      // already moved to "finished" — it must still return the original
      // result, not an error.
      return {
        ok: true,
        correct: existing.correct,
        correctAnswerIndex: question.correctAnswerIndex,
        score: state.scores[playerId],
        roomFinished: state.status === "finished",
        ranking: state.ranking,
      };
    }

    if (state.status !== "playing" || questionIndex !== state.currentQuestionIndex) {
      return { ok: false, error: "That is not the current question." };
    }

    const correct = answerIndex === question.correctAnswerIndex;
    questionAnswers[playerId] = { answerIndex, correct };
    if (correct) {
      state.scores[playerId] += 1;
    }

    const allAnswered = state.players.every((p) => questionAnswers[p.id]);
    let roomFinished = false;
    if (allAnswered) {
      roomFinished = this.advance(state);
      // Advancing to a *new* question needs its own fresh timeout alarm —
      // this was previously only ever (re)scheduled from inside `alarm()`
      // itself, so a question that completed via "everyone answered"
      // (this branch) left the room with no alarm at all for the next
      // question, permanently, unless it also happened to complete the
      // same fast way. Mirrors exactly what `alarm()` does at its own end.
      if (roomFinished) {
        await this.scheduleIdleExpiryAlarm(state);
      } else {
        await this.scheduleQuestionAlarm(state);
      }
    }

    await this.setState(state);
    return {
      ok: true,
      correct,
      correctAnswerIndex: question.correctAnswerIndex,
      score: state.scores[playerId],
      roomFinished,
      ranking: state.ranking,
    };
  }

  /**
   * Shared by the "everyone answered" path and the alarm timeout path.
   * Returns whether the room just moved to "finished" — callers must use
   * this return value rather than re-reading `state.status` afterward,
   * since TypeScript's narrowing (from an earlier `status === "playing"`
   * guard) doesn't know this method may have just reassigned it.
   */
  private advance(state: RoomState): boolean {
    if (!state.quiz) return false;

    const isLastQuestion = state.currentQuestionIndex >= state.quiz.questions.length - 1;
    if (isLastQuestion) {
      state.status = "finished";
      const ranked = state.players
        .map((p) => ({ nickname: p.nickname, score: state.scores[p.id] ?? 0 }))
        .sort((a, b) => b.score - a.score);
      state.ranking = ranked.map((entry, index) => ({ ...entry, rank: index + 1 }));
      return true;
    }

    state.currentQuestionIndex += 1;
    return false;
  }

  /**
   * The single per-instance alarm slot serves two unrelated purposes,
   * distinguished by `state.status` at the moment it actually fires: a
   * question timeout while "playing", or an idle-session expiry while
   * "finished" — the two never coexist, since finishing a round always
   * replaces the question alarm with the idle one, and starting another
   * round always replaces the idle one with a fresh question alarm.
   */
  async alarm(): Promise<void> {
    const state = await this.getState();

    if (state.status === "finished") {
      // Nobody started another round or explicitly ended the session
      // within the idle window — close it out automatically.
      state.status = "ended";
      await this.setState(state);
      return;
    }

    if (state.status !== "playing" || !state.quiz) return;

    const questionAnswers = (state.answers[state.currentQuestionIndex] ??= {});
    for (const player of state.players) {
      if (!questionAnswers[player.id]) {
        // Timed out: no answer recorded, no score change ("timeout = 0").
        questionAnswers[player.id] = { answerIndex: -1, correct: false };
      }
    }

    const roomFinished = this.advance(state);
    if (roomFinished) {
      await this.scheduleIdleExpiryAlarm(state);
    } else {
      await this.scheduleQuestionAlarm(state);
    }
    await this.setState(state);
  }

  /**
   * The one place D1 persistence gets authorized from, regardless of
   * whether the game finished via a player's own answer or the timeout
   * alarm firing with no caller at all. Returns the ranking exactly once;
   * every subsequent call (from any client's poll, or a retried Server
   * Action) gets `null` — safe to call as often as needed.
   */
  async claimResults(): Promise<{ quizId: number; ranking: RankingEntry[] } | null> {
    const state = await this.getState();

    if (state.status !== "finished" || state.resultsPersisted || !state.ranking || state.quizId === null) {
      return null;
    }

    state.resultsPersisted = true;
    await this.setState(state);
    return { quizId: state.quizId, ranking: state.ranking };
  }
}
