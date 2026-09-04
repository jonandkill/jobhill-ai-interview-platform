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

export const INTERVIEW_RUBRIC_KEYS = [
  "relevance",
  "evidence",
  "structure",
  "roleFit",
  "clarity",
] as const;
export type InterviewRubricKey = (typeof INTERVIEW_RUBRIC_KEYS)[number];
export type InterviewRubricScores = Record<InterviewRubricKey, number>;

export const INTERVIEW_RUBRIC_GUIDE: Record<InterviewRubricKey, {
  label: string;
  nextAction: string;
}> = {
  relevance: {
    label: "질문 관련성",
    nextAction: "첫 문장에서 질문에 직접 답하고, 그 결론을 뒷받침하는 근거 1개를 제시하세요.",
  },
  evidence: {
    label: "근거 구체성",
    nextAction: "본인 역할 → 실제 행동 → 확인 가능한 결과를 각각 한 문장으로 설명하세요.",
  },
  structure: {
    label: "답변 구조",
    nextAction: "결론 → 상황·과제 → 행동 → 결과 순서로 답변을 다시 구성하세요.",
  },
  roleFit: {
    label: "직무 연결",
    nextAction: "경험을 지원 직무의 실제 업무나 판단 기준 하나와 연결하세요.",
  },
  clarity: {
    label: "명료성",
    nextAction: "한 문장에는 한 메시지만 두고 반복 표현을 제거해 60~90초로 정리하세요.",
  },
};

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

export const INTERVIEW_PHASE_IDS = INTERVIEW_PHASES.map(phase => phase.id) as InterviewPhaseId[];

export function getInterviewPhaseById(id: InterviewPhaseId): InterviewPhase {
  return INTERVIEW_PHASES.find(phase => phase.id === id) ?? INTERVIEW_PHASES[0];
}

export type InterviewQuestionSource = "generated" | "prepared";

export interface InterviewPlanSlot {
  order: number;
  phaseId: InterviewPhaseId;
  questionType: InterviewPhase["questionType"];
  source: InterviewQuestionSource;
  preparedQuestionIndex?: number;
}

export interface BuildInterviewPlanInput {
  requestedTotal: number;
  preparedQuestions?: readonly string[];
  mode?: "structured" | "selected_only";
}

export function normalizePreparedQuestions(questions: readonly string[] = []): string[] {
  return Array.from(new Set(
    questions
      .map(question => question.trim())
      .filter(Boolean)
      .map(question => question.slice(0, 1_000)),
  ));
}

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

export function buildInterviewPlan({
  requestedTotal,
  preparedQuestions = [],
  mode = "structured",
}: BuildInterviewPlanInput): InterviewPlanSlot[] {
  const prepared = normalizePreparedQuestions(preparedQuestions);

  if (mode === "selected_only") {
    if (prepared.length === 0) throw new RangeError("선택 질문 재연습에는 질문이 필요합니다.");
    if (prepared.length > 10) throw new RangeError("전체 질문은 최대 10개입니다.");
    return prepared.map((_, order) => ({
      order,
      phaseId: "prepared",
      questionType: getInterviewPhaseById("prepared").questionType,
      source: "prepared",
      preparedQuestionIndex: order,
    }));
  }

  const requested = Math.max(1, Math.min(10, Math.round(requestedTotal || 5)));
  const phaseIds: InterviewPhaseId[] = requested >= 8
    ? [
        ...INTERVIEW_PHASE_IDS,
        ...(["resume", "highlight"].slice(0, requested - 8) as InterviewPhaseId[]),
      ]
    : Array.from({ length: requested }, (_, order) => getInterviewPhase(order, requested).id);

  const slots: InterviewPlanSlot[] = phaseIds.map((phaseId, order) => ({
    order,
    phaseId,
    questionType: getInterviewPhaseById(phaseId).questionType,
    source: "generated",
  }));

  if (prepared.length > 0) {
    let preparedIndex = slots.findIndex(slot => slot.phaseId === "prepared");
    if (preparedIndex < 0) {
      const basicIndex = slots.findIndex(slot => slot.phaseId === "basic");
      preparedIndex = basicIndex >= 0 ? basicIndex + 1 : 0;
      slots.splice(preparedIndex, 0, {
        order: preparedIndex,
        phaseId: "prepared",
        questionType: getInterviewPhaseById("prepared").questionType,
        source: "generated",
      });
    }
    slots.splice(
      preparedIndex,
      1,
      ...prepared.map((_, index) => ({
        order: preparedIndex + index,
        phaseId: "prepared" as const,
        questionType: getInterviewPhaseById("prepared").questionType,
        source: "prepared" as const,
        preparedQuestionIndex: index,
      })),
    );
  }

  if (slots.length > 10) {
    throw new RangeError("사전 질문을 포함한 전체 질문은 최대 10개입니다. 질문 수를 줄여주세요.");
  }
  return slots.map((slot, order) => ({ ...slot, order }));
}

export function serializeInterviewPlan(plan: readonly InterviewPlanSlot[]): string {
  return JSON.stringify({ version: 1, slots: plan });
}

export function parseInterviewPlan(value: unknown): InterviewPlanSlot[] | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as { version?: unknown; slots?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.slots) || candidate.slots.length === 0 || candidate.slots.length > 10) {
    return null;
  }
  const slots: InterviewPlanSlot[] = [];
  for (let order = 0; order < candidate.slots.length; order += 1) {
    const raw = candidate.slots[order] as Partial<InterviewPlanSlot>;
    if (
      raw.order !== order ||
      !INTERVIEW_PHASE_IDS.includes(raw.phaseId as InterviewPhaseId) ||
      (raw.source !== "generated" && raw.source !== "prepared")
    ) return null;
    if (raw.source === "prepared" && (!Number.isInteger(raw.preparedQuestionIndex) || (raw.preparedQuestionIndex ?? -1) < 0)) {
      return null;
    }
    const phase = getInterviewPhaseById(raw.phaseId as InterviewPhaseId);
    slots.push({
      order,
      phaseId: phase.id,
      questionType: phase.questionType,
      source: raw.source,
      ...(raw.source === "prepared" ? { preparedQuestionIndex: raw.preparedQuestionIndex } : {}),
    });
  }
  return slots;
}

export function summarizeRubricCheckpoint(
  attempts: Array<{ rubricScores?: InterviewRubricScores | null }>,
) {
  const latest = attempts.slice(-3);
  const complete = latest.filter(attempt =>
    attempt.rubricScores &&
    INTERVIEW_RUBRIC_KEYS.every(key => Number.isFinite(attempt.rubricScores?.[key])),
  );
  if (latest.length < 3 || complete.length < 3) {
    return { insufficientData: true as const, averages: null, weakest: null };
  }
  const averages = Object.fromEntries(
    INTERVIEW_RUBRIC_KEYS.map(key => [
      key,
      Math.round(
        complete.reduce((sum, attempt) => sum + (attempt.rubricScores?.[key] ?? 0), 0) / complete.length * 10,
      ) / 10,
    ]),
  ) as InterviewRubricScores;
  const weakestKey = INTERVIEW_RUBRIC_KEYS.reduce((lowest, key) =>
    averages[key] < averages[lowest] ? key : lowest,
  );
  return {
    insufficientData: false as const,
    averages,
    weakest: {
      key: weakestKey,
      score: averages[weakestKey],
      ...INTERVIEW_RUBRIC_GUIDE[weakestKey],
    },
  };
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
