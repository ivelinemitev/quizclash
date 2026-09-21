"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { finalizeGameAction, submitAnswerAction } from "./actions";

type CurrentQuestion = { text: string; answers: [string, string, string, string] };

type RoomStatusResponse = {
  status: "lobby" | "playing" | "finished";
  currentQuestionIndex: number;
  currentQuestion: CurrentQuestion | null;
  currentQuestionDeadline: number | null;
};

type GameBoardProps = {
  code: string;
  playerId: string;
  nickname: string;
  initialQuestionIndex: number;
  totalQuestions: number;
  initialQuestion: CurrentQuestion;
  initialScore: number;
  initialQuestionDeadline: number | null;
};

type Phase = "answering" | "submitting" | "waiting";

export function GameBoard({
  code,
  playerId,
  nickname,
  initialQuestionIndex,
  totalQuestions,
  initialQuestion,
  initialScore,
  initialQuestionDeadline,
}: GameBoardProps) {
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [question, setQuestion] = useState(initialQuestion);
  const [score, setScore] = useState(initialScore);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correctAnswerIndex: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(initialQuestionDeadline);
  const [now, setNow] = useState(() => Date.now());

  async function selectAnswer(answerIndex: number) {
    if (phase !== "answering") return;
    setSelectedAnswer(answerIndex);
    setPhase("submitting");
    setError(null);

    const idempotencyKey = crypto.randomUUID();
    const result = await submitAnswerAction(
      code,
      playerId,
      questionIndex,
      answerIndex,
      idempotencyKey,
    );

    if (!result.ok) {
      setError(result.error);
      setSelectedAnswer(null);
      setPhase("answering");
      return;
    }

    setFeedback({ correctAnswerIndex: result.correctAnswerIndex });
    setScore(result.score);

    if (result.roomFinished) {
      router.push(
        `/results/${code}?nickname=${encodeURIComponent(nickname)}&playerId=${encodeURIComponent(playerId)}`,
      );
      return;
    }

    setPhase("waiting");
  }

  // The Durable Object advances the room once every player has answered (or
  // the per-question timeout alarm fires) — the client only finds out by
  // polling; there is no push/WebSocket channel in this MVP.
  useEffect(() => {
    if (phase !== "waiting") return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/room/${code}/status`);
      const state = (await response.json()) as RoomStatusResponse;

      if (state.status === "finished") {
        // Covers the case where the room finished via the timeout alarm
        // rather than this (or any) player's own answer — nothing else
        // would have triggered the D1 persist in that case.
        await finalizeGameAction(code);
        router.push(
          `/results/${code}?nickname=${encodeURIComponent(nickname)}&playerId=${encodeURIComponent(playerId)}`,
        );
        return;
      }

      if (state.status === "playing" && state.currentQuestion && state.currentQuestionIndex !== questionIndex) {
        setQuestionIndex(state.currentQuestionIndex);
        setQuestion(state.currentQuestion);
        setSelectedAnswer(null);
        setFeedback(null);
        setDeadline(state.currentQuestionDeadline);
        setPhase("answering");
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [phase, questionIndex, code, router, nickname, playerId]);

  // Purely a display aid — the deadline itself, and what happens once it
  // passes, are entirely decided server-side by the Durable Object's alarm.
  // This effect only subscribes to a 1s tick; `secondsLeft` below is a
  // plain derived value from it, never state set synchronously in the
  // effect body itself.
  useEffect(() => {
    if (phase !== "answering" || deadline === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [phase, deadline]);

  const secondsLeft =
    phase === "answering" && deadline !== null
      ? Math.max(0, Math.ceil((deadline - now) / 1000))
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Question {questionIndex + 1} of {totalQuestions}
        </p>
        {secondsLeft !== null ? (
          <p
            className={`text-sm font-medium ${
              secondsLeft <= 5 ? "text-red-600" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {secondsLeft}s left
          </p>
        ) : null}
      </div>
      <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">{question.text}</h2>
      <div className="flex flex-col gap-3">
        {question.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = feedback && index === feedback.correctAnswerIndex;
          const showResult = feedback !== null;

          return (
            <button
              key={answer}
              type="button"
              disabled={phase !== "answering"}
              onClick={() => selectAnswer(index)}
              className={`rounded-md border px-4 py-3 text-left transition-colors ${
                showResult && isCorrect
                  ? "border-green-600 bg-green-50 dark:bg-green-950"
                  : showResult && isSelected
                    ? "border-red-600 bg-red-50 dark:bg-red-950"
                    : "border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              } text-black dark:text-zinc-50`}
            >
              {answer}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {phase === "waiting" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Waiting for other players to answer...
        </p>
      ) : null}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Score: {score}</p>
    </div>
  );
}
