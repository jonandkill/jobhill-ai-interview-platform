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
import {
  EXPERIENCE_ACTION_LADDER,
  INTERVIEW_QUESTION_KNOWLEDGE,
  STRESS_SITUATIONS,
  buildExperienceFrame,
  compactKnowledgeContext,
  searchInterviewKnowledge,
} from "./interviewKnowledge";

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

  it("keeps the verified 30-question taxonomy without duplicate ids", () => {
    const counts = INTERVIEW_QUESTION_KNOWLEDGE.reduce<Record<string, number>>((result, knowledge) => {
      result[knowledge.category] = (result[knowledge.category] || 0) + 1;
      return result;
    }, {});
    expect(INTERVIEW_QUESTION_KNOWLEDGE).toHaveLength(30);
    expect(new Set(INTERVIEW_QUESTION_KNOWLEDGE.map(knowledge => knowledge.id)).size).toBe(30);
    expect(counts).toEqual({ basic: 8, frequent: 7, role: 5, experience: 4, pressure: 6 });
  });

  it("retrieves only a small relevant local knowledge set", () => {
    const matches = searchInterviewKnowledge("졸업 후 공백 기간에는 무엇을 준비했나요?", 2);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(2);
    expect(matches[0].id).toBe("pressure-gap");
    expect(compactKnowledgeContext("프로젝트 경험을 말해 주세요")).toContain("프로젝트");
    expect(searchInterviewKnowledge("   ")).toEqual([]);
  });

  it("keeps eight stress situations and ten preparation-action-feedback rows", () => {
    expect(STRESS_SITUATIONS).toHaveLength(8);
    expect(EXPERIENCE_ACTION_LADDER).toHaveLength(10);
    expect(EXPERIENCE_ACTION_LADDER[0]).toMatchObject({
      preparation: "물어보기",
      execution: "따라하기",
      feedback: "피드백 반영하기",
    });
  });

  it("returns only original substrings in the five-phase experience map", () => {
    const answer = [
      "시간이 촉박해 담당자에게 방법을 문의했습니다.",
      "업무 기준을 문서화해 직접 시도했습니다.",
      "피드백을 반영해 다시 수정하고 팀에 공유했습니다.",
      "그 결과 오류가 20% 감소해 팀 일정에 기여했습니다.",
      "배운 기준을 이후 다른 업무에도 적용했습니다.",
    ].join(" ");
    const frame = buildExperienceFrame({ question: "가장 힘들었던 경험", answer });
    expect(frame.phases).toHaveLength(5);
    expect(frame.evidenceCount).toBe(5);
    for (const phase of frame.phases) {
      if (phase.evidence) expect(answer).toContain(phase.evidence);
    }
    expect(frame.stressSituations.map(situation => situation.id)).toContain("time-pressure");
  });

  it("does not turn an abstract persistence claim into experience evidence", () => {
    const frame = buildExperienceFrame({
      question: "가장 힘들었던 경험을 말해 주세요.",
      answer: "저는 끈기가 강한 사람입니다.",
    });
    expect(frame.applicable).toBe(true);
    expect(frame.evidenceCount).toBe(0);
  });
});

