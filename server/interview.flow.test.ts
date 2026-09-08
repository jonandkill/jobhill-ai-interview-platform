import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { appRouter } from "./routers";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./db", () => ({
  createFollowUpHistory: vi.fn(),
  createInterviewQA: vi.fn(),
  getFollowUpHistoryBySession: vi.fn(),
  getInterviewQAById: vi.fn(),
  getInterviewSession: vi.fn(),
  getSessionQAs: vi.fn(),
  getUserActiveSubscription: vi.fn(),
  getUserById: vi.fn(),
  getUserProfile: vi.fn(),
  incrementInterviewCompletedQuestions: vi.fn(),
  restoreQuestionCredit: vi.fn(),
  updateFollowUpAnswer: vi.fn(),
  updateInterviewQA: vi.fn(),
  useQuestionCredit: vi.fn(),
}));

const context = {
  user: {
    id: 1,
    openId: "interview-flow-user",
    email: "flow@example.com",
    name: "Flow User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as TrpcContext;

const session = {
  id: 10,
  userId: 1,
  status: "in_progress",
  totalQuestions: 1,
  selectedQuestions: null,
  interviewStages: JSON.stringify({
    version: 1,
    slots: [{ order: 0, phaseId: "basic", questionType: "personality", source: "generated" }],
  }),
};

const feedback = {
  score: 75,
  feedback: "답변 근거를 조금 더 구체화하세요.",
  strengths: "질문에 직접 답했습니다.",
  improvements: "행동과 결과를 보완하세요.",
  suggestedAnswerShort: "저는 기준을 세워 문제를 해결했습니다.",
  suggestedAnswerLong: "저는 기준을 세워 문제를 해결했습니다. 이후 결과를 확인했습니다.",
  improvementGuide: "역할, 행동, 결과 순으로 다시 말합니다.",
  rubricScores: { relevance: 15, evidence: 15, structure: 15, roleFit: 15, clarity: 15 },
  evidenceQuotes: ["기준을 세워"],
  confidenceNote: "결과 수치는 확인할 수 없습니다.",
  followUpQuestions: ["그 기준을 어떻게 정했나요?", "결과는 어떻게 확인했나요?"],
};

describe("interview server flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getInterviewSession).mockResolvedValue(session as any);
  });

  it.each([
    ["generated", null, session.interviewStages],
    [
      "prepared",
      JSON.stringify(["준비한 질문입니다."]),
      JSON.stringify({
        version: 1,
        slots: [{ order: 0, phaseId: "prepared", questionType: "situational", source: "prepared", preparedQuestionIndex: 0 }],
      }),
    ],
  ])("reuses an existing %s question when generation is retried", async (_source, selectedQuestions, interviewStages) => {
    vi.mocked(db.getInterviewSession).mockResolvedValue({ ...session, selectedQuestions, interviewStages } as any);
    vi.mocked(db.getSessionQAs).mockResolvedValue([{
      id: 21,
      sessionId: 10,
      questionOrder: 0,
      questionType: "personality",
      question: "이미 저장된 질문입니다.",
    }] as any);

    const result = await appRouter.createCaller(context).interview.generateQuestion({ sessionId: 10, questionOrder: 0 });

    expect(result.id).toBe(21);
    expect(result.question).toBe("이미 저장된 질문입니다.");
    expect(db.createInterviewQA).not.toHaveBeenCalled();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("shares one question-generation flight across concurrent retries", async () => {
    vi.mocked(db.getSessionQAs).mockResolvedValue([]);
    vi.mocked(db.getUserProfile).mockResolvedValue({
      targetCompany: "테스트사",
      targetPosition: "생산",
    } as any);
    let releaseLlm!: () => void;
    const llmGate = new Promise<void>(resolve => {
      releaseLlm = resolve;
    });
    vi.mocked(invokeLLM).mockImplementation(async () => {
      await llmGate;
      return { choices: [{ message: { content: JSON.stringify({ question: "동시에 생성된 질문입니다." }) } }] } as any;
    });
    vi.mocked(db.createInterviewQA).mockResolvedValue({
      id: 22,
      sessionId: 10,
      questionOrder: 0,
      questionType: "personality",
      question: "동시에 생성된 질문입니다.",
    } as any);

    const caller = appRouter.createCaller(context);
    const first = caller.interview.generateQuestion({ sessionId: 10, questionOrder: 0 });
    const retry = caller.interview.generateQuestion({ sessionId: 10, questionOrder: 0 });
    await vi.waitFor(() => expect(invokeLLM).toHaveBeenCalledTimes(1));
    releaseLlm();

    const [firstResult, retryResult] = await Promise.all([first, retry]);
    expect(firstResult).toEqual(retryResult);
    expect(db.getSessionQAs).toHaveBeenCalledTimes(1);
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    expect(db.createInterviewQA).toHaveBeenCalledTimes(1);
  });

  it("rejects question generation after the interview is no longer in progress", async () => {
    vi.mocked(db.getInterviewSession).mockResolvedValue({ ...session, status: "completed" } as any);

    await expect(appRouter.createCaller(context).interview.generateQuestion({
      sessionId: 10,
      questionOrder: 0,
    })).rejects.toThrow("진행 중인 면접에서만 질문을 생성할 수 있습니다.");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("requires the previous base answer before generating the next question", async () => {
    vi.mocked(db.getInterviewSession).mockResolvedValue({
      ...session,
      totalQuestions: 2,
      interviewStages: JSON.stringify({
        version: 1,
        slots: [
          { order: 0, phaseId: "basic", questionType: "personality", source: "generated" },
          { order: 1, phaseId: "fit", questionType: "company", source: "generated" },
        ],
      }),
    } as any);
    vi.mocked(db.getSessionQAs).mockResolvedValue([{
      id: 21,
      sessionId: 10,
      questionOrder: 0,
      questionType: "personality",
      question: "첫 질문",
      userAnswer: null,
    }] as any);

    await expect(appRouter.createCaller(context).interview.generateQuestion({
      sessionId: 10,
      questionOrder: 1,
    })).rejects.toThrow("이전 질문에 답변한 뒤 다음 질문을 진행해주세요.");
    expect(invokeLLM).not.toHaveBeenCalled();
    expect(db.createInterviewQA).not.toHaveBeenCalled();
  });

  it("stores answer duration and only the first allowed follow-up with its parent context", async () => {
    vi.mocked(db.getInterviewQAById).mockResolvedValue({
      id: 21,
      sessionId: 10,
      questionOrder: 0,
      questionType: "personality",
      question: "문제를 해결한 경험을 말해 주세요.",
      userAnswer: null,
    } as any);
    vi.mocked(db.getUserActiveSubscription).mockResolvedValue({ status: "active" } as any);
    vi.mocked(db.getUserById).mockResolvedValue({ id: 1, freeTrialEndsAt: null } as any);
    vi.mocked(db.getUserProfile).mockResolvedValue({ targetCompany: "테스트사", targetPosition: "생산" } as any);
    vi.mocked(db.getFollowUpHistoryBySession).mockResolvedValue([]);
    vi.mocked(db.createFollowUpHistory).mockResolvedValue({ id: 31 } as any);
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify(feedback) } }] } as any);

    const result = await appRouter.createCaller(context).interview.submitAnswer({
      qaId: 21,
      answer: "기준을 세워 문제를 해결했습니다.",
      answerDuration: 87,
    });

    expect(db.updateInterviewQA).toHaveBeenCalledWith(21, expect.objectContaining({ answerDuration: 87 }));
    expect(db.createFollowUpHistory).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 10,
      originalQuestion: "문제를 해결한 경험을 말해 주세요.",
      userAnswer: "기준을 세워 문제를 해결했습니다.",
      followUpQuestion: "그 기준을 어떻게 정했나요?",
    }));
    expect(result.followUpQuestions).toEqual(["그 기준을 어떻게 정했나요?"]);
  });

  it("accepts one persisted parent-bound follow-up without consuming a credit", async () => {
    const parent = {
      id: 21,
      sessionId: 10,
      questionOrder: 0,
      questionType: "personality",
      question: "문제를 해결한 경험을 말해 주세요.",
      userAnswer: "기준을 세워 문제를 해결했습니다.",
    };
    vi.mocked(db.getInterviewQAById).mockResolvedValue(parent as any);
    vi.mocked(db.getFollowUpHistoryBySession).mockResolvedValue([{
      id: 31,
      userId: 1,
      sessionId: 10,
      originalQuestion: parent.question,
      userAnswer: parent.userAnswer,
      followUpQuestion: "그 기준을 어떻게 정했나요?",
      followUpAnswer: null,
      followUpScore: null,
      depth: 1,
    }] as any);
    vi.mocked(db.getUserActiveSubscription).mockResolvedValue(null);
    vi.mocked(db.getUserById).mockResolvedValue({ id: 1, questionCredits: 0, freeTrialEndsAt: null } as any);
    vi.mocked(db.getUserProfile).mockResolvedValue({ targetCompany: "테스트사", targetPosition: "생산" } as any);
    vi.mocked(db.updateFollowUpAnswer).mockResolvedValue(true);
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ...feedback, followUpQuestions: [] }) } }],
    } as any);

    const result = await appRouter.createCaller(context).interview.submitAnswer({
      qaId: 21,
      sessionId: 10,
      isFollowUp: true,
      followUpQuestion: "그 기준을 어떻게 정했나요?",
      answer: "안전과 품질 기준을 먼저 확인했습니다.",
    });

    expect(db.useQuestionCredit).not.toHaveBeenCalled();
    expect(db.updateFollowUpAnswer).toHaveBeenCalledWith(31, 1, expect.objectContaining({
      followUpAnswer: "안전과 품질 기준을 먼저 확인했습니다.",
      followUpScore: 75,
    }));
    expect(result.followUpHistoryId).toBe(31);
  });

  it("rejects a follow-up that was not generated for the parent answer", async () => {
    vi.mocked(db.getInterviewQAById).mockResolvedValue({
      id: 21,
      sessionId: 10,
      question: "원래 질문",
      userAnswer: "원래 답변",
    } as any);
    vi.mocked(db.getFollowUpHistoryBySession).mockResolvedValue([]);

    await expect(appRouter.createCaller(context).interview.submitAnswer({
      qaId: 21,
      sessionId: 10,
      isFollowUp: true,
      followUpQuestion: "클라이언트가 임의로 만든 질문",
      answer: "답변",
    })).rejects.toThrow("현재 답변에서 생성된 후속 질문만 선택할 수 있습니다.");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("rejects another follow-up after the session already has one scored probe", async () => {
    const parent = { id: 21, sessionId: 10, question: "원래 질문", userAnswer: "원래 답변" };
    vi.mocked(db.getInterviewQAById).mockResolvedValue(parent as any);
    vi.mocked(db.getFollowUpHistoryBySession).mockResolvedValue([{
      id: 30,
      userId: 1,
      sessionId: 10,
      originalQuestion: parent.question,
      userAnswer: parent.userAnswer,
      followUpQuestion: "첫 후속 질문",
      followUpAnswer: "이미 완료한 답변",
      followUpScore: 70,
      depth: 1,
    }] as any);

    await expect(appRouter.createCaller(context).interview.submitAnswer({
      qaId: 21,
      sessionId: 10,
      isFollowUp: true,
      followUpQuestion: "다른 후속 질문",
      answer: "두 번째 답변",
    })).rejects.toThrow("이 면접에서는 후속 질문 답변을 이미 완료했습니다.");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("does not expose user-controlled credit grants or follow-up allow-list writes", () => {
    const procedureNames = Object.keys((appRouter as any)._def.procedures);
    expect(procedureNames).not.toContain("freeLimit.addCredits");
    expect(procedureNames).not.toContain("interview.saveFollowUpHistory");
    expect(procedureNames).not.toContain("interview.updateFollowUpAnswer");
  });
});
