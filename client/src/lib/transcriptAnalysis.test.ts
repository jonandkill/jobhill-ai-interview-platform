import { describe, expect, it } from "vitest";
import { analyzeTranscript } from "./transcriptAnalysis";

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
