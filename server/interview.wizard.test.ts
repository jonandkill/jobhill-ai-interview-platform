import { describe, expect, it } from "vitest";
import { hasInterviewProfileMaterial, normalizeGeneratedQuestion } from "./routers";

describe("interview wizard question recovery", () => {
  it("requires at least one resume or cover letter for personalized questions", () => {
    expect(hasInterviewProfileMaterial({ resume: "경력과 프로젝트" })).toBe(true);
    expect(hasInterviewProfileMaterial({ coverLetter: "지원 동기" })).toBe(true);
    expect(hasInterviewProfileMaterial({ resume: "  ", coverLetter: "" })).toBe(false);
    expect(hasInterviewProfileMaterial(null)).toBe(false);
  });
  it("extracts a question from the structured LLM response", () => {
    expect(normalizeGeneratedQuestion({ question: "최근 프로젝트에서 맡은 역할은 무엇인가요?" }, "기본 질문")).toBe(
      "최근 프로젝트에서 맡은 역할은 무엇인가요?",
    );
  });

  it("extracts text from array content without inserting an empty question", () => {
    expect(normalizeGeneratedQuestion([{ text: "갈등 상황에서" }, { text: "어떻게 조율했나요?" }], "기본 질문")).toBe(
      "갈등 상황에서 어떻게 조율했나요?",
    );
  });

  it("uses a safe fallback for null, empty, or malformed responses", () => {
    expect(normalizeGeneratedQuestion(null, "지원 동기를 말씀해 주세요.")).toBe("지원 동기를 말씀해 주세요.");
    expect(normalizeGeneratedQuestion({ question: "   " }, "지원 동기를 말씀해 주세요.")).toBe("지원 동기를 말씀해 주세요.");
    expect(normalizeGeneratedQuestion({ unexpected: 123 }, "지원 동기를 말씀해 주세요.")).toBe("지원 동기를 말씀해 주세요.");
  });

  it("bounds an unexpectedly long generated question", () => {
    const longQuestion = "질문".repeat(700);
    expect(normalizeGeneratedQuestion({ question: longQuestion }, "기본 질문")).toHaveLength(1000);
  });
});
