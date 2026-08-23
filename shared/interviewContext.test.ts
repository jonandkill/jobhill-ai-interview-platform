import { describe, expect, it } from "vitest";
import {
  hasInterviewContext,
  hasInterviewDocument,
  hasInterviewTarget,
} from "./interviewContext";

describe("interview context", () => {
  it("accepts a resume or cover letter without a target company", () => {
    expect(hasInterviewContext({ resume: "설비 개선 경험" })).toBe(true);
    expect(hasInterviewContext({ coverLetter: "지원 동기" })).toBe(true);
  });

  it("accepts a complete company and position pair without documents", () => {
    expect(hasInterviewContext({ targetCompany: "현대자동차", targetPosition: "생산" })).toBe(true);
  });

  it("rejects blank documents and an incomplete target pair", () => {
    expect(hasInterviewDocument({ resume: "  ", coverLetter: "" })).toBe(false);
    expect(hasInterviewTarget({ targetCompany: "현대자동차", targetPosition: "" })).toBe(false);
    expect(hasInterviewContext({ targetCompany: "", targetPosition: "생산" })).toBe(false);
    expect(hasInterviewContext(null)).toBe(false);
  });
});
