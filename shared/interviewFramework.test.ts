import { describe, expect, it } from "vitest";
import {
  analyzeAnswerEmphasis,
  buildInterviewPlan,
  getInterviewPhase,
  parseInterviewPlan,
  serializeInterviewPlan,
  summarizeRubricCheckpoint,
  type InterviewRubricScores,
} from "./interviewFramework";

describe("interview framework", () => {
  it("keeps a three-question interview in basic, document, fit order", () => {
    expect([0, 1, 2].map((order) => getInterviewPhase(order, 3).id)).toEqual(["basic", "resume", "fit"]);
  });

  it("reports wording emphasis without inventing a competency score", () => {
    const result = analyzeAnswerEmphasis(["불량을 검사하고 품질 기준을 확인했습니다. 품질 기록도 남겼습니다."]);
    expect(result.strongest?.label).toBe("품질");
    expect(result.axes.every((axis) => typeof axis.share === "number")).toBe(true);
  });

  it("builds the full eight-part interview in canonical order", () => {
    expect(buildInterviewPlan({ requestedTotal: 8 }).map(slot => slot.phaseId)).toEqual([
      "basic", "prepared", "resume", "highlight", "performance", "operations", "horizon", "fit",
    ]);
  });

  it("inserts prepared questions as a part instead of replacing the interview", () => {
    const plan = buildInterviewPlan({
      requestedTotal: 5,
      preparedQuestions: [" 안전 경험을 말해주세요. ", "품질 기준은 무엇인가요?"],
    });
    expect(plan.map(slot => slot.phaseId)).toEqual([
      "basic", "prepared", "prepared", "resume", "performance", "fit",
    ]);
    expect(plan.filter(slot => slot.source === "prepared").map(slot => slot.preparedQuestionIndex)).toEqual([0, 1]);
  });

  it("keeps selected-only mode for a single-question retry", () => {
    const plan = buildInterviewPlan({
      requestedTotal: 1,
      preparedQuestions: ["다시 답할 질문"],
      mode: "selected_only",
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ phaseId: "prepared", source: "prepared", preparedQuestionIndex: 0 });
  });

  it("round-trips a versioned stored interview plan", () => {
    const plan = buildInterviewPlan({ requestedTotal: 8, preparedQuestions: ["필수 질문"] });
    expect(parseInterviewPlan(serializeInterviewPlan(plan))).toEqual(plan);
    expect(parseInterviewPlan(JSON.stringify(["basic", "resume"]))).toBeNull();
  });

  it("summarizes only the latest three complete rubric results", () => {
    const scores = (evidence: number): InterviewRubricScores => ({
      relevance: 18,
      evidence,
      structure: 16,
      roleFit: 17,
      clarity: 19,
    });
    const summary = summarizeRubricCheckpoint([
      { rubricScores: scores(20) },
      { rubricScores: scores(11) },
      { rubricScores: scores(10) },
      { rubricScores: scores(9) },
    ]);
    expect(summary.insufficientData).toBe(false);
    expect(summary.weakest?.key).toBe("evidence");
    expect(summary.weakest?.score).toBe(10);
  });

  it("does not diagnose a weakest rubric axis until three complete results exist", () => {
    expect(summarizeRubricCheckpoint([
      { rubricScores: { relevance: 20, evidence: 20, structure: 20, roleFit: 20, clarity: 20 } },
      { rubricScores: null },
      { rubricScores: { relevance: 10, evidence: 10, structure: 10, roleFit: 10, clarity: 10 } },
    ]).insufficientData).toBe(true);
  });
});

