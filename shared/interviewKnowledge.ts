export type InterviewKnowledgeCategory = "basic" | "frequent" | "role" | "experience" | "pressure";

export interface InterviewKnowledgeItem {
  id: string;
  category: InterviewKnowledgeCategory;
  categoryLabel: string;
  question: string;
  intent: string;
  guidance: string;
  keywords: string;
}

export interface InterviewKnowledgeMatch extends InterviewKnowledgeItem {
  score: number;
  matchedTerms: string[];
}

export interface ExperienceEvidenceItem {
  id: string;
  label: string;
  evidence: string;
}

export interface ExperiencePhaseEvidence {
  id: "preparation" | "execution" | "feedback" | "outcome" | "transfer";
  label: string;
  status: "supported" | "missing";
  evidence: string;
  guidance: string;
}

export interface ExperienceFrame {
  applicable: boolean;
  knowledgeMatches: InterviewKnowledgeMatch[];
  stressSituations: ExperienceEvidenceItem[];
  phases: ExperiencePhaseEvidence[];
  evidenceCount: number;
}

const CATEGORY_LABELS: Record<InterviewKnowledgeCategory, string> = {
  basic: "기본 질문",
  frequent: "자주 나오는 질문",
  role: "직무역량 질문",
  experience: "경험·상황 질문",
  pressure: "압박 질문",
};

function item(
  id: string,
  category: InterviewKnowledgeCategory,
  question: string,
  intent: string,
  guidance: string,
  keywords: string,
): InterviewKnowledgeItem {
  return { id, category, categoryLabel: CATEGORY_LABELS[category], question, intent, guidance, keywords };
}

// 첨부된 2021년 면접질문 30선의 질문 유형과 답변 의도만 구조화합니다.
// 예시 답안을 복제하거나 사용자가 말하지 않은 경력·수치·성과를 만들지 않습니다.
export const INTERVIEW_QUESTION_KNOWLEDGE: InterviewKnowledgeItem[] = [
  item("basic-hobby", "basic", "취미는 무엇입니까?", "지속하는 활동과 일상 회복 방식을 확인", "활동 자체보다 시작 계기, 지속 방식, 배운 태도를 짧게 연결합니다.", "취미 여가 활동 꾸준 지속"),
  item("basic-specialty", "basic", "특기는 무엇입니까?", "반복해 익힌 강점과 활용 장면을 확인", "특기를 주장하지 말고 실제로 활용한 장면과 주변에 준 도움을 제시합니다.", "특기 잘하는 것 능력 활용"),
  item("basic-strength-weakness", "basic", "성격의 장단점은 무엇입니까?", "행동으로 확인되는 장점과 보완 습관을 확인", "성격을 단정하기보다 장점이 드러난 행동과 단점을 관리하는 실제 습관을 말합니다.", "장점 단점 강점 약점 성격 보완"),
  item("basic-role-model", "basic", "존경하는 인물은 누구입니까?", "선택한 가치 기준과 실천 방식을 확인", "유명세보다 존경하는 구체 행동 한 가지와 본인이 적용한 장면을 연결합니다.", "존경 인물 가치 기준 본받은"),
  item("basic-aspiration", "basic", "입사 후 포부는 무엇입니까?", "초기 기여와 성장 계획의 현실성을 확인", "단기 적응, 중기 기여, 장기 확장 순서로 직무 행동을 구체화합니다.", "입사 후 포부 기여 목표 단기 중기 장기"),
  item("basic-vision", "basic", "꿈과 비전은 무엇입니까?", "장기 방향과 현재 준비의 연결을 확인", "거창한 목표보다 현재 지속 중인 준비와 다음 검증 단계를 말합니다.", "꿈 비전 목표 미래 준비"),
  item("basic-parents", "basic", "부모님을 소개해 주세요.", "가정 배경보다 배운 가치와 본인 행동을 확인", "가족 개인정보는 최소화하고 배운 태도와 실천 사례만 연결합니다.", "부모님 가족 가치 배운 점"),
  item("basic-sport", "basic", "좋아하는 운동은 무엇입니까?", "건강관리·협업·지속 습관을 확인", "운동 이름보다 빈도, 맡은 역할, 꾸준히 유지한 방법을 사실대로 말합니다.", "운동 스포츠 체력 팀워크 꾸준"),

  item("frequent-last-word", "frequent", "마지막으로 하고 싶은 말이 있습니까?", "핵심 강점과 지원 의지를 압축 확인", "새 이야기를 늘리지 말고 직무 기여 근거 한 가지와 감사 인사를 짧게 정리합니다.", "마지막 한마디 끝으로 하고 싶은 말"),
  item("frequent-other-companies", "frequent", "다른 회사에도 지원했습니까?", "지원 기준의 일관성과 선택 이유를 확인", "지원 사실을 숨기지 말고 공통 직무 기준과 이 회사에서 확인한 차이를 설명합니다.", "타사 다른 회사 지원 중복 지원"),
  item("frequent-company-knowledge", "frequent", "우리 회사에 대해 아는 점을 말해 주세요.", "기업 이해와 직무 연결을 확인", "검증된 회사 정보만 사용하고 그 사실이 지원 직무에 주는 의미를 연결합니다.", "당사 회사 아는 점 기업 이해 사업"),
  item("frequent-local-work", "frequent", "지방 근무가 가능합니까?", "근무 조건에 대한 현실적 준비를 확인", "가능 여부를 솔직히 밝히고 이동·주거·가족 협의 등 확인된 준비만 말합니다.", "지방 근무 지역 이동 가능"),
  item("frequent-drinking", "frequent", "주량은 어느 정도입니까?", "회식 질문에서 자기관리와 협업 태도를 확인", "음주량을 과시하지 말고 건강·안전 기준과 비음주 소통 방식도 존중합니다.", "주량 술 음주 회식"),
  item("frequent-hardest", "frequent", "가장 힘들거나 어려웠던 경험은 무엇입니까?", "제약 속 대응·지속·회복 과정을 확인", "어려움보다 준비–실행–피드백–결과와 이후 다른 상황 적용을 보여줍니다.", "힘든 어려운 경험 스트레스 실패 극복"),
  item("frequent-company-pros-cons", "frequent", "우리 회사의 장단점은 무엇이라고 생각합니까?", "기업 분석의 균형과 개선 관점을 확인", "최신 검증 정보로 강점과 과제를 균형 있게 말하고 지원 직무의 기여 가능성을 연결합니다.", "당사 회사 장단점 강점 약점 개선"),

  item("role-career", "role", "관련 경력을 설명해 주세요.", "직무 관련 역할·행동·성과를 검증", "경력 나열보다 본인 범위, 판단 기준, 직접 행동, 확인 결과를 한 경험으로 증명합니다.", "경력 업무 담당 역할 성과"),
  item("role-intern", "role", "인턴 경험을 설명해 주세요.", "제한된 권한 안에서의 학습과 기여를 확인", "보조 업무도 관찰–질문–시도–피드백 반영–팀 기여 순서로 구체화합니다.", "인턴 실습 현장 경험 배움"),
  item("role-strength", "role", "본인의 장점이나 강점은 무엇입니까?", "강점을 실제 직무 행동으로 검증", "강점 이름보다 스트레스 상황에서 반복한 행동과 확인 가능한 결과를 말합니다.", "강점 장점 역량 직무 경험"),
  item("role-contribution", "role", "입사 후 회사에 어떻게 기여할 수 있습니까?", "경험에서 검증된 역량의 직무 전이를 확인", "이미 해 본 행동 A를 지원 직무의 B·C 과제에 어떻게 조정 적용할지 설명합니다.", "입사 기여 직무 적용 성과"),
  item("role-major", "role", "전공이 지원 분야에 어떻게 도움이 됩니까?", "전공지식의 실제 업무 적용을 확인", "과목명을 나열하지 말고 배운 원리, 적용 과제, 검증 결과, 직무 활용을 연결합니다.", "전공 지원 분야 도움 지식 적용"),

  item("experience-parttime", "experience", "아르바이트 경험을 말해 주세요.", "기본 업무태도·고객·협업 경험을 확인", "작은 업무라도 제약 상황, 맡은 범위, 개선 행동, 동료나 고객에게 준 변화를 말합니다.", "아르바이트 알바 고객 서비스 경험"),
  item("experience-project", "experience", "프로젝트 경험을 말해 주세요.", "목표·역할·문제해결·협업을 확인", "팀 결과와 본인 행동을 분리하고 준비–실행–보완–검증 순서로 설명합니다.", "프로젝트 과제 팀 역할 문제 해결"),
  item("experience-volunteer", "experience", "봉사활동 경험을 말해 주세요.", "참여 동기와 실제 기여·지속성을 확인", "선의를 과장하지 말고 맡은 일, 대상의 필요 확인, 보완, 지속한 행동을 제시합니다.", "봉사활동 참여 기여 지속"),
  item("experience-union", "experience", "노동조합에 대해 어떻게 생각합니까?", "노사관계에 대한 균형·법규·소통 기준을 확인", "찬반 단정 대신 법과 절차를 존중하며 안전·근로조건·조직 지속성을 함께 보는 기준을 말합니다.", "노동조합 노조 노사관계 법 절차 소통"),

  item("pressure-grades", "pressure", "학점이 좋지 않은 이유는 무엇입니까?", "약점 인정과 이후 보완 행동을 확인", "배경 설명은 짧게 하고 이후 학습 습관, 결과, 현재 검증 근거를 중심으로 말합니다.", "학점 낮은 성적 이유 보완"),
  item("pressure-gap", "pressure", "졸업 후 지금까지 무엇을 했습니까?", "공백기의 목적·행동·변화를 확인", "공백을 숨기지 말고 기간별 행동, 산출물, 배운 점, 현재 준비 상태를 말합니다.", "졸업 공백 기간 취업 준비"),
  item("pressure-hard-work", "pressure", "업무가 힘들어도 수행할 수 있습니까?", "막연한 의지 대신 지속 행동 근거를 확인", "‘할 수 있다’보다 실제 장애, 도움 요청, 전략 수정, 끝까지 확인한 결과를 제시합니다.", "힘든 업무 할 수 스트레스 지속 끈기"),
  item("pressure-english", "pressure", "영어 실력은 어느 정도입니까?", "업무에 필요한 현재 수준과 학습 계획을 확인", "점수만 과장하지 말고 읽기·쓰기·말하기별 실제 사용 경험과 보완 방법을 구분합니다.", "영어 실력 회화 독해 업무"),
  item("pressure-toeic", "pressure", "토익 점수가 낮은 이유는 무엇입니까?", "낮은 지표에 대한 책임과 개선을 확인", "변명보다 원인 판단, 학습 방식 변경, 최근 확인 결과를 사실대로 말합니다.", "토익 점수 낮은 이유 영어 보완"),
  item("pressure-company-image", "pressure", "우리 회사의 이미지는 어떻습니까?", "외부 인식과 지원자 관점의 근거를 확인", "막연한 호감보다 검증한 사업·제품·채용 정보와 지원 직무의 의미를 연결합니다.", "당사 회사 이미지 인상 기업"),
];

function koreanTokens(value: string): string[] {
  const normalized = value.normalize("NFC").toLowerCase().replace(/[^가-힣a-z0-9]+/g, " ").trim().slice(0, 1_500);
  if (!normalized) return [];
  const tokens = new Set<string>();
  for (const word of normalized.split(/\s+/).slice(0, 120)) {
    if (word.length >= 2) tokens.add(word);
    if (/^[가-힣]+$/.test(word)) {
      for (let index = 0; index < word.length - 1; index += 1) tokens.add(word.slice(index, index + 2));
    }
  }
  return Array.from(tokens);
}

function tokenScore(queryTokens: readonly string[], field: string, weight: number) {
  const fieldTokens = new Set(koreanTokens(field));
  let score = 0;
  for (const token of queryTokens) {
    if (fieldTokens.has(token)) score += token.length >= 3 ? weight * 1.5 : weight;
  }
  return score;
}

export function searchInterviewKnowledge(query: string, limit = 2): InterviewKnowledgeMatch[] {
  const normalized = query.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 1_500);
  if (!normalized) return [];
  const queryTokens = koreanTokens(normalized);
  return INTERVIEW_QUESTION_KNOWLEDGE
    .map(knowledge => {
      const matchedTerms = queryTokens.filter(token =>
        koreanTokens(knowledge.question + " " + knowledge.keywords).includes(token),
      );
      const exactBonus = normalized.includes(knowledge.question.replace(/[?]/g, "")) ? 20 : 0;
      const score = exactBonus
        + tokenScore(queryTokens, knowledge.question, 5)
        + tokenScore(queryTokens, knowledge.keywords, 3)
        + tokenScore(queryTokens, knowledge.intent, 2)
        + tokenScore(queryTokens, knowledge.guidance, 1);
      return { ...knowledge, score: Math.round(score * 100) / 100, matchedTerms };
    })
    .filter(match => match.score >= 2)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, Math.max(1, Math.min(limit, 3)));
}

export const STRESS_SITUATIONS = [
  { id: "method-unknown", label: "방법을 잘 모를 때", pattern: /(방법.{0,8}모르|어떻게.{0,8}모르|지식.{0,5}부족|경험.{0,5}없|처음 맡)/ },
  { id: "time-pressure", label: "시간이 촉박할 때", pattern: /(시간.{0,8}촉박|마감|기한|납기|짧은 시간|급하게)/ },
  { id: "work-overload", label: "업무가 한꺼번에 가중될 때", pattern: /(한꺼번|동시에.{0,12}(업무|과제)|업무.{0,8}(과중|몰리|가중)|여러 업무|우선순위)/ },
  { id: "long-duration", label: "시간이 많이 걸릴 때", pattern: /(시간.{0,8}많이 걸|오래 걸|장기|지연|\d+\s*(?:주|개월|년))/ },
  { id: "working-alone", label: "혼자 수행하고 조력자가 없을 때", pattern: /(혼자|단독|협력자.{0,5}없|조력자.{0,5}없|도움.{0,5}없)/ },
  { id: "no-reward", label: "적절한 보상이 없을 때", pattern: /(보상.{0,8}없|인정.{0,8}못|성과급.{0,8}없)/ },
  { id: "new-environment", label: "처음 마주하는 환경", pattern: /(처음.{0,12}(환경|현장|업무)|새로운 환경|낯선|첫 현장)/ },
  { id: "changing-work", label: "주어진 업무가 자주 바뀔 때", pattern: /(업무.{0,8}자주 바|일.{0,8}바뀌|요구.{0,8}변경|잦은 변경|변동)/ },
] as const;

export const EXPERIENCE_ACTION_LADDER = [
  { preparation: "물어보기", execution: "따라하기", feedback: "피드백 반영하기" },
  { preparation: "시키는 대로 하기", execution: "시도하기", feedback: "재차 시도하기" },
  { preparation: "직접 해보기", execution: "체크하기", feedback: "공유하기" },
  { preparation: "찾아보기", execution: "메모하기", feedback: "보고하기" },
  { preparation: "관찰하기", execution: "보고하기", feedback: "표준화하기" },
  { preparation: "인사하기", execution: "일부러 참여하기", feedback: "체계화하기" },
  { preparation: "전화하기", execution: "비교해 보기", feedback: "시스템 구축하기" },
  { preparation: "확인하기", execution: "찾아가기", feedback: "검토해서 보완하기" },
  { preparation: "정리하기", execution: "문서화하기", feedback: "피드백하기" },
  { preparation: "검색하기", execution: "저장하기", feedback: "개선점 찾기" },
] as const;

const ACTION_PATTERNS = {
  preparation: /(물어.{0,8}(사람|담당|선배|동료|상사|팀)|질문.{0,8}(사람|담당|선배|동료|상사|팀)|문의|조언.{0,4}구|지시.{0,4}따|절차대로|매뉴얼대로|직접.{0,4}(해|시도)|찾아보|자료.{0,4}찾|관찰|전화|연락|확인.{0,8}(기준|절차|방법)|정리.{0,8}(자료|업무|내용)|검색|조회)/,
  execution: /(따라.{0,4}하|시도.{0,8}(업무|방법|작업)|체크.{0,8}(기준|항목|목록)|점검.{0,8}(설비|기준|상태)|메모|기록|보고.{0,8}(결과|진행|상황)|참여.{0,8}(업무|회의|작업)|비교.{0,8}(결과|기준|방법)|찾아가|방문|문서화|작성.{0,8}(문서|보고서|기록)|저장|실행.{0,8}(계획|업무|작업)|조정.{0,8}(일정|업무)|제안.{0,8}(방법|개선)|설계|협의|측정)/,
  feedback: /(피드백.{0,5}반영|재차|재시도|다시.{0,5}(시도|수정)|공유.{0,8}(팀|동료|담당|결과)|보고.{0,8}(상사|팀|담당)|표준화|체계화|시스템.{0,5}구축|검토.{0,5}보완|개선점|후속|재발 방지)/,
  outcome: /(결과.{0,12}(달성|감소|증가|향상|개선|단축|예방|완료|해결)|\d+(?:[.,]\d+)?\s*(?:%|건|분|시간|일|명)|오류.{0,8}(줄|감소)|시간.{0,8}(줄|단축)|팀.{0,8}(기여|도움)|동료.{0,8}(기여|도움)|1인분)/,
  transfer: /((배웠|깨달|알게|교훈).{0,24}(다른|이후|다음).{0,24}(적용|활용)|(다른|이후|다음).{0,24}(적용|활용).{0,24}(배웠|기준|방법)|A.{0,8}B)/i,
} as const;

function evidenceSentence(answer: string, pattern: RegExp): string {
  const parts = answer
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .split(/(?<=[.!?。]|다\.)\s+|[\r\n]+/)
    .map(value => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts.find(part => pattern.test(part))?.slice(0, 180) ?? "";
}

function phase(
  id: ExperiencePhaseEvidence["id"],
  label: string,
  answer: string,
  pattern: RegExp,
  guidance: string,
): ExperiencePhaseEvidence {
  const evidence = evidenceSentence(answer, pattern);
  return { id, label, status: evidence ? "supported" : "missing", evidence, guidance };
}

export function buildExperienceFrame(input: {
  question: string;
  answer: string;
  phaseId?: string;
}): ExperienceFrame {
  const knowledgeMatches = searchInterviewKnowledge(input.question + " " + (input.phaseId ?? ""), 2);
  const topCategory = knowledgeMatches[0]?.category;
  const applicable = ["role", "experience", "pressure"].includes(topCategory ?? "")
    || /경험|사례|경력|인턴|프로젝트|어려|힘들|스트레스|강점|기여|문제|피드백|업무/.test(input.question);
  const stressSituations = STRESS_SITUATIONS.reduce<ExperienceEvidenceItem[]>((items, stress) => {
    const evidence = evidenceSentence(input.answer, stress.pattern);
    if (evidence) items.push({ id: stress.id, label: stress.label, evidence });
    return items;
  }, []);
  const phases = [
    phase("preparation", "준비", input.answer, ACTION_PATTERNS.preparation, "누구에게 물었고 무엇을 찾아 기준을 확인했는지 실제 장면을 말하세요."),
    phase("execution", "실행", input.answer, ACTION_PATTERNS.execution, "따라 하기에서 시작해 직접 시도·체크·비교·문서화한 행동을 말하세요."),
    phase("feedback", "보완", input.answer, ACTION_PATTERNS.feedback, "피드백을 반영해 재시도하고 공유·표준화·체계화한 후속 행동을 말하세요."),
    phase("outcome", "성과·팀 기여", input.answer, ACTION_PATTERNS.outcome, "확인 가능한 결과와 팀의 1인분·안전·품질·시간에 준 변화를 말하세요."),
    phase("transfer", "학습 전이", input.answer, ACTION_PATTERNS.transfer, "부족함을 알게 된 계기와 배운 기준 A를 이후의 다른 B·C 상황에 적용한 장면을 말하세요."),
  ];
  return {
    applicable,
    knowledgeMatches,
    stressSituations,
    phases,
    evidenceCount: phases.filter(entry => entry.status === "supported").length,
  };
}

export function compactKnowledgeContext(question: string) {
  const matches = searchInterviewKnowledge(question, 2);
  const references = matches.length > 0
    ? matches.map(match => [match.categoryLabel, match.question, match.intent, match.guidance].join(" | ")).join("\n")
    : "경험 질문 | 사용자가 실제로 말한 제약과 행동만 근거로 사용";
  return [
    "[면접질문 30선 로컬 참고]",
    references,
    "경험 답변: 실제 제약 → 준비 → 실행 → 피드백·보완 → 확인 가능한 결과·팀 기여 → 배운 기준의 다른 상황 적용.",
    "답변에 없는 경력·수치·성과를 만들지 말고, 빠진 사실은 제시 답안의 대괄호가 아니라 개선 안내나 후속 질문으로 분리합니다.",
    "지속·몰입·태도는 추상적 성격이 아니라 반복 행동, 끝낸 결과, 팀 기여 근거로만 표현합니다.",
  ].join("\n");
}
