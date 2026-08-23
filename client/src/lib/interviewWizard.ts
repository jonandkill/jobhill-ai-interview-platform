export const INTERVIEW_SETUP_LABELS = [
  "시작",
  "지원 정보",
  "면접 단계",
  "면접 모드",
  "면접관",
  "시간 설정",
  "준비 완료",
] as const;

export type InterviewSetupStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function moveInterviewSetupStep(current: InterviewSetupStep, direction: 1 | -1): InterviewSetupStep {
  const next = Math.max(0, Math.min(INTERVIEW_SETUP_LABELS.length - 1, current + direction));
  return next as InterviewSetupStep;
}

export function canContinueInterviewWizard(input: {
  company: string;
  position: string;
  hasProfileMaterial: boolean;
}): boolean {
  const hasCompleteTarget = Boolean(input.company.trim() && input.position.trim());
  return input.hasProfileMaterial || hasCompleteTarget;
}

export function getQuestionRecoveryMessage(timedOut: boolean): string {
  return timedOut
    ? "질문 준비가 예상보다 오래 걸리고 있습니다. 다시 시도하거나 텍스트 질문으로 진행해 주세요."
    : "맞춤 질문을 준비하지 못했습니다. 다시 시도하거나 텍스트 질문으로 진행할 수 있습니다.";
}
