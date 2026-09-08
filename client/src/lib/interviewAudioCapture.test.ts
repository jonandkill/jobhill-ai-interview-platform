import { describe, expect, it } from "vitest";
import {
  normalizeTranscriptionAudioMimeType,
  selectInterviewAudioMimeType,
} from "./interviewAudioCapture";

describe("interview audio capture", () => {
  it("prefers Opus WebM when the browser supports it", () => {
    expect(selectInterviewAudioMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("selects MP4 on iPhone-like browsers without WebM support", () => {
    expect(selectInterviewAudioMimeType(type => type === "audio/mp4")).toBe("audio/mp4");
  });

  it("falls back to the browser default when no candidate is reported", () => {
    expect(selectInterviewAudioMimeType(() => false)).toBeUndefined();
  });

  it("normalizes codec parameters before calling transcription", () => {
    expect(normalizeTranscriptionAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeTranscriptionAudioMimeType("audio/mp4;codecs=mp4a.40.2")).toBe("audio/mp4");
    expect(normalizeTranscriptionAudioMimeType(undefined)).toBe("audio/webm");
  });
});
