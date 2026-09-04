import { normalizeTtsEndpoint, normalizeTtsText, postTransientWav, TtsProviderError } from "./ttsHttp";

export const QWEN3_TTS_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice";
export const QWEN3_TTS_SPEAKER = "Sohee";

export interface Qwen3TtsResponse {
  audioUrl: string;
  /** Legacy UI discriminator retained until Interview.tsx is split into reviewable modules. */
  provider: "supertonic2";
  model: typeof QWEN3_TTS_MODEL;
  cacheHit: false;
}

function getEndpoint(): string | null {
  return normalizeTtsEndpoint(process.env.QWEN3_TTS_URL, {
    allowInsecureHttp: process.env.QWEN3_TTS_ALLOW_INSECURE_HTTP === "true",
    requirePrivateHost: true,
  });
}

function getServiceToken(): string | undefined {
  const token = process.env.QWEN3_TTS_TOKEN?.trim();
  if (
    process.env.NODE_ENV === "production" &&
    !token &&
    process.env.QWEN3_TTS_ALLOW_UNAUTHENTICATED !== "true"
  ) {
    throw new TtsProviderError("TTS_CONFIG_ERROR");
  }
  return token || undefined;
}

export function isQwen3TtsConfigured(): boolean {
  return Boolean(process.env.QWEN3_TTS_URL?.trim());
}

/**
 * Calls the private Qwen3-TTS sidecar. The Korean Sohee preset is fixed server-side;
 * voice cloning and user-provided style instructions are intentionally unsupported.
 */
export async function generateQwen3TTS(options: {
  text: string;
  voiceType: string;
  speed?: number;
}): Promise<Qwen3TtsResponse> {
  const endpoint = getEndpoint();
  if (!endpoint) throw new TtsProviderError("TTS_CONFIG_ERROR");

  const requestedSpeed = Number.isFinite(options.speed) ? Number(options.speed) : 0.98;
  const speed = Math.min(1.05, Math.max(0.9, requestedSpeed));
  const audio = await postTransientWav({
    endpoint: `${endpoint}/v1/tts`,
    token: getServiceToken(),
    body: {
      model: QWEN3_TTS_MODEL,
      text: normalizeTtsText(options.text),
      voice: QWEN3_TTS_SPEAKER,
      lang: "ko",
      speed,
      response_format: "wav",
    },
  });

  return {
    audioUrl: `data:audio/wav;base64,${audio.toString("base64")}`,
    provider: "supertonic2",
    model: QWEN3_TTS_MODEL,
    cacheHit: false,
  };
}
