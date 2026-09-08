export const GAME_STORAGE_TYPES = ["rps", "rotation", "numberClick", "pathMaking"] as const;
export type GameStorageType = (typeof GAME_STORAGE_TYPES)[number];

export const ADAPTIVE_GAME_MODES = [
  "goNoGo",
  "stroop",
  "nBack",
  "symbolSearch",
  "sequenceMemory",
  "ruleSwitch",
  "visualMemory",
  "estimation",
  "arithmetic",
  "dualAttention",
  "riskChoice",
] as const;
export type AdaptiveGameMode = (typeof ADAPTIVE_GAME_MODES)[number];

export const GAME_ASSESSMENT_IDS = [
  "rps",
  "rotation",
  "numberClick",
  "pathMaking",
  ...ADAPTIVE_GAME_MODES,
] as const;
export type GameAssessmentId = (typeof GAME_ASSESSMENT_IDS)[number];

export type GameAssessmentDefinition = {
  id: GameAssessmentId;
  title: string;
  description: string;
  measures: string;
  caution: string;
  interpretation: string;
  improvement: string;
  storageType: GameStorageType;
  component: "legacy" | "adaptive";
  mode?: AdaptiveGameMode;
};

export const GAME_ASSESSMENTS: readonly GameAssessmentDefinition[] = [
  { id: "rps", title: "빠른 판단", description: "바뀌는 규칙을 확인한 뒤 알맞게 반응합니다.", measures: "규칙별 성공률과 전환 직후 오류", caution: "속도보다 현재 규칙 확인을 우선하세요.", interpretation: "이번 연습에서 규칙 변경 전후의 정답 수를 비교합니다.", improvement: "응답 전에 화면의 현재 규칙을 한 번 읽는 루틴을 반복하세요.", storageType: "rps", component: "legacy" },
  { id: "rotation", title: "도형 회전", description: "회전된 도형의 일치 여부를 판단합니다.", measures: "도형 비교의 정확도와 시도 수", caution: "화면 크기와 시각 조건이 결과에 영향을 줄 수 있습니다.", interpretation: "이번 연습에서 도형을 비교해 맞힌 횟수만 확인합니다.", improvement: "기준 꼭짓점 하나를 정하고 90도씩 추적해 보세요.", storageType: "rotation", component: "legacy" },
  { id: "numberClick", title: "순차 숫자", description: "숫자를 순서대로 찾아 누릅니다.", measures: "오클릭과 완료시간", caution: "기기 크기와 입력 방식이 시간에 영향을 줍니다.", interpretation: "이번 연습의 오클릭과 완료시간을 자신의 이전 시도와 비교합니다.", improvement: "왼쪽부터 일정한 방향으로 구역을 나눠 탐색하세요.", storageType: "numberClick", component: "legacy" },
  { id: "pathMaking", title: "경로 설계", description: "장애물을 피해 목표 경로를 만듭니다.", measures: "완성한 경로의 길이와 되돌림", caution: "터치·마우스 입력 차이가 결과에 영향을 줄 수 있습니다.", interpretation: "이번 연습에서 만든 경로의 효율만 확인합니다.", improvement: "출발 전에 목표까지의 큰 방향과 우회 지점을 먼저 정하세요.", storageType: "pathMaking", component: "legacy" },
  { id: "goNoGo", title: "신호 관제실", description: "지정 신호에는 응답하고 중지 신호에는 대기합니다.", measures: "목표 누락과 중지 신호 오반응", caution: "운동·시각 조건과 기기 지연의 영향을 받을 수 있습니다.", interpretation: "이번 8문항의 목표 누락과 중지 오류를 나누어 봅니다.", improvement: "3초 호흡 → 기준 확인 → 응답 순서로 연습하세요.", storageType: "rps", component: "adaptive", mode: "goNoGo" },
  { id: "stroop", title: "방해 신호 찾기", description: "글자의 뜻을 무시하고 실제 표시 색을 선택합니다.", measures: "간섭 조건의 규칙 유지 정확도", caution: "색각·저시력 사용자는 결과 해석에 주의가 필요합니다.", interpretation: "이번 연습에서 표시 색 규칙을 유지한 문항 수를 확인합니다.", improvement: "글자 뜻보다 표시 색을 먼저 명명한 뒤 선택하세요.", storageType: "rps", component: "adaptive", mode: "stroop" },
  { id: "nBack", title: "업데이트 메모", description: "현재 기호를 두 단계 전 기호와 비교합니다.", measures: "일치 신호 적중과 오경보", caution: "작업기억을 지능이나 직무능력으로 해석하지 않습니다.", interpretation: "이번 8문항에서 두 단계 전 정보를 갱신한 정확도를 봅니다.", improvement: "최근 두 기호를 작은 묶음으로 소리 없이 반복하세요.", storageType: "numberClick", component: "adaptive", mode: "nBack" },
  { id: "symbolSearch", title: "패턴 대조소", description: "여러 기호에서 목표 기호의 수를 찾습니다.", measures: "개수 오차와 탐색시간", caution: "화면 크기·저시력·미세운동 조건의 영향을 받을 수 있습니다.", interpretation: "이번 연습의 개수 오차와 응답시간을 따로 확인합니다.", improvement: "왼쪽에서 오른쪽으로 한 번씩 일정하게 훑으세요.", storageType: "numberClick", component: "adaptive", mode: "symbolSearch" },
  { id: "sequenceMemory", title: "업무 동선 복원", description: "제시된 기호 순서를 본 뒤 같은 순서를 찾습니다.", measures: "순서 재인과 위치 교환 오류", caution: "시각 기억만으로 개인의 능력을 단정하지 않습니다.", interpretation: "이번 연습에서 순서를 그대로 재인한 문항 수를 확인합니다.", improvement: "기호를 2~3개 단위로 묶고 시작–중간–끝으로 기억하세요.", storageType: "numberClick", component: "adaptive", mode: "sequenceMemory" },
  { id: "ruleSwitch", title: "규칙 전환 분류대", description: "문항마다 표시된 분류 규칙을 적용합니다.", measures: "규칙 전환 뒤 정확도", caution: "색상만이 아니라 텍스트 규칙을 함께 제공합니다.", interpretation: "이번 연습에서 바뀐 규칙을 적용한 정답 수를 확인합니다.", improvement: "문항마다 규칙을 한 문장으로 재진술한 뒤 선택하세요.", storageType: "rps", component: "adaptive", mode: "ruleSwitch" },
  { id: "visualMemory", title: "시각 기억 보드", description: "도형 배열을 본 뒤 같은 배열을 찾습니다.", measures: "위치·모양의 재인 정확도", caution: "시각 조건과 화면 크기에 영향을 받는 연습입니다.", interpretation: "이번 연습에서 위치와 모양을 함께 재인한 문항 수를 봅니다.", improvement: "위치와 모양을 하나의 쌍으로 묶어 기억하세요.", storageType: "rotation", component: "adaptive", mode: "visualMemory" },
  { id: "estimation", title: "수량 추정대", description: "잠깐 확인한 수량과 가장 가까운 값을 고릅니다.", measures: "제시 수량과 선택값의 오차", caution: "시각·화면 조건이 결과에 영향을 줄 수 있습니다.", interpretation: "이번 연습에서 가까운 범위를 선택한 문항 수를 확인합니다.", improvement: "5개 또는 10개 묶음으로 나눠 전체 수량을 추정하세요.", storageType: "numberClick", component: "adaptive", mode: "estimation" },
  { id: "arithmetic", title: "암산 갱신", description: "간단한 업무 수량 계산을 정확하게 수행합니다.", measures: "연산 정확도와 응답시간", caution: "교육 경험을 포함한 여러 요인의 영향을 받습니다.", interpretation: "이번 연습에서 계산을 정확히 완료한 문항 수를 봅니다.", improvement: "연산 순서를 고정하고 마지막에 한 번 검산하세요.", storageType: "numberClick", component: "adaptive", mode: "arithmetic" },
  { id: "dualAttention", title: "이중 채널 인박스", description: "숫자와 기호의 두 조건을 순서대로 확인합니다.", measures: "복수 조건 적용의 정확도", caution: "한 조건만 보고 빠르게 응답하지 마세요.", interpretation: "이번 연습에서 두 조건을 모두 적용한 정답 수를 확인합니다.", improvement: "첫째 조건 → 둘째 조건 → 최종 판단 순의 체크 루틴을 쓰세요.", storageType: "rps", component: "adaptive", mode: "dualAttention" },
  { id: "riskChoice", title: "업무 우선순위 판단", description: "안전·품질·납기 조건을 보고 먼저 할 행동을 고릅니다.", measures: "공개된 우선순위 기준의 적용 정확도", caution: "개인의 위험 성향이나 성격을 추론하지 않습니다.", interpretation: "이번 연습에서 화면에 제시된 안전·품질 우선 기준을 적용한 문항 수를 봅니다.", improvement: "최소 안전선 확인 → 영향도 확인 → 납기 조정 순으로 판단하세요.", storageType: "pathMaking", component: "adaptive", mode: "riskChoice" },
] as const;

export const GAME_ASSESSMENT_BY_ID = Object.fromEntries(
  GAME_ASSESSMENTS.map((assessment) => [assessment.id, assessment]),
) as Record<GameAssessmentId, GameAssessmentDefinition>;

export function isGameAssessmentId(value: unknown): value is GameAssessmentId {
  return typeof value === "string" && (GAME_ASSESSMENT_IDS as readonly string[]).includes(value);
}

export function getStoredAssessmentId(storageType: string, metadata: unknown): GameAssessmentId | null {
  if (typeof metadata === "string" && metadata.length <= 8192) {
    try {
      const parsed = JSON.parse(metadata) as { assessmentType?: unknown };
      if (isGameAssessmentId(parsed?.assessmentType)) return parsed.assessmentType;
    } catch {
      // Legacy rows can contain non-JSON metadata; use their storage type below.
    }
  }
  return isGameAssessmentId(storageType) ? storageType : null;
}

export function calculatePracticeScore(correct: number, totalTrials: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(totalTrials) || totalTrials <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct / totalTrials) * 100)));
}

export function describePracticeResult(score: number): string {
  if (score >= 88) return "이번 문항에서는 기준을 안정적으로 적용했습니다.";
  if (score >= 63) return "이번 문항에서는 기준을 대체로 적용했지만 일부 오류가 있었습니다.";
  return "이번 문항에서는 기준 확인 루틴을 천천히 다시 연습하는 편이 좋습니다.";
}
