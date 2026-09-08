export const INTERVIEW_AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
] as const;

export type InterviewAudioMimeType = (typeof INTERVIEW_AUDIO_MIME_CANDIDATES)[number];
export type TranscriptionAudioMimeType = "audio/webm" | "audio/mp4" | "audio/ogg";

/**
 * Picks the first format supported by the current browser. Returning undefined
 * intentionally means that MediaRecorder should be constructed without an
 * explicit mimeType so browsers with a proprietary default can still record.
 */
export function selectInterviewAudioMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): InterviewAudioMimeType | undefined {
  return INTERVIEW_AUDIO_MIME_CANDIDATES.find(isTypeSupported);
}

/** The transcription API accepts the container type, not codec parameters. */
export function normalizeTranscriptionAudioMimeType(
  mimeType: string | undefined,
): TranscriptionAudioMimeType {
  if (mimeType?.startsWith("audio/mp4")) return "audio/mp4";
  if (mimeType?.startsWith("audio/ogg")) return "audio/ogg";
  return "audio/webm";
}
