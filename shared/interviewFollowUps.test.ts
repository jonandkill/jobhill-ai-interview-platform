import { describe, expect, it } from "vitest";
import { getAnsweredUniqueFollowUps } from "./interviewFollowUps";

describe("answered follow-up selection", () => {
  it("excludes recommendations that were never answered", () => {
    const result = getAnsweredUniqueFollowUps([
      { sessionId: 1, followUpQuestion: "왜 그렇게 했나요?", followUpAnswer: null, followUpScore: null },
      { sessionId: 1, followUpQuestion: "결과는 무엇인가요?", followUpAnswer: "불량률을 확인했습니다.", followUpScore: 80 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].followUpScore).toBe(80);
  });

  it("keeps only the newest answered duplicate from a descending query", () => {
    const rows = [
      { sessionId: 1, depth: 1, followUpQuestion: "근거는?", followUpAnswer: "새 답변", followUpScore: 90 },
      { sessionId: 1, depth: 1, followUpQuestion: "  근거는? ", followUpAnswer: "이전 답변", followUpScore: 60 },
    ];
    expect(getAnsweredUniqueFollowUps(rows)).toEqual([rows[0]]);
  });
});
