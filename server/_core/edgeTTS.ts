export interface TTSOptions {
  text: string;
  voiceType: string;
  rate?: string;
  pitch?: string;
}

/**
 * The former Edge TTS adapter sent interview questions to an external speech endpoint.
 * It is intentionally disabled: use Qwen3-TTS, private Supertonic, or the browser-local fallback.
 */
export async function generateTTS(_options: TTSOptions): Promise<string> {
  throw new Error("Server-side external TTS is disabled");
}
