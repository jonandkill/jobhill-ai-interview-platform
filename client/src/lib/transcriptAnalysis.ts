export type TranscriptHighlightKind = "filler" | "repeat";

export interface TranscriptHighlight {
  start: number;
  end: number;
  kind: TranscriptHighlightKind;
}

export interface TranscriptAnalysis {
  highlights: TranscriptHighlight[];
  fillerCount: number;
  repeatedWordCount: number;
  repeatedSegmentCount: number;
  totalFlaggedCount: number;
}

const fillerPattern = /(^|[\s,.;:!?()[\]{}])((?:어+|음+|저기|그러니까|사실|약간|뭐랄까|이제))(?=$|[\s,.;:!?()[\]{}])/g;
const repeatedPattern = /([가-힣A-Za-z0-9]{1,20})(\s+\1){1,}/g;

/**
 * STT 스크립트에서 코칭용 추임새와 연속 반복어를 찾아 강조 위치와 통계를 함께 반환합니다.
 * 표시 결과와 요약 수치가 서로 달라지지 않도록 화면과 PDF 전 단계에서 동일 함수를 사용합니다.
 */
export function analyzeTranscript(text: string): TranscriptAnalysis {
  if (!text.trim()) {
    return {
      highlights: [],
      fillerCount: 0,
      repeatedWordCount: 0,
      repeatedSegmentCount: 0,
      totalFlaggedCount: 0,
    };
  }

  const rawMatches: Array<TranscriptHighlight & { occurrenceCount?: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = fillerPattern.exec(text)) !== null) {
    const prefixLength = match[1] ? match[1].length : 0;
    const start = match.index + prefixLength;
    rawMatches.push({
      start,
      end: start + match[2].length,
      kind: "filler",
      occurrenceCount: 1,
    });
  }

  while ((match = repeatedPattern.exec(text)) !== null) {
    const repeatedWordCount = match[0].trim().split(/\s+/).filter(Boolean).length;
    rawMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: "repeat",
      occurrenceCount: repeatedWordCount,
    });
  }

  const orderedMatches = rawMatches
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((item, index, all) => index === 0 || item.start >= all[index - 1].end);

  const fillerCount = orderedMatches.filter((item) => item.kind === "filler").length;
  const repeatMatches = orderedMatches.filter((item) => item.kind === "repeat");
  const repeatedWordCount = repeatMatches.reduce((sum, item) => sum + (item.occurrenceCount || 0), 0);

  return {
    highlights: orderedMatches.map(({ start, end, kind }) => ({ start, end, kind })),
    fillerCount,
    repeatedWordCount,
    repeatedSegmentCount: repeatMatches.length,
    totalFlaggedCount: fillerCount + repeatedWordCount,
  };
}
