"use client";

import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  CreateGameInputSchema,
  CUSTOM_TOPIC_VALUE,
  QUESTION_TIMEOUT_OPTIONS_SECONDS,
  TOPIC_PRESETS,
  type CreateGameInput,
} from "@/lib/room/schema";
import { createGameAction, type CreateGameActionState } from "./actions";

const initialState: CreateGameActionState = {};
const initialValues: CreateGameInput = {
  nickname: "",
  topic: "",
  questionTimeoutSeconds: 20,
};

type FieldName = keyof CreateGameInput;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
    >
      {pending ? "Generating your quiz..." : "Create room"}
    </button>
  );
}

export function CreateForm() {
  const [serverState, formAction] = useActionState(createGameAction, initialState);
  const [values, setValues] = useState<CreateGameInput>(initialValues);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    nickname: false,
    topic: false,
    questionTimeoutSeconds: false,
  });

  const validation = CreateGameInputSchema.safeParse(values);
  const liveErrors = validation.success ? undefined : validation.error.flatten().fieldErrors;
  const errors = liveErrors ?? serverState.errors;

  function fieldError(field: FieldName) {
    return touched[field] ? errors?.[field]?.[0] : undefined;
  }

  function handleChange(field: FieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function handleBlur(field: FieldName) {
    return () => setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleTopicSelect(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setTouched((current) => ({ ...current, topic: true }));
    if (value === CUSTOM_TOPIC_VALUE) {
      setUseCustomTopic(true);
      setValues((current) => ({ ...current, topic: "" }));
    } else {
      setUseCustomTopic(false);
      setValues((current) => ({ ...current, topic: value }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validation.success) {
      event.preventDefault();
      setTouched({ nickname: true, topic: true, questionTimeoutSeconds: true });
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {serverState.formError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {serverState.formError}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Nickname
        <input
          name="nickname"
          value={values.nickname}
          onChange={handleChange("nickname")}
          onBlur={handleBlur("nickname")}
          maxLength={20}
          aria-invalid={fieldError("nickname") ? true : undefined}
          aria-describedby={fieldError("nickname") ? "nickname-error" : undefined}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          placeholder="e.g. Alex"
        />
        {fieldError("nickname") ? (
          <p id="nickname-error" className="text-sm text-red-600" role="alert">
            {fieldError("nickname")}
          </p>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Topic
        <select
          value={useCustomTopic ? CUSTOM_TOPIC_VALUE : values.topic}
          onChange={handleTopicSelect}
          name={useCustomTopic ? undefined : "topic"}
          aria-invalid={fieldError("topic") ? true : undefined}
          aria-describedby={fieldError("topic") ? "topic-error" : undefined}
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
            value={values.topic}
            onChange={handleChange("topic")}
            onBlur={handleBlur("topic")}
            maxLength={60}
            aria-invalid={fieldError("topic") ? true : undefined}
            aria-describedby={fieldError("topic") ? "topic-error" : undefined}
            className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            placeholder="e.g. 1990s Sitcoms"
          />
        ) : null}
        {fieldError("topic") ? (
          <p id="topic-error" className="text-sm text-red-600" role="alert">
            {fieldError("topic")}
          </p>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Time per question
        <select
          name="questionTimeoutSeconds"
          value={values.questionTimeoutSeconds}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              // Safe: the value always comes from one of our own
              // QUESTION_TIMEOUT_OPTIONS_SECONDS <option>s below, never
              // arbitrary input — the schema still re-validates regardless.
              questionTimeoutSeconds: Number.parseInt(
                event.target.value,
                10,
              ) as CreateGameInput["questionTimeoutSeconds"],
            }))
          }
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        >
          {QUESTION_TIMEOUT_OPTIONS_SECONDS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} seconds
            </option>
          ))}
        </select>
      </label>
      <SubmitButton disabled={!validation.success} />
    </form>
  );
}
