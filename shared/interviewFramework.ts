export type InterviewPhaseId =
  | "basic"
  | "prepared"
  | "resume"
  | "highlight"
  | "performance"
  | "operations"
  | "horizon"
  | "fit";

export interface InterviewPhase {
  id: InterviewPhaseId;
  label: string;
  questionType: "personality" | "experience" | "technical" | "situational" | "company";
  purpose: string;
  promptGuide: string;
}

export const INTERVIEW_PHASES: InterviewPhase[] = [
  {
    id: "basic",
    label: "인적성·기본",
    questionType: "personality",
    purpose: "지원 동기, 직업관, 기본적인 자기 인식을 확인",
    promptGuide: "자기소개·지원 동기·장단점 중 아직 묻지 않은 하나를 짧게 질문한다.",
  },
  {
    id: "prepared",
    label: "사전 질문지",
    questionType: "situational",
    purpose: "기업 또는 관리자가 지정한 필수 질문 확인",
    promptGuide: "선택 질문지가 있으면 그 순서를 우선하고, 없으면 직무의 필수 상황 질문을 사용한다.",
  },
  {
    id: "resume",
    label: "이력서·자기소개서",
    questionType: "experience",
    purpose: "문서에 실제로 적힌 역할·행동·결과 검증",
    promptGuide: "문서에서 구체적인 한 꼭지만 인용 없이 지목하고 본인의 역할과 행동을 묻는다.",
  },
  {
    id: "highlight",
    label: "강조 꼭지",
    questionType: "experience",
    purpose: "문서에서 반복되거나 도드라진 주장 검증",
    promptGuide: "반복 강조된 주장을 찾아 사실 근거, 본인 기여, 수치의 산출 기준 중 하나를 확인한다.",
  },
  {
    id: "performance",
    label: "성과·품질·안전",
    questionType: "technical",
    purpose: "성과와 안전·품질 판단 기준을 분리해 확인",
    promptGuide: "성과, 안전, 품질 중 문서 근거가 있는 한 축을 고르고 기준·조치·검증 방법을 묻는다.",
  },
  {
    id: "operations",
    label: "생산·리드타임·동선·로스",
    questionType: "technical",
    purpose: "업무 흐름과 개선 사고 확인",
    promptGuide: "생산성, 리드타임, 동선, 로스 중 직무와 관련된 한 축의 현상 파악과 개선 순서를 묻는다.",
  },
  {
    id: "horizon",
    label: "기간·등급·관리",
    questionType: "situational",
    purpose: "단기·중기·장기 우선순위와 관리 방식 확인",
    promptGuide: "단기 대응, 중기 표준화, 장기 예방 또는 등급별 관리 기준을 구분해서 답하도록 질문한다.",
  },
  {
    id: "fit",
    label: "직무·조직 적합",
    questionType: "company",
    purpose: "직무 수행 방식과 조직 협업 기준 확인",
    promptGuide: "성격을 단정하지 말고 실제 협업 행동, 직무 선택 기준, 입사 후 기여 계획을 묻는다.",
  },
];

const SHORT_SESSION_PHASES: Record<number, InterviewPhaseId[]> = {
  1: ["resume"],
  2: ["basic", "fit"],
  3: ["basic", "resume", "fit"],
  4: ["basic", "resume", "performance", "fit"],
  5: ["basic", "prepared", "resume", "performance", "fit"],
  6: ["basic", "prepared", "resume", "highlight", "operations", "fit"],
  7: ["basic", "prepared", "resume", "highlight", "performance", "horizon", "fit"],
};

export function getInterviewPhase(questionOrder: number, totalQuestions: number): InterviewPhase {
  const safeTotal = Math.max(1, Math.min(20, Math.round(totalQuestions || 5)));
  const safeOrder = Math.max(0, Math.min(safeTotal - 1, Math.round(questionOrder || 0)));
  const ids = SHORT_SESSION_PHASES[safeTotal] ?? INTERVIEW_PHASES.map((phase) => phase.id);
  const id = ids[safeOrder % ids.length];
  return INTERVIEW_PHASES.find((phase) => phase.id === id) ?? INTERVIEW_PHASES[0];
}

export const EMPHASIS_AXES = [
  ["evidence", "근거", ["수치", "근거", "확인", "검증", "측정"]],
  ["performance", "성과", ["성과", "달성", "개선", "향상", "감소"]],
  ["safety", "안전", ["안전", "위험", "사고", "보호", "예방"]],
  ["quality", "품질", ["품질", "불량", "검사", "표준", "오차"]],
  ["production", "생산", ["생산", "공정", "설비", "작업", "라인"]],
  ["leadTime", "리드타임", ["리드타임", "시간", "납기", "대기", "지연"]],
  ["movement", "동선", ["동선", "배치", "이동", "거리", "흐름"]],
  ["loss", "로스", ["로스", "낭비", "손실", "재작업", "폐기"]],
  ["management", "관리", ["관리", "점검", "기록", "교육", "모니터링"]],
  ["fit", "적합도", ["협업", "소통", "직무", "조직", "기여"]],
] as const;

export type EmphasisAxisId = (typeof EMPHASIS_AXES)[number][0];

export function analyzeAnswerEmphasis(answers: string[]) {
  const text = answers.join(" ").toLowerCase();
  const counts = EMPHASIS_AXES.map(([id, label, keywords]) => ({
    id,
    label,
    count: keywords.reduce((sum, keyword) => sum + (text.split(keyword).length - 1), 0),
  }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const weighted = counts.map((item) => ({
    ...item,
    share: total ? Math.round((item.count / total) * 100) : 0,
  }));
  return {
    axes: weighted,
    strongest: [...weighted].sort((a, b) => b.count - a.count)[0] ?? null,
    missing: weighted.filter((item) => item.count === 0).map((item) => item.label),
  };
}

