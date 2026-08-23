import { describe, expect, it } from "vitest";
import {
  GAME_ASSESSMENTS,
  GAME_ASSESSMENT_IDS,
  GAME_STORAGE_TYPES,
  calculatePracticeScore,
  getStoredAssessmentId,
} from "./gameAssessments";

describe("game assessment catalog", () => {
  it("defines exactly 15 unique assessments with valid storage mappings", () => {
    expect(GAME_ASSESSMENTS).toHaveLength(15);
    expect(new Set(GAME_ASSESSMENT_IDS).size).toBe(15);
    expect(GAME_ASSESSMENTS.every((item) => GAME_STORAGE_TYPES.includes(item.storageType))).toBe(true);
  });

  it("preserves exact assessment ids from bounded metadata", () => {
    expect(getStoredAssessmentId("rps", JSON.stringify({ assessmentType: "stroop" }))).toBe("stroop");
    expect(getStoredAssessmentId("rotation", "not-json")).toBe("rotation");
    expect(getStoredAssessmentId("unknown", JSON.stringify({ assessmentType: "not-a-game" }))).toBeNull();
  });

  it("keeps practice scores within 0 to 100", () => {
    expect(calculatePracticeScore(7, 8)).toBe(88);
    expect(calculatePracticeScore(20, 8)).toBe(100);
    expect(calculatePracticeScore(-1, 8)).toBe(0);
    expect(calculatePracticeScore(2, 0)).toBe(0);
  });
});
