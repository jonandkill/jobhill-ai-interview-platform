import { storagePut } from "../storage";

export type SupertonicVoiceType =
  | "kim"
  | "lee"
  | "park"
  | "jeong"
  | "choi"
  | "han"
  | "female1"
  | "female2"
  | "male1"
  | "male2"
  | "natural";

interface SupertonicResponse {
  audioUrl: string;
  provider: "supertonic2";
  cacheHit: boolean;
}

const VOICE_MAPPING: Record<string, string> = {
  kim: "F1",
  lee: "F2",
  park: "M1",
  jeong: "M2",
  choi: "F1",
  han: "M1",
  female1: "F1",
  female2: "F2",
  male1: "M1",
  male2: "M2",
  natural: "M1",
};

const MAX_CACHE_ITEMS = 200;
const CACHE_TTL_MS = 30 * 60 * 1000;
const audioCache = new Map<string, { audioUrl: string; expiresAt: number }>();

function getEndpoint(): string | null {
  const endpoint = process.env.SUPERTONIC2_TTS_URL?.trim();
  return endpoint ? endpoint.replace(/\/$/, "") : null;
}

export function isSupertonic2Configured(): boolean {
  return Boolean(getEndpoint());
}

function cacheKey(text: string, voiceType: string, steps: number, speed: number) {
  return `${voiceType}:${steps}:${speed}:${text}`;
}

function remember(key: string, audioUrl: string) {
  if (audioCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, { audioUrl, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Calls the official Supertonic local HTTP server contract:
 * POST /v1/tts -> audio/wav bytes.
 * The server is intentionally optional; if SUPERTONIC2_TTS_URL is absent,
 * the caller should use the existing Edge TTS fallback.
 */
export async function generateSupertonic2TTS(options: {
  text: string;
  voiceType: string;
  steps?: number;
  speed?: number;
}): Promise<SupertonicResponse> {
  const endpoint = getEndpoint();
  if (!endpoint) {
    throw new Error("Supertonic2 TTS endpoint is not configured");
  }

  const steps = Math.min(12, Math.max(2, Math.round(options.steps ?? 8)));
  const speed = Math.min(2, Math.max(0.7, options.speed ?? 1.05));
  const key = cacheKey(options.text, options.voiceType, steps, speed);
  const cached = audioCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { audioUrl: cached.audioUrl, provider: "supertonic2", cacheHit: true };
  }
  if (cached) audioCache.delete(key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${endpoint}/v1/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: options.text,
        voice: VOICE_MAPPING[options.voiceType] || "M1",
        lang: "ko",
        steps,
        speed,
        response_format: "wav",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Supertonic2 HTTP ${response.status}${details ? `: ${details.slice(0, 200)}` : ""}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length < 44) {
      throw new Error("Supertonic2 returned an invalid WAV response");
    }

    const suffix = Math.random().toString(36).slice(2, 10);
    const { url } = await storagePut(
      `tts/supertonic2_${Date.now()}_${suffix}.wav`,
      audioBuffer,
      "audio/wav",
    );
    remember(key, url);
    return { audioUrl: url, provider: "supertonic2", cacheHit: false };
  } finally {
    clearTimeout(timeout);
  }
}
