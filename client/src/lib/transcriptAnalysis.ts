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


/**
 * Removes only pathological immediate loops (three or more identical words or
 * phrases). A normal double repetition is preserved for honest coaching.
 */
export function cleanRecognizedTranscript(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const tokens = normalized.split(" ");
  const wordCollapsed: string[] = [];
  for (let index = 0; index < tokens.length;) {
    let end = index + 1;
    while (end < tokens.length && tokens[end] === tokens[index]) end += 1;
    const count = end - index;
    const keep = count >= 3 ? 1 : count;
    for (let repeat = 0; repeat < keep; repeat += 1) wordCollapsed.push(tokens[index]);
    index = end;
  }

  const output: string[] = [];
  for (const token of wordCollapsed) {
    output.push(token);
    let collapsed = true;
    while (collapsed) {
      collapsed = false;
      const maxSize = Math.min(8, Math.floor(output.length / 3));
      for (let size = maxSize; size >= 2; size -= 1) {
        const first = output.slice(output.length - size * 3, output.length - size * 2).join(" ");
        const second = output.slice(output.length - size * 2, output.length - size).join(" ");
        const third = output.slice(output.length - size).join(" ");
        if (first && first === second && second === third) {
          output.splice(output.length - size * 2, size * 2);
          collapsed = true;
          break;
        }
      }
    }
  }
  return output.join(" ");
}

/**
 * Android Web Speech often returns a longer cumulative hypothesis instead of a
 * new sentence. Replace the overlapping snapshot rather than appending it.
 */
export function mergeRecognizedSpeech(previous: string, next: string): string {
  const left = cleanRecognizedTranscript(previous);
  const right = cleanRecognizedTranscript(next);
  if (!left) return right;
  if (!right) return left;
  if (left === right) return left;

  const leftTokens = left.split(" ");
  const rightTokens = right.split(" ");
  const startsWith = (whole: string[], prefix: string[]) =>
    prefix.length <= whole.length && prefix.every((token, index) => whole[index] === token);

  if (startsWith(rightTokens, leftTokens)) return right;
  if (startsWith(leftTokens, rightTokens)) return left;

  const maximumOverlap = Math.min(leftTokens.length, rightTokens.length);
  for (let overlap = maximumOverlap; overlap >= 1; overlap -= 1) {
    const same = leftTokens
      .slice(leftTokens.length - overlap)
      .every((token, index) => token === rightTokens[index]);
    const safeSingleTokenOverlap = overlap === 1 && leftTokens.length === 1;
    if (same && (overlap >= 2 || safeSingleTokenOverlap)) {
      return cleanRecognizedTranscript(
        [...leftTokens, ...rightTokens.slice(overlap)].join(" "),
      );
    }
  }

  return cleanRecognizedTranscript(`${left} ${right}`);
}
