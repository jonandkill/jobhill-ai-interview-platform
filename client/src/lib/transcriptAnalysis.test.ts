import { describe, expect, it } from "vitest";
import { analyzeTranscript, cleanRecognizedTranscript, mergeRecognizedSpeech } from "./transcriptAnalysis";

describe("analyzeTranscript", () => {
  it("returns counts that match the highlighted filler and repeated-word segments", () => {
    const result = analyzeTranscript("음 오늘 오늘 문제 해결을 했습니다.");

    expect(result.fillerCount).toBe(1);
    expect(result.repeatedWordCount).toBe(2);
    expect(result.repeatedSegmentCount).toBe(1);
    expect(result.totalFlaggedCount).toBe(3);
    expect(result.highlights).toHaveLength(2);
  });

  it("returns zero counts for an empty transcript", () => {
    expect(analyzeTranscript("   ")).toEqual({
      highlights: [],
      fillerCount: 0,
      repeatedWordCount: 0,
      repeatedSegmentCount: 0,
      totalFlaggedCount: 0,
    });
  });
});


describe("mobile speech transcript recovery", () => {
  it("replaces cumulative Android hypotheses instead of appending them", () => {
    let transcript = "";
    transcript = mergeRecognizedSpeech(transcript, "저는");
    transcript = mergeRecognizedSpeech(transcript, "저는 고양이를");
    transcript = mergeRecognizedSpeech(transcript, "저는 고양이를 키우고 있습니다");

    expect(transcript).toBe("저는 고양이를 키우고 있습니다");
  });

  it("removes pathological loops while preserving an ordinary double repetition", () => {
    expect(cleanRecognizedTranscript("저는 저는 저는 저는 고양이를 키웁니다"))
      .toBe("저는 고양이를 키웁니다");
    expect(cleanRecognizedTranscript("정말 정말 중요합니다"))
      .toBe("정말 정말 중요합니다");
  });
});
