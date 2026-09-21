import { describe, expect, it } from "vitest";
import { createGameAction } from "./actions";

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("createGameAction", () => {
  it("rejects an empty nickname without redirecting", async () => {
    const state = await createGameAction({}, formData({ nickname: "", topic: "Space" }));
    expect(state.errors?.nickname).toBeDefined();
  });

  it("rejects an empty topic without redirecting", async () => {
    const state = await createGameAction({}, formData({ nickname: "Alex", topic: "" }));
    expect(state.errors?.topic).toBeDefined();
  });

  it("rejects a payload with both fields missing, independent of any client-side check", async () => {
    const state = await createGameAction({}, formData({}));
    expect(state.errors?.nickname).toBeDefined();
    expect(state.errors?.topic).toBeDefined();
  });
});
