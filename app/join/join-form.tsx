"use client";

import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { JoinGameInputSchema, type JoinGameInput } from "@/lib/room/schema";
import { joinGameAction, type JoinGameActionState } from "./actions";

const initialState: JoinGameActionState = {};
const initialValues: JoinGameInput = { nickname: "", roomCode: "" };

type FieldName = keyof JoinGameInput;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
    >
      {pending ? "Joining..." : "Join room"}
    </button>
  );
}

export function JoinForm() {
  const [serverState, formAction] = useActionState(joinGameAction, initialState);
  const [values, setValues] = useState<JoinGameInput>(initialValues);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    nickname: false,
    roomCode: false,
  });

  const validation = JoinGameInputSchema.safeParse(values);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validation.success) {
      event.preventDefault();
      setTouched({ nickname: true, roomCode: true });
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
        Room code
        <input
          name="roomCode"
          value={values.roomCode}
          onChange={handleChange("roomCode")}
          onBlur={handleBlur("roomCode")}
          maxLength={8}
          aria-invalid={fieldError("roomCode") ? true : undefined}
          aria-describedby={fieldError("roomCode") ? "roomCode-error" : undefined}
          className="rounded-md border border-black/[.08] bg-white px-3 py-2 uppercase text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          placeholder="e.g. AB12C"
        />
        {fieldError("roomCode") ? (
          <p id="roomCode-error" className="text-sm text-red-600" role="alert">
            {fieldError("roomCode")}
          </p>
        ) : null}
      </label>
      <SubmitButton disabled={!validation.success} />
    </form>
  );
}
