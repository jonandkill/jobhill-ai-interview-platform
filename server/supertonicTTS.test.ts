import { beforeEach, describe, expect, it, vi } from "vitest";

const storagePutMock = vi.hoisted(() => vi.fn());
vi.mock("./storage", () => ({
  storagePut: storagePutMock,
}));

import {
  generateSupertonic2TTS,
  isSupertonic2Configured,
} from "./_core/supertonicTTS";

describe("Supertonic2 TTS adapter", () => {
  beforeEach(() => {
    delete process.env.SUPERTONIC2_TTS_URL;
    storagePutMock.mockReset();
    vi.restoreAllMocks();
  });

  it("does not activate without an endpoint", () => {
    expect(isSupertonic2Configured()).toBe(false);
  });

  it("sends the Korean request to the local HTTP contract and uploads WAV", async () => {
    process.env.SUPERTONIC2_TTS_URL = "http://127.0.0.1:7788/";
    storagePutMock.mockResolvedValue({ url: "https://storage.test/question.wav" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array(44).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateSupertonic2TTS({
      text: "지원 동기를 말씀해 주세요.",
      voiceType: "female1",
      steps: 8,
      speed: 1.05,
    });

    expect(isSupertonic2Configured()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:7788/v1/tts",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      text: "지원 동기를 말씀해 주세요.",
      voice: "F1",
      lang: "ko",
      steps: 8,
      response_format: "wav",
    });
    expect(storagePutMock).toHaveBeenCalledWith(
      expect.stringContaining("tts/supertonic2_"),
      expect.any(Buffer),
      "audio/wav",
    );
    expect(result).toEqual({
      audioUrl: "https://storage.test/question.wav",
      provider: "supertonic2",
      cacheHit: false,
    });
  });

  it("returns the cached audio for the same request", async () => {
    process.env.SUPERTONIC2_TTS_URL = "http://127.0.0.1:7788";
    storagePutMock.mockResolvedValue({ url: "https://storage.test/cached.wav" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array(44).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateSupertonic2TTS({ text: "캐시 테스트 질문입니다.", voiceType: "male1" });
    const second = await generateSupertonic2TTS({ text: "캐시 테스트 질문입니다.", voiceType: "male1" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storagePutMock).toHaveBeenCalledTimes(1);
    expect(second.cacheHit).toBe(true);
  });
});
