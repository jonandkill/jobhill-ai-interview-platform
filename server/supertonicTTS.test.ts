import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateSupertonic2TTS, isSupertonic2Configured } from "./_core/supertonicTTS";

describe("ephemeral Supertonic TTS adapter", () => {
  beforeEach(() => {
    delete process.env.SUPERTONIC3_TTS_URL;
    delete process.env.SUPERTONIC2_TTS_URL;
    vi.restoreAllMocks();
  });

  it("does not activate without a private endpoint", () => {
    expect(isSupertonic2Configured()).toBe(false);
  });

  it("returns transient Korean WAV bytes without uploading or caching", async () => {
    process.env.SUPERTONIC3_TTS_URL = "http://127.0.0.1:7788/";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array(44).buffer });
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateSupertonic2TTS({ text: "지원 동기를 말씀해 주세요.", voiceType: "female1", steps: 10, speed: 0.98 });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:7788/v1/tts", expect.objectContaining({ method: "POST" }));
    expect(result).toMatchObject({ provider: "supertonic2", cacheHit: false });
    expect(result.audioUrl).toBe(`data:audio/wav;base64,${Buffer.alloc(44).toString("base64")}`);
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ "cache-control": "no-store" });
  });
});
