import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateQwen3TTS,
  isQwen3TtsConfigured,
  QWEN3_TTS_MODEL,
  QWEN3_TTS_SPEAKER,
} from "./_core/qwenTTS";

function validWav() {
  const wav = Buffer.alloc(44);
  wav.write("RIFF", 0, "ascii");
  wav.write("WAVE", 8, "ascii");
  return wav;
}

describe("Qwen3-TTS private Korean interviewer adapter", () => {
  beforeEach(() => {
    delete process.env.QWEN3_TTS_URL;
    delete process.env.QWEN3_TTS_TOKEN;
    delete process.env.QWEN3_TTS_ALLOWED_HOST;
    delete process.env.QWEN3_TTS_ALLOW_INSECURE_HTTP;
    vi.restoreAllMocks();
  });

  it("does not activate without a private endpoint", () => {
    expect(isQwen3TtsConfigured()).toBe(false);
  });

  it("uses the fixed JOB&KILL voice profile and returns transient WAV bytes", async () => {
    process.env.QWEN3_TTS_URL = "https://gpu.example.com/";
    process.env.QWEN3_TTS_TOKEN = "runner-token";
    process.env.QWEN3_TTS_ALLOWED_HOST = "gpu.example.com";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(validWav(), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQwen3TTS({
      text: "지원 동기를 말씀해 주세요.",
      voiceType: "male1",
      speed: 1.02,
    });
    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(request.body));
    expect(fetchMock.mock.calls[0][0]).toBe("https://gpu.example.com/v1/tts");
    expect(body).toEqual(
      expect.objectContaining({
        model: QWEN3_TTS_MODEL,
        voice: QWEN3_TTS_SPEAKER,
        lang: "ko",
        speed: 1.02,
        response_format: "wav",
      })
    );
    expect(request.headers).toMatchObject({
      authorization: "Bearer runner-token",
      "cache-control": "no-store",
    });
    expect(result).toMatchObject({
      provider: "supertonic2",
      model: QWEN3_TTS_MODEL,
      cacheHit: false,
    });
    expect(result.audioUrl).toBe(
      `data:audio/wav;base64,${validWav().toString("base64")}`
    );
  });
});
