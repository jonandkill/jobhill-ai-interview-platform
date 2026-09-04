import { generateQwen3TTS, isQwen3TtsConfigured, type Qwen3TtsResponse } from "./qwenTTS";
import { normalizeTtsEndpoint, normalizeTtsText, postTransientWav, TtsProviderError } from "./ttsHttp";

export type SupertonicVoiceType = "kim" | "lee" | "park" | "jeong" | "choi" | "han" | "female1" | "female2" | "male1" | "male2" | "natural";

export interface SupertonicResponse {
  audioUrl: string;
  /** Legacy UI discriminator retained for the existing tRPC/client contract. */
  provider: "supertonic2";
  model: "Supertone/supertonic-3" | "Supertone/supertonic-2";
  cacheHit: false;
}

export type OpenSourceTtsResponse = Qwen3TtsResponse | SupertonicResponse;

const VOICE_MAPPING: Record<string, string> = {
  kim: "F1", lee: "F2", park: "M1", jeong: "M2", choi: "M2", han: "M1",
  female1: "F1", female2: "F2", male1: "M1", male2: "M2", natural: "M2",
};

function getSupertonicEndpoint() {
  const rawEndpoint = process.env.SUPERTONIC3_TTS_URL || process.env.SUPERTONIC2_TTS_URL;
  return normalizeTtsEndpoint(rawEndpoint, {
    allowInsecureHttp: process.env.SUPERTONIC_TTS_ALLOW_INSECURE_HTTP === "true",
    requirePrivateHost: true,
  });
}

function getSupertonicToken(): string | undefined {
  const token = (process.env.SUPERTONIC3_TTS_TOKEN || process.env.SUPERTONIC_TTS_TOKEN)?.trim();
  if (
    process.env.NODE_ENV === "production" &&
    !token &&
    process.env.SUPERTONIC_TTS_ALLOW_UNAUTHENTICATED !== "true"
  ) {
    throw new TtsProviderError("TTS_CONFIG_ERROR");
  }
  return token || undefined;
}

/** Compatibility name retained because server/routers.ts already imports it. */
export function isSupertonic2Configured() {
  return isQwen3TtsConfigured() || Boolean(process.env.SUPERTONIC3_TTS_URL?.trim() || process.env.SUPERTONIC2_TTS_URL?.trim());
}

async function generateSupertonicTTS(options: { text: string; voiceType: string; steps?: number; speed?: number }): Promise<SupertonicResponse> {
  const endpoint = getSupertonicEndpoint();
  if (!endpoint) throw new TtsProviderError("TTS_CONFIG_ERROR");
  const usingV3 = Boolean(process.env.SUPERTONIC3_TTS_URL?.trim());
  const audio = await postTransientWav({
    endpoint: `${endpoint}/v1/tts`,
    token: getSupertonicToken(),
    body: {
      text: normalizeTtsText(options.text),
      voice: VOICE_MAPPING[options.voiceType] || "M2",
      lang: "ko",
      steps: Math.min(12, Math.max(6, Math.round(options.steps ?? 10))),
      speed: Math.min(1.05, Math.max(0.9, Number.isFinite(options.speed) ? Number(options.speed) : 0.98)),
      response_format: "wav",
    },
  });
  return {
    audioUrl: `data:audio/wav;base64,${audio.toString("base64")}`,
    provider: "supertonic2",
    model: usingV3 ? "Supertone/supertonic-3" : "Supertone/supertonic-2",
    cacheHit: false,
  };
}

/**
 * Compatibility entry point: Qwen3-TTS is primary, Supertonic is the local fallback.
 * If both are unavailable, the router reports failure and the client uses its browser-local or text path.
 */
export async function generateSupertonic2TTS(options: { text: string; voiceType: string; steps?: number; speed?: number }): Promise<OpenSourceTtsResponse> {
  if (isQwen3TtsConfigured()) {
    try {
      return await generateQwen3TTS(options);
    } catch (error) {
      if (!getSupertonicEndpoint()) throw error;
      console.warn("[TTS] QWEN3_TTS_UNAVAILABLE; using local Supertonic fallback");
    }
  }
  return generateSupertonicTTS(options);
}
