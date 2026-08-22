export type SupertonicVoiceType = "kim" | "lee" | "park" | "jeong" | "choi" | "han" | "female1" | "female2" | "male1" | "male2" | "natural";

export interface SupertonicResponse {
  audioUrl: string;
  provider: "supertonic2";
  cacheHit: false;
}

const VOICE_MAPPING: Record<string, string> = {
  kim: "F1", lee: "F2", park: "M1", jeong: "M2", choi: "M2", han: "M1",
  female1: "F1", female2: "F2", male1: "M1", male2: "M2", natural: "M2",
};

function getEndpoint() {
  const endpoint = (process.env.SUPERTONIC3_TTS_URL || process.env.SUPERTONIC2_TTS_URL)?.trim();
  return endpoint ? endpoint.replace(/\/$/, "") : null;
}

export function isSupertonic2Configured() { return Boolean(getEndpoint()); }

/** Calls a private Supertonic HTTP runner and returns transient bytes without object-storage upload or caching. */
export async function generateSupertonic2TTS(options: { text: string; voiceType: string; steps?: number; speed?: number }): Promise<SupertonicResponse> {
  const endpoint = getEndpoint();
  if (!endpoint) throw new Error("Supertonic TTS endpoint is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${endpoint}/v1/tts`, {
      method: "POST",
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({
        text: options.text.replace(/\s+/g, " ").trim().slice(0, 800),
        voice: VOICE_MAPPING[options.voiceType] || "M2",
        lang: "ko",
        steps: Math.min(12, Math.max(6, Math.round(options.steps ?? 10))),
        speed: Math.min(1.2, Math.max(0.85, options.speed ?? 0.98)),
        response_format: "wav",
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Supertonic HTTP ${response.status}`);
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 44 || audio.length > 8 * 1024 * 1024) throw new Error("Supertonic returned invalid audio");
    return { audioUrl: `data:audio/wav;base64,${audio.toString("base64")}`, provider: "supertonic2", cacheHit: false };
  } finally {
    clearTimeout(timeout);
  }
}
