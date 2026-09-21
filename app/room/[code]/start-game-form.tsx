"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startGameAction, type StartGameActionState } from "./actions";

const initialState: StartGameActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
    >
      {pending ? "Starting..." : "Start game"}
    </button>
  );
}

export function StartGameForm({
  roomCode,
  playerId,
  quizId,
  questionTimeoutMs,
}: {
  roomCode: string;
  playerId: string;
  quizId: number;
  questionTimeoutMs: number;
}) {
  const [state, formAction] = useActionState(startGameAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="roomCode" value={roomCode} />
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="quizId" value={quizId} />
      <input type="hidden" name="questionTimeoutMs" value={questionTimeoutMs} />
      {state.formError ? (
        <p className="text-sm text-red-600" role="alert">
          {state.formError}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
