import { describe, expect, it } from "vitest";
import { analyzeAnswerEmphasis, getInterviewPhase } from "./interviewFramework";

describe("interview framework", () => {
  it("keeps a three-question interview in basic, document, fit order", () => {
    expect([0, 1, 2].map((order) => getInterviewPhase(order, 3).id)).toEqual(["basic", "resume", "fit"]);
  });

  it("reports wording emphasis without inventing a competency score", () => {
    const result = analyzeAnswerEmphasis(["불량을 검사하고 품질 기준을 확인했습니다. 품질 기록도 남겼습니다."]);
    expect(result.strongest?.label).toBe("품질");
    expect(result.axes.every((axis) => typeof axis.share === "number")).toBe(true);
  });
});

