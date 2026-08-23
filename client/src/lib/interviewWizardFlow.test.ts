import { describe, expect, it } from "vitest";
import { canContinueInterviewWizard, moveInterviewSetupStep, INTERVIEW_SETUP_LABELS } from "./interviewWizard";

describe("interview wizard state progression", () => {
  it("starts at step 0 and accepts either supported intake path", () => {
    let step = 0;
    expect(INTERVIEW_SETUP_LABELS[step]).toBe("시작");

    step = moveInterviewSetupStep(step, 1);
    expect(step).toBe(1);
    expect(INTERVIEW_SETUP_LABELS[step]).toBe("지원 정보");

    expect(canContinueInterviewWizard({ company: "", position: "", hasProfileMaterial: true })).toBe(true);
    expect(canContinueInterviewWizard({ company: "테슬라", position: "AI 엔지니어", hasProfileMaterial: false })).toBe(true);
    expect(canContinueInterviewWizard({ company: "테슬라", position: "", hasProfileMaterial: false })).toBe(false);
    expect(canContinueInterviewWizard({ company: "", position: "", hasProfileMaterial: false })).toBe(false);
  });
});
