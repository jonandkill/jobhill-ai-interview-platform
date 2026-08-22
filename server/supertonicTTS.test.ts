import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateSupertonic2TTS, isSupertonic2Configured } from "./_core/supertonicTTS";

function validWav() {
  const wav = Buffer.alloc(44);
  wav.write("RIFF", 0, "ascii");
  wav.write("WAVE", 8, "ascii");
  return wav;
}

describe("open-source TTS provider chain", () => {
  beforeEach(() => {
    for (const key of [
      "QWEN3_TTS_URL", "QWEN3_TTS_TOKEN", "SUPERTONIC3_TTS_URL", "SUPERTONIC2_TTS_URL",
      "SUPERTONIC3_TTS_TOKEN", "SUPERTONIC_TTS_TOKEN",
    ]) delete process.env[key];
    vi.restoreAllMocks();
  });

  it("does not activate without a private endpoint", () => {
    expect(isSupertonic2Configured()).toBe(false);
  });

  it("returns transient Supertonic 3 bytes without uploading or caching", async () => {
    process.env.SUPERTONIC3_TTS_URL = "http://127.0.0.1:7788/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(validWav(), { status: 200, headers: { "content-type": "audio/wav" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateSupertonic2TTS({ text: "지원 동기를 말씀해 주세요.", voiceType: "female1", steps: 10, speed: 0.98 });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:7788/v1/tts", expect.objectContaining({ method: "POST", redirect: "error" }));
    expect(result).toMatchObject({ provider: "supertonic2", model: "Supertone/supertonic-3", cacheHit: false });
  });

  it("falls back from Qwen3-TTS to local Supertonic 3", async () => {
    process.env.QWEN3_TTS_URL = "http://127.0.0.1:7790";
    process.env.SUPERTONIC3_TTS_URL = "http://127.0.0.1:7788";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(validWav(), { status: 200, headers: { "content-type": "audio/wav" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateSupertonic2TTS({ text: "최근 성과를 설명해 주세요.", voiceType: "natural" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ provider: "supertonic2", model: "Supertone/supertonic-3" });
    expect(warn).toHaveBeenCalledWith("[TTS] QWEN3_TTS_UNAVAILABLE; using local Supertonic fallback");
  });
});
