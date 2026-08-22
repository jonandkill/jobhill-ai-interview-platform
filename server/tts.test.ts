import { describe, expect, it } from "vitest";
import { generateTTS } from "./_core/edgeTTS";

describe("ephemeral Edge TTS", () => {
  it("returns audio bytes rather than a persistent URL", async () => {
    const result = await generateTTS({ text: "자기소개를 해주세요.", voiceType: "natural" });
    expect(result.startsWith("data:audio/mpeg;base64,")).toBe(true);
    expect(result.length).toBeGreaterThan(100);
  }, 30_000);
});
