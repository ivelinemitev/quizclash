import { describe, expect, it } from "vitest";
import { CreateGameInputSchema, JoinGameInputSchema, NextRoundInputSchema } from "./schema";

describe("CreateGameInputSchema", () => {
  it("accepts a valid nickname, topic, and question timeout", () => {
    const result = CreateGameInputSchema.safeParse({
      nickname: "Alex",
      topic: "Space Exploration",
      questionTimeoutSeconds: 20,
    });
    expect(result.success).toBe(true);
  });

  it("coerces a string question timeout to a number", () => {
    const result = CreateGameInputSchema.safeParse({
      nickname: "Alex",
      topic: "Space Exploration",
      questionTimeoutSeconds: "30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.questionTimeoutSeconds).toBe(30);
    }
  });

  it("rejects a question timeout outside the offered presets", () => {
    const result = CreateGameInputSchema.safeParse({
      nickname: "Alex",
      topic: "Space Exploration",
      questionTimeoutSeconds: 999,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty nickname", () => {
    const result = CreateGameInputSchema.safeParse({ nickname: "", topic: "Space" });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only nickname", () => {
    const result = CreateGameInputSchema.safeParse({ nickname: "   ", topic: "Space" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty topic", () => {
    const result = CreateGameInputSchema.safeParse({ nickname: "Alex", topic: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an overly long nickname", () => {
    const result = CreateGameInputSchema.safeParse({
      nickname: "a".repeat(21),
      topic: "Space",
    });
    expect(result.success).toBe(false);
  });
});

describe("JoinGameInputSchema", () => {
  it("accepts a valid nickname and room code", () => {
    const result = JoinGameInputSchema.safeParse({ nickname: "Alex", roomCode: "ab12c" });
    expect(result.success).toBe(true);
  });

  it("normalizes the room code to uppercase", () => {
    const result = JoinGameInputSchema.safeParse({ nickname: "Alex", roomCode: "ab12c" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roomCode).toBe("AB12C");
    }
  });

  it("rejects a room code with invalid characters", () => {
    const result = JoinGameInputSchema.safeParse({ nickname: "Alex", roomCode: "ab-12" });
    expect(result.success).toBe(false);
  });

  it("rejects a room code that is too short", () => {
    const result = JoinGameInputSchema.safeParse({ nickname: "Alex", roomCode: "ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty nickname", () => {
    const result = JoinGameInputSchema.safeParse({ nickname: "", roomCode: "AB12C" });
    expect(result.success).toBe(false);
  });
});

describe("NextRoundInputSchema", () => {
  it("accepts a valid roomCode, playerId, topic, and timeout", () => {
    const result = NextRoundInputSchema.safeParse({
      roomCode: "AB12C",
      playerId: "player-1",
      topic: "World History",
      questionTimeoutSeconds: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing playerId", () => {
    const result = NextRoundInputSchema.safeParse({
      roomCode: "AB12C",
      playerId: "",
      topic: "World History",
      questionTimeoutSeconds: 30,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty topic", () => {
    const result = NextRoundInputSchema.safeParse({
      roomCode: "AB12C",
      playerId: "player-1",
      topic: "",
      questionTimeoutSeconds: 30,
    });
    expect(result.success).toBe(false);
  });
});
