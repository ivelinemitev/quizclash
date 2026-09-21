"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shown once a room is "ended" (terminal) — nothing else to wait for, so
 * unlike the room/results pollers this doesn't poll anything, it just
 * counts down and leaves. The countdown itself only ever comes from a
 * `setInterval` callback, never set synchronously in the effect body.
 */
export function EndedRedirect({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push("/");
    }
  }, [secondsLeft, router]);

  return (
    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
      Returning to home in {Math.max(secondsLeft, 0)}s...
    </p>
  );
}
