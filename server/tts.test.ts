import { describe, expect, it } from "vitest";
import { generateTTS } from "./_core/edgeTTS";

describe("server-side external TTS", () => {
  it("is disabled so interview questions are not sent to a third party", async () => {
    await expect(generateTTS({ text: "자기소개를 해주세요.", voiceType: "natural" }))
      .rejects.toThrow("Server-side external TTS is disabled");
  });
});
