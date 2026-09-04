import { describe, expect, it, vi } from "vitest";
import { normalizeTtsEndpoint, normalizeTtsText, postTransientWav } from "./_core/ttsHttp";

function validWav(size = 44) {
  const wav = Buffer.alloc(size);
  wav.write("RIFF", 0, "ascii");
  wav.write("WAVE", 8, "ascii");
  return wav;
}

describe("private TTS HTTP boundary", () => {
  it("normalizes question text and removes control/style tags", () => {
    expect(normalizeTtsText("  질문\u200B을  [laugh] <speak>말씀해 주세요.</speak>  ")).toBe("질문을 말씀해 주세요.");
  });

  it("rejects an insecure production endpoint unless explicitly allowed", () => {
    expect(() => normalizeTtsEndpoint("http://tts.internal:8000", { allowInsecureHttp: false, isProduction: true }))
      .toThrowError("TTS_CONFIG_ERROR");
    expect(normalizeTtsEndpoint("http://tts.internal:8000/", { allowInsecureHttp: true, isProduction: true }))
      .toBe("http://tts.internal:8000");
  });

  it("rejects public provider hosts for the self-hosted boundary", () => {
    expect(() => normalizeTtsEndpoint("https://public.example.com", {
      allowInsecureHttp: false,
      isProduction: true,
      requirePrivateHost: true,
    })).toThrowError("TTS_CONFIG_ERROR");
  });

  it("sends an authenticated no-store request and returns a bounded WAV", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(validWav(), {
      status: 200,
      headers: { "content-type": "audio/wav", "content-length": "44" },
    }));
    const result = await postTransientWav({
      endpoint: "https://tts.internal/v1/tts",
      body: { text: "질문" },
      token: "secret-value",
      fetchImpl: fetchMock,
    });
    expect(result).toEqual(validWav());
    expect(fetchMock).toHaveBeenCalledWith("https://tts.internal/v1/tts", expect.objectContaining({
      method: "POST",
      redirect: "error",
      headers: expect.objectContaining({ authorization: "Bearer secret-value", "cache-control": "no-store" }),
    }));
  });

  it.each([
    ["text/plain", validWav(), "TTS_INVALID_AUDIO"],
    ["audio/wav", Buffer.alloc(44), "TTS_INVALID_AUDIO"],
  ])("rejects invalid audio (%s)", async (contentType, body, code) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200, headers: { "content-type": contentType } }));
    await expect(postTransientWav({ endpoint: "https://tts.internal/v1/tts", body: {}, fetchImpl: fetchMock }))
      .rejects.toMatchObject({ code });
  });

  it("rejects an oversized advertised response before reading it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(validWav(), {
      status: 200,
      headers: { "content-type": "audio/wav", "content-length": String(9 * 1024 * 1024) },
    }));
    await expect(postTransientWav({ endpoint: "https://tts.internal/v1/tts", body: {}, fetchImpl: fetchMock }))
      .rejects.toMatchObject({ code: "TTS_TOO_LARGE" });
  });
});
