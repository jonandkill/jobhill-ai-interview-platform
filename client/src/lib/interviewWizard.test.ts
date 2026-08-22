import { describe, expect, it } from "vitest";
import {
  canContinueInterviewWizard,
  getQuestionRecoveryMessage,
  INTERVIEW_SETUP_LABELS,
  moveInterviewSetupStep,
} from "./interviewWizard";

describe("interview setup wizard", () => {
  it("moves one step at a time and clamps at the first and last step", () => {
    expect(moveInterviewSetupStep(0, -1)).toBe(0);
    expect(moveInterviewSetupStep(0, 1)).toBe(1);
    expect(moveInterviewSetupStep(6, 1)).toBe(6);
    expect(moveInterviewSetupStep(6, -1)).toBe(5);
    expect(INTERVIEW_SETUP_LABELS).toHaveLength(7);
  });

  it("requires company, position, and at least one profile document", () => {
    expect(canContinueInterviewWizard({ company: "삼성전자", position: "개발", hasProfileMaterial: true })).toBe(true);
    expect(canContinueInterviewWizard({ company: "", position: "개발", hasProfileMaterial: true })).toBe(false);
    expect(canContinueInterviewWizard({ company: "삼성전자", position: "개발", hasProfileMaterial: false })).toBe(false);
  });

  it("provides different recovery instructions for timeout and error", () => {
    expect(getQuestionRecoveryMessage(true)).toContain("오래 걸리고");
    expect(getQuestionRecoveryMessage(false)).toContain("다시 시도");
  });
});
