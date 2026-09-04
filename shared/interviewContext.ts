export interface InterviewContextInput {
  resume?: unknown;
  coverLetter?: unknown;
  targetCompany?: unknown;
  targetPosition?: unknown;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasInterviewDocument(input: InterviewContextInput | null | undefined): boolean {
  return Boolean(input && (hasText(input.resume) || hasText(input.coverLetter)));
}

export function hasInterviewTarget(input: InterviewContextInput | null | undefined): boolean {
  return Boolean(input && hasText(input.targetCompany) && hasText(input.targetPosition));
}

/**
 * A mock interview can start from either applicant documents or a complete
 * company/position pair. A lone company or position is intentionally not
 * enough because it produces ambiguous job questions.
 */
export function hasInterviewContext(input: InterviewContextInput | null | undefined): boolean {
  return hasInterviewDocument(input) || hasInterviewTarget(input);
}
