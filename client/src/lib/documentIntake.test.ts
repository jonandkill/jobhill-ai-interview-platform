import { describe, expect, it } from "vitest";
import {
  DOCUMENT_MAX_TEXT,
  isPdfSignature,
  maskDocumentText,
} from "./documentIntake";

describe("document intake safety", () => {
  it("accepts a PDF signature only when the real header is present", () => {
    expect(isPdfSignature(new TextEncoder().encode("%PDF-1.7\nfixture"))).toBe(true);
    expect(isPdfSignature(new TextEncoder().encode("not a pdf"))).toBe(false);
  });

  it("masks direct identifiers before extracted text is applied", () => {
    const masked = maskDocumentText(
      "지원자 900101-1234567, 010-1234-5678, applicant@example.com",
    );
    expect(masked).not.toContain("900101-1234567");
    expect(masked).not.toContain("010-1234-5678");
    expect(masked).not.toContain("applicant@example.com");
  });

  it("keeps the reviewed document contract bounded", () => {
    expect(DOCUMENT_MAX_TEXT).toBe(12_000);
  });
});
