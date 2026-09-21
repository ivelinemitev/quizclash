import { describe, expect, it } from "vitest";
import { joinGameAction } from "./actions";

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("joinGameAction", () => {
  it("rejects an empty nickname without redirecting", async () => {
    const state = await joinGameAction({}, formData({ nickname: "", roomCode: "AB12C" }));
    expect(state.errors?.nickname).toBeDefined();
  });

  it("rejects a malformed room code without redirecting", async () => {
    const state = await joinGameAction({}, formData({ nickname: "Alex", roomCode: "!!" }));
    expect(state.errors?.roomCode).toBeDefined();
  });

  it("rejects a payload with both fields missing, independent of any client-side check", async () => {
    const state = await joinGameAction({}, formData({}));
    expect(state.errors?.nickname).toBeDefined();
    expect(state.errors?.roomCode).toBeDefined();
  });
});
