"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  CUSTOM_TOPIC_VALUE,
  QUESTION_TIMEOUT_OPTIONS_SECONDS,
  TOPIC_PRESETS,
} from "@/lib/room/schema";
import { startNextRoundAction, type StartNextRoundActionState } from "./actions";

const initialState: StartNextRoundActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
    >
      {pending ? "Generating your quiz..." : "Start next round"}
    </button>
  );
}

export function NextRoundForm({ roomCode, playerId }: { roomCode: string; playerId: string }) {
  const [serverState, formAction] = useActionState(startNextRoundAction, initialState);
  const [topic, setTopic] = useState("");
  const [useCustomTopic, setUseCustomTopic] = useState(false);

  function handleTopicSelect(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (value === CUSTOM_TOPIC_VALUE) {
      setUseCustomTopic(true);
      setTopic("");
    } else {
      setUseCustomTopic(false);
      setTopic(value);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="roomCode" value={roomCode} />
      <input type="hidden" name="playerId" value={playerId} />
      {serverState.formError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {serverState.formError}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Next topic
        <select
          value={useCustomTopic ? CUSTOM_TOPIC_VALUE : topic}
          onChange={handleTopicSelect}
          name={useCustomTopic ? undefined : "topic"}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {TOPIC_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
          <option value={CUSTOM_TOPIC_VALUE}>Write my own...</option>
        </select>
        {useCustomTopic ? (
          <input
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            maxLength={60}
            className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            placeholder="e.g. 1990s Sitcoms"
          />
        ) : null}
        {serverState.errors?.topic ? (
          <p className="text-sm text-red-600" role="alert">
            {serverState.errors.topic[0]}
          </p>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Time per question
        <select
          name="questionTimeoutSeconds"
          defaultValue={20}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        >
          {QUESTION_TIMEOUT_OPTIONS_SECONDS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} seconds
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
    </form>
  );
}
