import { COOKIE_NAME } from "@shared/const";
import { PAYMENT_PRODUCTS, type PaymentProductType } from "@shared/products";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import * as db from "./db";
// 키움페이 결제 API

function limitPromptText(value: unknown, maxLength = 5000): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "정보 없음";
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[내용 일부 생략]` : text;
}

export function hasInterviewProfileMaterial(profile: { resume?: unknown; coverLetter?: unknown } | null | undefined): boolean {
  return Boolean(
    (typeof profile?.resume === "string" && profile.resume.trim()) ||
    (typeof profile?.coverLetter === "string" && profile.coverLetter.trim()),
  );
}

export function normalizeGeneratedQuestion(value: unknown, fallback: string): string {
  const extract = (candidate: unknown): string => {
    if (typeof candidate === "string") return candidate.trim();
    if (Array.isArray(candidate)) {
      return candidate
        .map(item => (typeof item === "string" ? item : (item as { text?: unknown })?.text))
        .filter((item): item is string => typeof item === "string")
        .join(" ")
        .trim();
    }
    if (candidate && typeof candidate === "object") {
      const object = candidate as Record<string, unknown>;
      for (const key of ["question", "text", "content", "prompt"]) {
        const extracted = extract(object[key]);
        if (extracted) return extracted;
      }
    }
    return "";
  };

  const question = extract(value);
  return question.length > 0 ? question.slice(0, 1000) : fallback;
}

const feedbackResponseSchema = z.object({
  score: z.number().finite().min(0).max(100),
  feedback: z.string().min(1).max(5000),
  strengths: z.string().min(1).max(5000),
  improvements: z.string().min(1).max(5000),
  suggestedAnswerShort: z.string().min(1).max(3000),
  suggestedAnswerLong: z.string().min(1).max(6000),
  improvementGuide: z.string().min(1).max(5000),
  followUpQuestions: z.array(z.string().min(1).max(500)).max(3).optional().default([]),
  rubricScores: z.object({
    relevance: z.number().min(0).max(20),
    evidence: z.number().min(0).max(20),
    structure: z.number().min(0).max(20),
    roleFit: z.number().min(0).max(20),
    clarity: z.number().min(0).max(20),
  }).optional(),
  evidenceQuotes: z.array(z.string().max(300)).max(3).optional().default([]),
  confidenceNote: z.string().max(500).optional(),
});

const overallEvaluationSchema = z.object({
  overallFeedback: z.string().min(1).max(8000),
  balanceAnalysis: z.object({
    personality: z.number().finite().min(0).max(100),
    experience: z.number().finite().min(0).max(100),
    technical: z.number().finite().min(0).max(100),
    situational: z.number().finite().min(0).max(100),
    company: z.number().finite().min(0).max(100),
  }),
  answerReadiness: z.number().finite().min(0).max(100),
  evidenceLimitations: z.string().max(1000).optional(),
});

const revisionFeedbackSchema = z.object({
  score: z.number().finite().min(0).max(100),
  feedback: z.string().min(1).max(5000),
  improvements: z.string().min(1).max(5000),
  remainingIssues: z.string().min(1).max(5000),
});

const storedHttpsUrlSchema = z.string().trim().max(2048).url().refine(
  value => new URL(value).protocol === "https:",
  "HTTPS 파일 URL만 허용됩니다.",
);

async function requireOwnedInterviewSession(userId: number, sessionId: number) {
  const session = await db.getInterviewSession(sessionId);
  if (!session || session.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "면접 세션을 찾을 수 없습니다." });
  }
  return session;
}

async function requireOwnedInterviewQa(userId: number, qaId: number) {
  const qa = await db.getInterviewQAById(qaId);
  if (!qa) {
    throw new TRPCError({ code: "NOT_FOUND", message: "질문을 찾을 수 없습니다." });
  }
  const session = await requireOwnedInterviewSession(userId, qa.sessionId);
  return { qa, session };
}

function requireConfiguredSecret(value: string, name: string): string {
  if (value.length < 32) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${name} 환경변수를 32자 이상으로 설정해주세요.`,
    });
  }
  return value;
}

export const appRouter = router({  system: systemRouter,
  
  // TTS 관련
  tts: router({
    generate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        voiceType: z.string(),
        rate: z.string().optional(), // 예: '+20%', '-10%'
        pitch: z.string().optional(), // 예: '+5Hz', '-10Hz'
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateTTS } = await import('./_core/edgeTTS');
        const { generateSupertonic2TTS, isSupertonic2Configured } = await import('./_core/supertonicTTS');
        const { TRPCError } = await import('@trpc/server');
        
        try {
          // 1. Supertonic2가 설정되어 있으면 우선 시도
          if (isSupertonic2Configured()) {
            try {
              const result = await generateSupertonic2TTS({
                text: input.text,
                voiceType: input.voiceType,
                speed: input.rate ? parseFloat(input.rate.replace('%', '')) / 100 + 1 : 1.05,
              });
              return { audioUrl: result.audioUrl, provider: result.provider };
            } catch (stError) {
              console.warn('[TTS] Supertonic2 실패, Edge TTS로 폴백:', stError);
            }
          }

          // 2. Supertonic2가 없거나 실패하면 Edge TTS 사용
          const audioUrl = await generateTTS({
            text: input.text,
            voiceType: input.voiceType,
            rate: input.rate,
            pitch: input.pitch,
          });
          
          return { audioUrl, provider: 'edge-tts' };
        } catch (error: any) {
          console.error('[TTS] 음성 생성 실패:', error);
          console.error('[TTS] 오류 상세:', {
            message: error.message,
            stack: error.stack,
            voiceType: input.voiceType,
            textLength: input.text.length,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `TTS 생성 실패: ${error.message || '알 수 없는 오류'}`,
          });
        }
      }),
  }),
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // 이메일 인증 요청
    requestEmailVerification: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new Error('사용자를 찾을 수 없습니다.');
      if (user.emailVerified) {
        return { success: false, message: '이미 인증된 이메일입니다.' };
      }
      if (!user.email) {
        return { success: false, message: '이메일이 등록되지 않았습니다.' };
      }
      
      const { generateVerificationToken, generateVerificationLink, sendVerificationEmail } = await import('./_core/emailVerification');
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간
      
      // 토큰 저장
      await db.updateUser(ctx.user.id, {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
      });
      
      // 인증 메일 발송
      const baseUrl = process.env.VITE_OAUTH_PORTAL_URL || 'http://localhost:5173';
      const verificationLink = generateVerificationLink(token, baseUrl);
      await sendVerificationEmail({
        email: user.email,
        name: user.name || '사용자',
        verificationLink,
      });
      
      return { success: true, message: '인증 이메일을 발송했습니다.' };
    }),
    
    // 이메일 인증 확인
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const { isTokenExpired } = await import('./_core/emailVerification');
        
        // 토큰으로 사용자 찾기
        const user = await db.getUserByVerificationToken(input.token);
        if (!user) {
          return { success: false, message: '유효하지 않은 인증 링크입니다.' };
        }
        
        // 토큰 만료 확인
        if (isTokenExpired(user.emailVerificationExpires)) {
          return { success: false, message: '인증 링크가 만료되었습니다. 다시 요청해주세요.' };
        }
        
        // 인증 완료
        await db.updateUser(user.id, {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        });
        
        return { success: true, message: '이메일 인증이 완료되었습니다!' };
      }),
  }),

  // 사용자 프로필 관리
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getUserProfile(ctx.user.id);
      return profile ?? null;
    }),
    
    upsert: protectedProcedure
      .input(z.object({
        resume: z.string().max(100_000).optional(),
        coverLetter: z.string().max(100_000).optional(),
        targetCompany: z.string().trim().max(100).optional(),
        targetPosition: z.string().trim().max(100).optional(),
        experience: z.string().max(20_000).optional(),
        education: z.string().max(20_000).optional(),
        skills: z.string().max(20_000).optional(),
        // 상세 인적사항 필드
        university: z.string().max(200).optional(),
        major: z.string().max(200).optional(),
        gpa: z.string().max(30).optional(),
        degree: z.string().max(100).optional(),
        graduationYear: z.string().max(20).optional(),
        educationStatus: z.string().max(100).optional(),
        educationList: z.string().max(50_000).optional(), // JSON 배열
        certifications: z.string().max(50_000).optional(), // JSON 배열
        languageScores: z.string().max(50_000).optional(), // JSON 배열
        activities: z.string().max(50_000).optional(), // JSON 배열
        coverLetterItems: z.string().max(100_000).optional(), // JSON 배열
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserProfile({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  // 자기소개서 항목 관리
  coverLetterItems: router({
    list: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getUserProfile(ctx.user.id);
        if (!profile || profile.id !== input.profileId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "자기소개서 항목을 찾을 수 없습니다." });
        }
        return db.getCoverLetterItems(input.profileId);
      }),
    
    listByUser: protectedProcedure.query(async ({ ctx }) => {
      return db.getCoverLetterItemsByUser(ctx.user.id);
    }),
    
    upsert: protectedProcedure
      .input(z.object({
        profileId: z.number(),
        items: z.array(z.object({
          itemOrder: z.number(),
          itemTitle: z.string(),
          maxLength: z.number().optional(),
          content: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertCoverLetterItems(input.profileId, ctx.user.id, input.items);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        itemTitle: z.string().optional(),
        maxLength: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ownedItems = await db.getCoverLetterItemsByUser(ctx.user.id);
        if (!ownedItems.some(item => item.id === input.id)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "자기소개서 항목을 찾을 수 없습니다." });
        }
        const { id, content, ...rest } = input;
        await db.updateCoverLetterItem(id, {
          ...rest,
          content,
          currentLength: content ? content.length : undefined,
        });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ownedItems = await db.getCoverLetterItemsByUser(ctx.user.id);
        if (!ownedItems.some(item => item.id === input.id)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "자기소개서 항목을 찾을 수 없습니다." });
        }
        await db.deleteCoverLetterItem(input.id);
        return { success: true };
      }),
  }),

  // 기업 분석
  companyAnalysis: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCompanyAnalysisByUser(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await db.getCompanyAnalysisById(input.id);
        if (!analysis || analysis.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "기업 분석을 찾을 수 없습니다." });
        }
        return analysis;
      }),
    
    generate: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        companyStage: z.enum(["introduction", "growth", "maturity", "decline"]),
        positionType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 기업 성장 단계 (도입기/성장기/성숙기/쇠퇴기)
        const stageNames: Record<string, string> = {
          introduction: "도입기 (시장 진입 단계)",
          growth: "성장기 (급성장 단계)",
          maturity: "성숙기 (안정화 단계)",
          decline: "쇠퇴기 (재정비 단계)"
        };
        
        const prompt = `당신은 기업 분석 전문가입니다. 다음 기업에 대한 상세한 분석을 제공해주세요.

기업명: ${input.companyName}
기업 단계: ${stageNames[input.companyStage]}
채용 직무: ${input.positionType}

다음 항목들을 JSON 형식으로 분석해주세요:
1. situationAnalysis: 현재 기업이 처한 상황 분석
2. practicalTasks: 해당 직무의 실무자로서 해야할 일
3. relatedDepartments: 유관부서 목록과 협업 내용
4. partners: 협력사 및 외부 파트너와의 업무
5. weeklyTasks: 주간 업무 아이템
6. monthlyTasks: 월간 업무 아이템
7. quarterlyTasks: 분기 업무 아이템
8. semiAnnualTasks: 반기 업무 아이템
9. annualTasks: 연간 업무 아이템
10. jobFitness: 직무적합성 요구사항
11. jobExpertise: 직무전문성 요구사항`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 기업 분석 및 채용 전문가입니다. 상세하고 실용적인 분석을 제공합니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[companyAnalysis] LLM 호출 실패:', llmError);
          throw new Error('기업 분석 중 AI 오류가 발생했습니다.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[companyAnalysis] LLM 응답 형식 오류:', JSON.stringify(response));
          throw new Error('AI 응답을 처리할 수 없습니다.');
        }

        const analysisContent = response.choices[0].message.content;
        let analysisData;
        try {
          analysisData = JSON.parse(typeof analysisContent === 'string' ? analysisContent : "{}");
        } catch (parseError) {
          console.error('[companyAnalysis] JSON 파싱 실패:', analysisContent);
          throw new Error('분석 결과를 처리할 수 없습니다.');
        }
        
        return db.createCompanyAnalysis({
          userId: ctx.user.id,
          companyName: input.companyName,
          companyStage: input.companyStage,
          positionType: input.positionType,
          ...analysisData,
        });
      }),
  }),

  // 면접 세션 관리
  interview: router({
    // 세션 목록 (직무 및 날짜 필터 지원)
    list: protectedProcedure
      .input(z.object({
        position: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        let sessions = await db.getUserInterviewSessions(ctx.user.id);
        if (!input) return sessions;

        if (input.position && input.position !== 'all') {
          sessions = sessions.filter((s: any) => 
            s.position && s.position.toLowerCase().includes(input.position!.toLowerCase())
          );
        }

        if (input.startDate) {
          const start = new Date(input.startDate).getTime();
          sessions = sessions.filter((s: any) => new Date(s.createdAt).getTime() >= start);
        }

        if (input.endDate) {
          const end = new Date(input.endDate).setHours(23, 59, 59, 999);
          sessions = sessions.filter((s: any) => new Date(s.createdAt).getTime() <= end);
        }

        return sessions;
      }),
    
    // 면접 이력 (완료된 세션만)
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await db.getUserInterviewSessions(ctx.user.id);
      return sessions.filter((s: any) => s.status === 'completed');
    }),
    
    // 세션 상세
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await requireOwnedInterviewSession(ctx.user.id, input.id);
        const qas = await db.getSessionQAs(input.id);
        return { session, qas };
      }),
    
    // 새 면접 세션 시작
    start: protectedProcedure
      .input(z.object({
        sessionType: z.enum(["mock_interview", "feedback_only", "voice_interview"]).default("mock_interview"),
        totalQuestions: z.number().min(1).max(10).default(5),
        isVoiceMode: z.boolean().default(false),
        selectedQuestions: z.array(z.string()).optional(), // 사용자가 선택한 질문 목록
        interviewStages: z.array(z.enum(["basic", "personality", "situational", "strategy", "deep"])).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 사용자 정보 조회
        const user = await db.getUserById(ctx.user.id);
        if (!user) throw new Error("사용자를 찾을 수 없습니다.");
        
        // 이메일 인증 확인
        if (!user.emailVerified) {
          throw new Error("이메일 인증이 필요합니다. 인증 메일을 확인해주세요.");
        }
        
        // 구독 확인
        const subscription = await db.getUserActiveSubscription(ctx.user.id);
        const hasFreeTrial = Boolean(user.freeTrialEndsAt && new Date() < user.freeTrialEndsAt);
        
        // 음성 면접 활성화 확인
        if (input.isVoiceMode && !user.voiceInterviewEnabled && !subscription) {
          throw new Error("음성 면접은 월정액 결제 후 이용하실 수 있습니다.");
        }
        
        // 실제 답변 제출과 동일한 권한 기준을 사용합니다. 세션 생성 자체는 크레딧을 차감하지 않습니다.
        if (!subscription && !hasFreeTrial && (user.questionCredits || 0) <= 0) {
          throw new Error("질문 크레딧이 부족합니다. 크레딧을 충전하거나 구독을 시작해주세요.");
        }
        
        const profile = await db.getUserProfile(ctx.user.id);
        
        const session = await db.createInterviewSession({
          userId: ctx.user.id,
          profileId: profile?.id,
          sessionType: input.sessionType,
          isVoiceMode: input.isVoiceMode,
          status: "in_progress",
          totalQuestions: input.selectedQuestions?.length || input.totalQuestions,
          completedQuestions: 0,
          selectedQuestions: input.selectedQuestions ? JSON.stringify(input.selectedQuestions) : null,
          interviewStages: input.interviewStages ? JSON.stringify(input.interviewStages) : JSON.stringify(["basic"]),
        });
        
        return session;
      }),
    
    // AI 질문 생성
    generateQuestion: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        questionOrder: z.number(),
        avatarSpeechStyle: z.object({
          formality: z.enum(['formal', 'semi-formal', 'casual']),
          questionStyle: z.enum(['direct', 'indirect', 'probing', 'friendly']),
          feedbackStyle: z.enum(['strict', 'encouraging', 'balanced', 'detailed']),
          promptStyle: z.string(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getUserProfile(ctx.user.id);
        const session = await db.getInterviewSession(input.sessionId);
        
        if (!session) throw new Error("세션을 찾을 수 없습니다.");
        if (session.userId !== ctx.user.id) throw new Error("이 면접 세션에 접근할 수 없습니다.");
        if (!hasInterviewProfileMaterial(profile)) {
          throw new Error("맞춤 질문을 만들려면 이력서 또는 자기소개서를 먼저 등록해주세요.");
        }
        
        // 사용자가 선택한 질문이 있으면 해당 질문 사용. 잘못된 JSON이나 빈 문자열은
        // AI 생성 경로로 보내어 interview_qa.question NOT NULL 오류를 막는다.
        let selectedQuestions: string[] | null = null;
        if (session.selectedQuestions) {
          try {
            const parsed = JSON.parse(session.selectedQuestions as string);
            if (Array.isArray(parsed)) {
              selectedQuestions = parsed.filter((item): item is string => typeof item === "string");
            }
          } catch (parseError) {
            console.warn("[generateQuestion] selectedQuestions JSON 파싱 실패:", parseError);
          }
        }
        // 인덱스 0도 정상 처리되도록 범위와 비어 있지 않음을 함께 확인
        if (selectedQuestions && input.questionOrder < selectedQuestions.length && selectedQuestions[input.questionOrder]?.trim()) {
          const selectedQuestion = selectedQuestions[input.questionOrder].trim();
          const questionType = "personality"; // 기본 타입
          
          const qa = await db.createInterviewQA({
            sessionId: input.sessionId,
            questionOrder: input.questionOrder,
            questionType,
            question: selectedQuestion,
          });
          
          return { id: qa.id, question: selectedQuestion, questionType };
        }
        
        const existingQAs = await db.getSessionQAs(input.sessionId);
        const previousQuestions = existingQAs.map(qa => qa.question).join("\n");
        
        // 세션에 저장된 선택 면접 단계 파싱 (기본값 ["basic"])
        let activeStages: string[] = ["basic"];
        if (session.interviewStages) {
          try {
            const parsed = JSON.parse(session.interviewStages as string);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeStages = parsed;
            }
          } catch (e) {
            // 무시하고 기본값 사용
          }
        }
        
        // questionOrder에 따라 activeStages에서 순차적으로 단계 선택
        const currentStageId = activeStages[input.questionOrder % activeStages.length];
        
        // 단계별 매핑 정의 (대한민국 AI 역량검사 5단계 기준)
        const stageTypeMap: Record<string, "personality" | "experience" | "technical" | "situational" | "company"> = {
          basic: "experience",       // 1단계 기본 면접 (자기소개, 지원동기, 장단점)
          personality: "personality", // 2단계 성향 파악 (가치관, 직무 성향)
          situational: "situational", // 3단계 상황 대처 (롤플레잉형 업무 상황)
          strategy: "technical",      // 4단계 전략 게임 / 구조화 역량 평가
          deep: "company"             // 5단계 심층 면접 (답변 기반 꼬리 질문)
        };
        
        const questionType = stageTypeMap[currentStageId] || "personality";
        
        const typeNames: Record<string, string> = {
          personality: "인성/성격",
          experience: "경험/역량",
          technical: "기술/전문성",
          situational: "상황대처",
          company: "회사/직무 이해"
        };
        
        // 질문 타이밍 정보 (초반/중반/후반)
        const questionTimingInfo: Record<string, { timing: string; mood: string; answerStyle: string }> = {
          personality: { 
            timing: "초반", 
            mood: "분위기 파악 단계", 
            answerStyle: "자연스럽고 여유롭게 답변"
          },
          experience: { 
            timing: "중반", 
            mood: "분위기 좋을 때", 
            answerStyle: "STAR 기법으로 구체적 사례 중심"
          },
          technical: { 
            timing: "중반", 
            mood: "집중 평가 단계", 
            answerStyle: "논리적이고 구조화된 답변"
          },
          situational: { 
            timing: "후반", 
            mood: "분위기 안 나올 때 자주 나옴", 
            answerStyle: "침착하고 단계적인 대응 강조"
          },
          company: { 
            timing: "초반/후반", 
            mood: "관심도 확인 단계", 
            answerStyle: "열정과 준비성 강조"
          }
        };
        const timingInfo = questionTimingInfo[questionType];

        // 이력서/자소서 기반 맞춤형 질문 생성
        const hasResumeOrCoverLetter = profile?.resume || profile?.coverLetter;
        
        // 아바타 말투 스타일 적용
        const speechStyle = input.avatarSpeechStyle;
        const speechStyleGuide = speechStyle ? `
면접관 말투 스타일:
- ${speechStyle.promptStyle}
- 존댓말 수준: ${speechStyle.formality === 'formal' ? '정중한 존댓말' : speechStyle.formality === 'semi-formal' ? '편안한 존댓말' : '편한 반말'}
- 질문 방식: ${speechStyle.questionStyle === 'direct' ? '직접적이고 명확하게' : speechStyle.questionStyle === 'indirect' ? '부드럽고 우회적으로' : speechStyle.questionStyle === 'probing' ? '파고드는 스타일로' : '친근하고 대화하듯'}
` : '';

        const tailoredGuide = hasResumeOrCoverLetter
          ? "맞춤형 질문 생성 가이드:\n- 이력서와 자기소개서의 구체적인 키워드를 우선 활용하세요.\n- 지원자의 실제 역할, 문제 해결 과정, 결과와 배운 점을 질문에 반영하세요."
          : "지원자 정보가 부족하므로 직무의 핵심 역량을 확인하는 질문을 만드세요.";
        const styleReminder = speechStyle
          ? "중요: 질문을 작성할 때 위의 면접관 말투 스타일을 반드시 반영해주세요."
          : "";
        // 대한민국 AI 역량검사 5단계별 특화 가이드
        const stageGuideMap: Record<string, string> = {
          basic: "1단계 기본 면접: 지원자의 첫인상, 자기소개, 지원동기, 성격의 장단점을 확인하는 기본 역량 검사입니다.",
          personality: "2단계 성향 파악: 지원자의 가치관, 직무 적합도, 조직 적응력을 평가하는 인성/성향 검사 문항 스타일입니다.",
          situational: "3단계 상황 대처: 롤플레잉형 면접으로, 업무 중 발생할 수 있는 난처한 상황(상사와의 갈등, 마감 임박 실수 등)을 가정하여 직접 대사하듯 답변하도록 유도하는 질문입니다.",
          strategy: "4단계 전략 게임 및 구조화 역량 평가: 논리적 추론, 문제 해결 패턴, 계획성 및 집중력을 측정하는 구조화된 전문 역량 검사 질문입니다.",
          deep: "5단계 심층 면접: 앞선 답변이나 지원자의 이력서 핵심 키워드를 깊이 파고드는 꼬리 질문(Deep Question)입니다."
        };
        const stageInstruction = stageGuideMap[currentStageId] || stageGuideMap.basic;

        const prompt = [
          `당신은 ${profile?.targetCompany || "기업"}의 ${profile?.targetPosition || "직무"} 면접관입니다.`,
          `현재 진행 중인 AI 역량검사 단계: ${stageInstruction}`,
          speechStyleGuide,
          "지원자 정보:",
          `- 이력서: ${limitPromptText(profile?.resume)}`,
          `- 자기소개서: ${limitPromptText(profile?.coverLetter)}`,
          `- 경력: ${limitPromptText(profile?.experience, 1200)}`,
          `- 학력: ${limitPromptText(profile?.education, 1200)}`,
          `- 보유 기술: ${limitPromptText(profile?.skills, 1200)}`,
          "",
          `이전에 한 질문들 (중복 피하기):\n${previousQuestions || "없음"}`,
          `${typeNames[questionType]} 유형이자 "${stageInstruction}" 목적에 정확히 부합하는 면접 질문을 1개 생성해주세요.`,
          "중요 요구사항:",
          "1. 질문은 1~2문장, 최대 80자 이내로 간결하게 작성하세요.",
          "2. 지원자의 배경과 지원 직무에 맞는 구체적인 질문을 해주세요.",
          "3. JSON 형식으로 question만 반환하세요.",
          tailoredGuide,
          `면접 시점: ${timingInfo.timing} / 분위기: ${timingInfo.mood} / 권장 답변 스타일: ${timingInfo.answerStyle}`,
          styleReminder,
        ].filter(Boolean).join("\n");

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 구조화 면접 연습 질문을 설계하는 코치입니다. 제공된 정보만 사용하고 반드시 JSON 형식으로 응답하세요: {\"question\": \"질문 내용\"}" },
              { role: "user", content: prompt + "\n\n반드시 다음 JSON 형식으로 응답하세요: {\"question\": \"면접 질문\"}" }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          // LLM이 일시적으로 지연되거나 실패해도 면접 화면이 멈추지 않도록
          // 아래의 직무별 안전 질문으로 계속 진행합니다.
          console.error('[generateQuestion] LLM 호출 실패, 안전 질문으로 폴백:', llmError);
          response = null;
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.warn('[generateQuestion] LLM 응답이 없어 안전 질문을 사용합니다.');
        }

        const questionContent = response?.choices?.[0]?.message?.content;
        let questionData: unknown = {};
        try {
          questionData = JSON.parse(typeof questionContent === 'string' ? questionContent : JSON.stringify(questionContent ?? {}));
        } catch (parseError) {
          console.error('[generateQuestion] JSON 파싱 실패:', questionContent, parseError);
        }

        const fallbackByType: Record<typeof questionType, string> = {
          personality: "간단히 자기소개를 해주시고, 이 직무에 지원한 이유를 말씀해 주세요.",
          experience: "가장 몰입해서 문제를 해결했던 경험과 본인의 역할을 말씀해 주세요.",
          technical: "지원 직무에서 가장 중요하다고 생각하는 역량과 그 이유를 설명해 주세요.",
          situational: "업무 중 의견 충돌이 생겼을 때 어떻게 조율하고 해결하시겠습니까?",
          company: `${profile?.targetCompany || "지원 회사"}와 ${profile?.targetPosition || "지원 직무"}에 관심을 갖게 된 계기를 말씀해 주세요.`,
        };
        const question = normalizeGeneratedQuestion(questionData, fallbackByType[questionType]);

        const qa = await db.createInterviewQA({
          sessionId: input.sessionId,
          questionOrder: input.questionOrder,
          questionType: questionType,
          question,
        });
        
        // 질문과 연습 흐름에 필요한 타이밍 정보만 반환합니다.
        return {
          ...qa,
          timingInfo: timingInfo,
        };
      }),
    
    // 답변 제출 및 피드백 받기
    submitAnswer: protectedProcedure
      .input(z.object({
        qaId: z.number(),
        answer: z.string().trim().min(1).max(12_000),
        answerStyle: z.enum(["short", "long"]).optional().default("long"),
        tensionLevel: z.enum(["high", "low"]).optional().default("low"),
        avatarSpeechStyle: z.object({
          formality: z.enum(['formal', 'semi-formal', 'casual']),
          questionStyle: z.enum(['direct', 'indirect', 'probing', 'friendly']),
          feedbackStyle: z.enum(['strict', 'encouraging', 'balanced', 'detailed']),
          promptStyle: z.string(),
        }).optional(),
        followUpDifficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
        // 후속 질문용 추가 필드
        isFollowUp: z.boolean().optional().default(false),
        followUpQuestion: z.string().trim().min(1).max(1_000).optional(),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let qa: Awaited<ReturnType<typeof db.getInterviewQAById>> | null = null;
        let ownedSession: Awaited<ReturnType<typeof db.getInterviewSession>>;
        let questionText: string;

        if (input.isFollowUp) {
          if (!input.followUpQuestion || !input.sessionId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "후속 질문과 면접 세션이 필요합니다." });
          }
          ownedSession = await requireOwnedInterviewSession(ctx.user.id, input.sessionId);
          questionText = input.followUpQuestion;
        } else {
          const owned = await requireOwnedInterviewQa(ctx.user.id, input.qaId);
          qa = owned.qa;
          ownedSession = owned.session;
          questionText = qa.question;
          if (qa.userAnswer) {
            throw new TRPCError({ code: "CONFLICT", message: "이미 제출된 답변입니다. 답변 수정 기능을 이용해주세요." });
          }
        }

        // 크레딧 확인 및 차감 (구독자/무료체험자는 제외)
        const subscription = await db.getUserActiveSubscription(ctx.user.id);
        const user = await db.getUserById(ctx.user.id);
        const hasSubscription = subscription?.status === "active";
        const hasFreeTrial = user?.freeTrialEndsAt && new Date() < user.freeTrialEndsAt;
        let creditConsumed = false;

        if (!hasSubscription && !hasFreeTrial) {
          const creditResult = await db.useQuestionCredit(ctx.user.id, 1);
          if (!creditResult.success) {
            throw new Error("크레딧이 부족합니다. 크레딧을 충전해주세요.");
          }
          creditConsumed = true;
        }
        
        const profile = await db.getUserProfile(ctx.user.id);
        const perspective = "구조화 면접 평가 루브릭";
        
        const answerStyleGuide = input.answerStyle === "short" 
          ? "간결하고 핵심만 담은 1-2문장 모범답안"
          : "상세하고 구체적인 예시를 포함한 3-5문장 모범답안";
        
        const tensionGuide = input.tensionLevel === "high"
          ? "긴장도가 높은 사람을 위한 단순하고 외우기 쉬운 구조의 답변"
          : "자연스럽고 유창하게 말할 수 있는 답변";
        
        // 아바타 피드백 스타일 적용
        const avatarStyle = input.avatarSpeechStyle;
        const avatarFeedbackGuide = avatarStyle ? `
면접관 피드백 스타일:
- ${avatarStyle.promptStyle}
- 피드백 방식: ${avatarStyle.feedbackStyle === 'strict' ? '엄격하고 직설적으로' : avatarStyle.feedbackStyle === 'encouraging' ? '격려하고 긍정적으로' : avatarStyle.feedbackStyle === 'balanced' ? '균형 잡힌 객관적 피드백' : '세부적이고 구체적으로'}
- 어투: ${avatarStyle.formality === 'formal' ? '정중한 존댓말' : avatarStyle.formality === 'semi-formal' ? '편안한 존댓말' : '편한 반말'}
` : '';

        const prompt = `당신은 구조화 면접 코치입니다. 답변에 실제로 나타난 문장만 근거로 일관된 피드백을 제공하세요.
${avatarFeedbackGuide}

중요 원칙:
- 답변에 없는 경력, 성과, 수치, 회사 정보는 만들지 마세요.
- 채용 합격 여부나 실제 합격 확률을 예측하지 마세요.
- 동일한 답변에는 같은 평가 기준을 적용하세요.
- 강점과 개선점마다 답변 원문에서 짧은 근거를 제시하세요.

면접 질문: ${questionText}
지원자 답변: ${input.answer}

지원자 배경:
- 지원 회사: ${profile?.targetCompany || "정보 없음"}
- 지원 직무: ${profile?.targetPosition || "정보 없음"}

모범답안 스타일: ${answerStyleGuide}
답변 특성: ${tensionGuide}

평가 루브릭 (각 0~20점, 합계 100점):
- relevance: 질문에 직접 답했는가
- evidence: 역할·행동·결과의 관찰 가능한 근거가 있는가
- structure: 상황-과제-행동-결과 또는 주장-근거 구조가 분명한가
- roleFit: 지원 직무와 연결되는 행동·판단 기준이 있는가
- clarity: 간결하고 이해하기 쉬운가

다음 항목을 평가해주세요:
1. rubricScores: 위 5개 항목별 점수
2. score: rubricScores의 정확한 합계
3. feedback: 답변에 근거한 전반적인 피드백
3. strengths: 답변의 강점 (구체적으로 2-3가지)
4. improvements: 개선이 필요한 부분 (구체적인 개선 방법과 함께 2-3가지)
5. suggestedAnswerShort: 짧은 버전 모범 답안 (1-2문장, 핵심만)
6. suggestedAnswerLong: 긴 버전 모범 답안 (3-5문장, 상세한 예시 포함)
7. improvementGuide: 다음 재연습에서 바로 적용할 3단계 행동 가이드
8. evidenceQuotes: 판단 근거가 된 답변 원문 짧은 구절 1~3개
9. confidenceNote: 답변 정보가 부족해 판단하기 어려운 부분
${input.isFollowUp ? '' : '10. followUpQuestions: 답변에서 실제 언급된 내용만 파고드는 후속 질문 3개'}

${!input.isFollowUp ? `후속 질문 난이도: ${input.followUpDifficulty === 'easy' ? '쉬움 - 답변 내용을 확인하거나 부드럽게 요청하는 수준' : input.followUpDifficulty === 'hard' ? '어려움 - 논리적 허점을 파고들거나 구체적인 수치/증거를 요구하는 압박 질문' : '보통 - 답변을 조금 더 깊이 파고드는 수준'}` : ''}

${avatarStyle ? `문체만 위의 면접관 피드백 스타일을 반영하고 점수 기준은 바꾸지 마세요.` : ''}`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 증거 기반 구조화 면접 코치입니다. 답변에 없는 사실을 만들지 않고 동일 루브릭을 일관되게 적용합니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt + `\n\n반드시 다음 JSON 필드를 반환하세요: score, feedback, strengths, improvements, suggestedAnswerShort, suggestedAnswerLong, improvementGuide, rubricScores, evidenceQuotes, confidenceNote${input.isFollowUp ? '' : ', followUpQuestions'}.`}
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[submitAnswer] LLM 호출 실패:', llmError);
          if (creditConsumed) await db.restoreQuestionCredit(ctx.user.id, 1);
          throw new Error('피드백 생성 중 AI 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[submitAnswer] LLM 응답 형식 오류:', JSON.stringify(response));
          if (creditConsumed) await db.restoreQuestionCredit(ctx.user.id, 1);
          throw new Error('AI 응답을 처리할 수 없습니다. 다시 시도해주세요.');
        }

        const content = response.choices[0].message.content;
        let feedbackData: z.infer<typeof feedbackResponseSchema>;
        try {
          const parsed = feedbackResponseSchema.parse(
            JSON.parse(typeof content === 'string' ? content : "{}"),
          );
          const rubricTotal = parsed.rubricScores
            ? Object.values(parsed.rubricScores).reduce((sum, value) => sum + value, 0)
            : parsed.score;
          feedbackData = { ...parsed, score: rubricTotal };
        } catch (parseError) {
          console.error('[submitAnswer] JSON 검증 실패:', parseError);
          if (creditConsumed) await db.restoreQuestionCredit(ctx.user.id, 1);
          throw new Error('AI 피드백 형식이 올바르지 않습니다. 크레딧은 차감되지 않았습니다. 다시 시도해주세요.');
        }
        
        // 모범답안을 사용자 선호에 따라 선택
        const suggestedAnswer = input.answerStyle === "short" 
          ? feedbackData.suggestedAnswerShort 
          : feedbackData.suggestedAnswerLong;
        
        // 후속 질문이 아닌 경우에만 DB 업데이트
        if (qa) {
          await db.updateInterviewQA(input.qaId, {
            userAnswer: input.answer,
            feedback: feedbackData.feedback,
            score: feedbackData.score,
            strengths: feedbackData.strengths,
            improvements: feedbackData.improvements,
            suggestedAnswer: suggestedAnswer,
          });
          
          // 세션 진행 상황 업데이트
          await db.incrementInterviewCompletedQuestions(ownedSession.id, ctx.user.id);
        }
        
        // 후속 질문 답변인 경우 히스토리에 저장
        let followUpHistoryId: number | null = null;
        if (input.isFollowUp && input.followUpQuestion) {
          try {
            const historyResult = await db.createFollowUpHistory({
              userId: ctx.user.id,
              sessionId: input.sessionId,
              originalQuestion: '', // 후속 질문의 경우 원래 질문은 비워둡
              userAnswer: '', // 원래 답변도 비워둡
              followUpQuestion: input.followUpQuestion,
              followUpAnswer: input.answer,
              followUpFeedback: feedbackData.feedback,
              followUpScore: feedbackData.score,
              difficulty: input.followUpDifficulty || 'medium',
              depth: 1,
            });
            followUpHistoryId = historyResult?.id || null;
          } catch (historyError) {
            console.error('[submitAnswer] 후속 질문 히스토리 저장 실패:', historyError);
          }
        }
        
        // 기본 반환 객체 구성
        const baseResponse = {
          id: qa?.id || input.qaId,
          question: questionText,
          questionType: input.isFollowUp ? 'follow_up' : (qa?.questionType || 'general'),
          sessionId: qa?.sessionId || input.sessionId || 0,
          followUpHistoryId: followUpHistoryId,
        };
        
        return { 
          ...baseResponse, 
          ...feedbackData, 
          userAnswer: input.answer,
          suggestedAnswer: suggestedAnswer,
          suggestedAnswerShort: feedbackData.suggestedAnswerShort,
          suggestedAnswerLong: feedbackData.suggestedAnswerLong,
          improvementGuide: feedbackData.improvementGuide,
          feedbackPerspective: perspective,
          followUpQuestions: feedbackData.followUpQuestions || [],
          rubricScores: feedbackData.rubricScores,
          evidenceQuotes: feedbackData.evidenceQuotes,
          confidenceNote: feedbackData.confidenceNote,
        };
      }),
    
    // 면접 완료 및 전체 피드백
    complete: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requireOwnedInterviewSession(ctx.user.id, input.sessionId);
        try {
          const qas = await db.getSessionQAs(input.sessionId);
          const profile = await db.getUserProfile(ctx.user.id);

          // 완료 요청 재시도로 사용량과 보상이 중복 반영되지 않도록 멱등 처리합니다.
          if (session.status === "completed") {
            let storedBalance: unknown = session.balanceAnalysis;
            if (typeof storedBalance === "string") {
              try { storedBalance = JSON.parse(storedBalance); } catch { storedBalance = null; }
            }
            return {
              session: { ...session, balanceAnalysis: storedBalance },
              qas,
              balanceData: [],
              followUpStats: await db.getFollowUpStatsBySession(input.sessionId),
            };
          }
          
          // QA가 없으면 기본 결과 반환
          if (!qas || qas.length === 0) {
            await db.updateInterviewSession(input.sessionId, {
              status: "completed",
              overallScore: 0,
              overallFeedback: "질문에 대한 답변이 없습니다.",
              balanceAnalysis: JSON.stringify({ personality: 0, experience: 0, technical: 0, situational: 0, company: 0 }),
              passRate: 0,
            });
            return {
              session: { 
                ...session, 
                status: "completed", 
                overallScore: 0, 
                overallFeedback: "질문에 대한 답변이 없습니다.",
                balanceAnalysis: { personality: 0, experience: 0, technical: 0, situational: 0, company: 0 },
                passRate: 0,
              },
              qas: [],
              balanceData: [],
            };
          }
        
        // 꼬리질문 통계 가져오기
        const followUpHistory = await db.getFollowUpHistoryBySession(input.sessionId);
        const followUpCount = followUpHistory?.length || 0;
        const followUpAvgScore = followUpCount > 0
          ? Math.round(followUpHistory.reduce((sum: number, fh: any) => sum + (fh.followUpScore || 0), 0) / followUpCount)
          : 0;
        
        const qasSummary = qas.map((qa, i) => 
          `질문 ${i + 1} (${qa.questionType}): ${qa.question}\n답변: ${qa.userAnswer || "미답변"}\n점수: ${qa.score || 0}점`
        ).join("\n\n");
        
        // 꼬리질문 요약 추가
        const followUpSummary = followUpCount > 0
          ? `\n\n꼬리질문 응답 통계:\n- 총 ${followUpCount}개 꼬리질문에 답변\n- 평균 점수: ${followUpAvgScore}점\n${followUpHistory.slice(0, 3).map((fh: any, i: number) => `${i + 1}. ${fh.followUpQuestion} (점수: ${fh.followUpScore || 0}점)`).join('\n')}`
          : '';
        
        // 꼬리질문 점수를 포함한 평균 점수 계산
        const totalAnswers = qas.length + followUpCount;
        const totalScore = qas.reduce((sum, qa) => sum + (qa.score || 0), 0) + 
                          (followUpHistory?.reduce((sum: number, fh: any) => sum + (fh.followUpScore || 0), 0) || 0);
        const avgScore = totalAnswers > 0 
          ? Math.round(totalScore / totalAnswers)
          : 0;

        // 질문 유형별 점수 분석
        const typeScores: Record<string, number[]> = {};
        qas.forEach(qa => {
          if (!typeScores[qa.questionType]) typeScores[qa.questionType] = [];
          typeScores[qa.questionType].push(qa.score || 0);
        });
        
        const balanceData = Object.entries(typeScores).map(([type, scores]) => ({
          type,
          avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          count: scores.length,
        }));

        const prompt = `제공된 모의면접 답변만 근거로 연습용 종합 피드백을 작성해주세요.

지원자 정보:
- 지원 회사: ${profile?.targetCompany || "정보 없음"}
- 지원 직무: ${profile?.targetPosition || "정보 없음"}

면접 내용:
${qasSummary}${followUpSummary}

전체 평균 점수: ${avgScore}점 (기본 질문 ${qas.length}개 + 꼬리질문 ${followUpCount}개)

유형별 점수 분석:
${balanceData.map(b => `- ${b.type}: 평균 ${b.avgScore}점`).join('\n')}

평가 원칙:
- 답변에 실제로 포함된 근거만 사용하고, 확인할 수 없는 경험·성과·성격을 추정하지 마세요.
- 회사별 실제 채용 기준, 다른 지원자 분포, 채용 결과를 알고 있다고 주장하지 마세요.
- 채용 합격 여부나 확률을 예측하지 마세요.
- 입력에 근거가 부족한 영역은 그 한계를 명시하세요.
- answerReadiness는 실제 합격률이 아니라 이번 답변들의 관련성·근거·구조·직무연관성·명료성을 요약한 연습 지표입니다.
- 꼬리질문 응답(${followUpCount}개, 평균 ${followUpAvgScore}점)은 실제 답변이 있을 때만 근거로 반영하세요.

JSON 형식으로 다음을 제공해주세요:
1. overallFeedback: 종합 피드백 (관찰된 강점, 개선점, 다음 연습 행동)
2. balanceAnalysis: 답변에서 관찰할 수 있는 5개 연습 영역 점수 (0-100)
   - personality: 가치관·협업 사례의 구체성
   - experience: 경험·성과 근거의 구체성
   - technical: 직무 지식 설명의 정확성과 명료성
   - situational: 상황·행동·결과 구조의 완결성
   - company: 회사·직무 이해가 답변에 연결된 정도
3. answerReadiness: 이번 답변 묶음의 연습 준비도 (0-100)
4. evidenceLimitations: 평가할 수 없었던 정보와 이유`;

        const deterministicBalance = {
          personality: avgScore,
          experience: avgScore,
          technical: avgScore,
          situational: avgScore,
          company: avgScore,
        };
        let feedbackData: z.infer<typeof overallEvaluationSchema> = {
          overallFeedback: `이번 면접의 답변 준비 점수는 ${avgScore}점입니다. 질문별 피드백에서 가장 낮은 평가 기준 한 가지를 골라 답변 근거와 구조를 보완한 뒤 다시 연습해보세요.`,
          balanceAnalysis: deterministicBalance,
          answerReadiness: avgScore,
          evidenceLimitations: "AI 종합 분석을 완료하지 못해 저장된 질문별 점수만으로 요약했습니다.",
        };
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 구조화 면접 연습 코치입니다. 제공된 답변의 관찰 가능한 증거만 평가하고, 채용 결과나 사람의 감정·성격을 추론하지 않습니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt + "\n\n반드시 다음 JSON 형식으로 응답하세요: {\"overallFeedback\": \"종합 피드백\", \"balanceAnalysis\": {\"personality\": 숫자, \"experience\": 숫자, \"technical\": 숫자, \"situational\": 숫자, \"company\": 숫자}, \"answerReadiness\": 숫자, \"evidenceLimitations\": \"근거 한계\"}" }
            ],
            response_format: {
              type: "json_object",
            },
          });
          const overallContent = response?.choices?.[0]?.message?.content;
          const parsedJson = JSON.parse(typeof overallContent === "string" ? overallContent : "{}");
          const parsed = overallEvaluationSchema.safeParse(parsedJson);
          if (parsed.success) feedbackData = parsed.data;
          else console.error("[complete] 종합 분석 스키마 오류:", parsed.error.flatten());
        } catch (llmError) {
          console.error("[complete] AI 종합 분석 실패, 질문별 점수로 요약:", llmError);
        }
        
        await db.updateInterviewSession(input.sessionId, {
          status: "completed",
          overallScore: avgScore,
          overallFeedback: feedbackData.overallFeedback,
          balanceAnalysis: JSON.stringify(feedbackData.balanceAnalysis),
          // 기존 DB 컬럼명은 호환성을 위해 유지하지만 의미는 '답변 준비도'입니다.
          passRate: Math.round(feedbackData.answerReadiness),
        });
        
        // 사용량 추적 및 마일스톤 쿠폰 발급
        const user = await db.getUserById(ctx.user.id);
        const completedCount = (user?.completedInterviews || 0) + 1;
        await db.updateUser(ctx.user.id, { completedInterviews: completedCount });
        
        // 마일스톤 체크 (5, 10, 20, 50, 100회)
        const milestones = [5, 10, 20, 50, 100];
        const lastMilestone = user?.lastMilestoneReached || 0;
        
        for (const milestone of milestones) {
          if (completedCount >= milestone && lastMilestone < milestone) {
            // 마일스톤 달성 쿠폰 발급
            const bonusHours = milestone >= 50 ? 5 : milestone >= 20 ? 3 : 2;
            const couponCode = `MILESTONE-${milestone}-${ctx.user.id}-${Date.now()}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 60); // 60일 후 만료
            
            const coupon = await db.createCoupon({
              code: couponCode,
              description: `면접 ${milestone}회 달성 보너스 쿠폰`,
              freeHours: bonusHours,
              maxUses: 1,
              expiresAt,
              createdBy: ctx.user.id,
            });
            
            // 쿠폰 자동 적용
            const couponExpiresAt = new Date();
            couponExpiresAt.setHours(couponExpiresAt.getHours() + bonusHours);
            
            await db.createCouponUsage({
              couponId: coupon.id,
              userId: ctx.user.id,
              expiresAt: couponExpiresAt,
            });
            
            await db.incrementCouponUsage(coupon.id);
            await db.addUserFreeTime(ctx.user.id, bonusHours * 60);
            await db.updateUser(ctx.user.id, { lastMilestoneReached: milestone });
            
            break; // 한 번에 하나의 마일스톤만 처리
          }
        }
        
        return {
          session: { 
            ...session, 
            status: "completed", 
            overallScore: avgScore, 
            overallFeedback: feedbackData.overallFeedback,
            balanceAnalysis: feedbackData.balanceAnalysis,
            passRate: Math.round(feedbackData.answerReadiness),
          },
          qas,
          balanceData,
          followUpStats: await db.getFollowUpStatsBySession(input.sessionId),
        };
        } catch (error) {
          console.error("면접 완료 처리 오류:", error);
          if (error instanceof TRPCError) throw error;
          // 저장 실패를 가짜 완료 결과로 바꾸지 않습니다. 사용자가 안전하게 재시도할 수 있습니다.
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "면접 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
          });
        }
      }),
    
    // 피드백 평가 제출
    rateFeedback: protectedProcedure
      .input(z.object({
        qaId: z.number(),
        rating: z.enum(["helpful", "needs_improvement"]),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOwnedInterviewQa(ctx.user.id, input.qaId);
        return db.createFeedbackRating({
          qaId: input.qaId,
          userId: ctx.user.id,
          rating: input.rating,
          comment: input.comment,
        });
      }),
    
    // 피드백 평가 조회
    getFeedbackRating: protectedProcedure
      .input(z.object({ qaId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getFeedbackRating(input.qaId, ctx.user.id);
      }),
    
    // 면접 통계 데이터 조회
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await db.getUserInterviewSessions(ctx.user.id);
      const completedSessions = sessions.filter(s => s.status === "completed");
      
      // 월별 면접 횟수
      const monthlyStats: Record<string, number> = {};
      const weeklyStats: Record<string, number> = {};
      const scoreHistory: Array<{ date: string; score: number }> = [];
      const answerLengthData: Array<{ sessionId: number; avgLength: number; avgWordCount: number }> = [];
      const speakingSpeedData: Array<{ sessionId: number; estimatedWPM: number }> = [];
      
      for (const session of completedSessions) {
        const date = new Date(session.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        
        monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
        weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;
        
        if (session.overallScore) {
          scoreHistory.push({
            date: date.toISOString().split('T')[0],
            score: session.overallScore,
          });
        }
        
        // 답변 길이 및 속도 분석
        const qas = await db.getSessionQAs(session.id);
        const answeredQAs = qas.filter(qa => qa.userAnswer);
        
        if (answeredQAs.length > 0) {
          const totalLength = answeredQAs.reduce((sum, qa) => sum + (qa.userAnswer?.length || 0), 0);
          const totalWords = answeredQAs.reduce((sum, qa) => {
            const words = qa.userAnswer?.split(/\s+/).filter(w => w.length > 0) || [];
            return sum + words.length;
          }, 0);
          
          answerLengthData.push({
            sessionId: session.id,
            avgLength: Math.round(totalLength / answeredQAs.length),
            avgWordCount: Math.round(totalWords / answeredQAs.length),
          });
          
          // 추정 말하기 속도 (한국어 평균 분당 120-150단어 기준, 1분 답변 가정)
          const estimatedWPM = Math.round(totalWords / answeredQAs.length);
          speakingSpeedData.push({
            sessionId: session.id,
            estimatedWPM,
          });
        }
      }
      
      // 강점/약점 분석
      const strengthCounts: Record<string, number> = {};
      const improvementCounts: Record<string, number> = {};
      
      for (const session of completedSessions) {
        const qas = await db.getSessionQAs(session.id);
        for (const qa of qas) {
          if (qa.strengths) {
            const strengths = typeof qa.strengths === 'string' ? JSON.parse(qa.strengths) : qa.strengths;
            if (Array.isArray(strengths)) {
              for (const s of strengths) {
                strengthCounts[s] = (strengthCounts[s] || 0) + 1;
              }
            }
          }
          if (qa.improvements) {
            const improvements = typeof qa.improvements === 'string' ? JSON.parse(qa.improvements) : qa.improvements;
            if (Array.isArray(improvements)) {
              for (const i of improvements) {
                improvementCounts[i] = (improvementCounts[i] || 0) + 1;
              }
            }
          }
        }
      }
      
      const topStrengths = Object.entries(strengthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      const topImprovements = Object.entries(improvementCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      // 질문 유형별 통계
      const questionTypeMap: Record<string, { count: number; totalScore: number }> = {};
      for (const session of completedSessions) {
        const qas = await db.getSessionQAs(session.id);
        for (const qa of qas) {
          if (qa.questionType && qa.score) {
            if (!questionTypeMap[qa.questionType]) {
              questionTypeMap[qa.questionType] = { count: 0, totalScore: 0 };
            }
            questionTypeMap[qa.questionType].count++;
            questionTypeMap[qa.questionType].totalScore += qa.score;
          }
        }
      }
      
      const questionTypeStats = Object.entries(questionTypeMap).map(([type, data]) => ({
        type,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }));
      
      return {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageScore: completedSessions.length > 0
          ? Math.round(completedSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completedSessions.length)
          : 0,
        monthlyStats: Object.entries(monthlyStats).map(([month, count]) => ({ month, count })),
        weeklyStats: Object.entries(weeklyStats).map(([week, count]) => ({ week, count })),
        scoreHistory,
        answerLengthData,
        speakingSpeedData,
        topStrengths,
        topImprovements,
        questionTypeStats,
      };
    }),
    
    // 답변 수정 평가
    reviseAnswer: protectedProcedure
      .input(z.object({
        qaId: z.number(),
        revisedAnswer: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 기존 QA 조회
        const { qa } = await requireOwnedInterviewQa(ctx.user.id, input.qaId);
        
        const profile = await db.getUserProfile(ctx.user.id);
        
        const prompt = `당신은 면접 코치입니다. 사용자가 답변을 수정했습니다. 수정된 답변을 평가해주세요.

지원 회사: ${profile?.targetCompany || "정보 없음"}
지원 직무: ${profile?.targetPosition || "정보 없음"}

질문: ${qa.question}

기존 답변: ${qa.userAnswer}
기존 점수: ${qa.score}점
기존 피드백: ${qa.feedback}

수정된 답변: ${input.revisedAnswer}

JSON 형식으로 다음을 제공해주세요:
1. score: 수정된 답변의 점수 (0-100)
2. feedback: 수정된 답변에 대한 피드백
3. improvements: 기존 답변 대비 개선된 점
4. remainingIssues: 아직 개선이 필요한 점`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 면접 코치입니다. 수정된 답변을 기존 답변과 비교하여 평가합니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[reviseAnswer] LLM 호출 실패:', llmError);
          throw new Error('답변 평가 중 AI 오류가 발생했습니다.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[reviseAnswer] LLM 응답 형식 오류:', JSON.stringify(response));
          throw new Error('AI 응답을 처리할 수 없습니다.');
        }

        const content = response.choices[0].message.content;
        let feedbackData;
        try {
          feedbackData = JSON.parse(typeof content === 'string' ? content : "{}");
        } catch (parseError) {
          console.error('[reviseAnswer] JSON 파싱 실패:', content);
          feedbackData = {
            score: 70,
            feedback: "수정된 답변을 확인했습니다.",
            improvements: "답변이 개선되었습니다.",
            remainingIssues: "추가 개선이 필요합니다."
          };
        }
        
        return {
          score: feedbackData.score,
          feedback: feedbackData.feedback,
          improvements: feedbackData.improvements,
          remainingIssues: feedbackData.remainingIssues,
        };
      }),

    // PDF 데이터 조회 (PDF 생성용)
    getPdfData: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await requireOwnedInterviewSession(ctx.user.id, input.sessionId);
        
        const profile = await db.getUserProfile(ctx.user.id);
        const qas = await db.getSessionQAs(input.sessionId);
        
        return {
          session: {
            id: session.id,
            status: session.status,
            totalScore: session.overallScore || 0,
            overallFeedback: session.overallFeedback,
            createdAt: session.createdAt.toISOString(),
            completedAt: session.updatedAt.toISOString(),
          },
          profile: {
            targetCompany: profile?.targetCompany || "미지정",
            targetPosition: profile?.targetPosition || "미지정",
          },
          qas: qas.map((qa: typeof qas[0]) => ({
            questionOrder: qa.questionOrder,
            questionType: qa.questionType,
            question: qa.question,
            userAnswer: qa.userAnswer,
            feedback: qa.feedback,
            score: qa.score,
            strengths: qa.strengths,
            improvements: qa.improvements,
            suggestedAnswer: qa.suggestedAnswer,
            suggestedAnswerShort: null,
            suggestedAnswerLong: null,
          })),
          userName: ctx.user.name || "사용자",
        };
      }),
    
    // 면접 연습 통계
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserInterviewStats(ctx.user.id);
    }),
    
    // 점수 추이 데이터 (최근 30일)
    scoreTrend: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserScoreTrend(ctx.user.id);
    }),
    
    // 질문 유형별 성적
    typePerformance: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTypePerformance(ctx.user.id);
    }),
    
    // 후속 질문 히스토리 저장
    saveFollowUpHistory: protectedProcedure
      .input(z.object({
        sessionId: z.number().optional(),
        originalQuestion: z.string(),
        userAnswer: z.string(),
        followUpQuestion: z.string(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
        depth: z.number().optional().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createFollowUpHistory({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          originalQuestion: input.originalQuestion,
          userAnswer: input.userAnswer,
          followUpQuestion: input.followUpQuestion,
          difficulty: input.difficulty,
          depth: input.depth,
        });
      }),
    
    // 후속 질문 히스토리 조회
    getFollowUpHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getFollowUpHistoryByUser(ctx.user.id);
    }),
    
    // 북마크된 후속 질문 조회
    getBookmarkedFollowUps: protectedProcedure.query(async ({ ctx }) => {
      return db.getBookmarkedFollowUps(ctx.user.id);
    }),
    
    // 후속 질문 북마크 토글
    toggleFollowUpBookmark: protectedProcedure
      .input(z.object({
        id: z.number(),
        isBookmarked: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleFollowUpBookmark(input.id, ctx.user.id, input.isBookmarked);
        return { success: true };
      }),
    
    // 후속 질문 답변 업데이트
    updateFollowUpAnswer: protectedProcedure
      .input(z.object({
        id: z.number(),
        followUpAnswer: z.string().max(12_000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateFollowUpAnswer(input.id, ctx.user.id, {
          followUpAnswer: input.followUpAnswer,
        });
        return { success: true };
      }),
    
    // 난이도별 후속 질문 통계
    getFollowUpStatsByDifficulty: protectedProcedure.query(async ({ ctx }) => {
      return db.getFollowUpStatsByUser(ctx.user.id);
    }),
    
    // 즐겨찾기 토글
    toggleFavorite: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('권한이 없습니다.');
        }
        
        await db.updateInterviewSession(input.sessionId, {
          isFavorite: !session.isFavorite,
        });
        
        return { success: true, isFavorite: !session.isFavorite };
      }),
    
    // 면접 세션 삭제
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('권한이 없습니다.');
        }
        
        // 면접 세션 삭제
        await db.deleteInterviewSession(input.sessionId);
        
        return { success: true };
      }),
    
    // 면접 결과 상세 조회
    getSessionDetail: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('면접 세션을 찾을 수 없습니다');
        }
        
        const qaList = await db.getSessionQAs(input.sessionId);
        const aiEvaluation = await db.getAIEvaluationBySession(input.sessionId);
        
        return {
          ...session,
          qaList,
          aiEvaluation,
        };
      }),
    
    // PDF 다운로드
    exportToPDF: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('권한이 없습니다.');
        }
        
        const qaList = await db.getSessionQAs(input.sessionId);
        
        // PDF 생성
        const { generateInterviewPDF } = await import('./_core/pdfGenerator');
        const pdfBuffer = await generateInterviewPDF({
          session,
          qaList,
        });
        
        return {
          data: pdfBuffer.toString('base64'),
          filename: `면접결과_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }),
    
    // Word 다운로드
    exportToWord: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('권한이 없습니다.');
        }
        
        const qaList = await db.getSessionQAs(input.sessionId);
        
        // Word 생성
        const { generateInterviewWord } = await import('./_core/wordGenerator');
        const wordBuffer = await generateInterviewWord({
          session,
          qaList,
        });
        
        return {
          data: wordBuffer.toString('base64'),
          filename: `면접결과_${new Date().toISOString().split('T')[0]}.docx`,
        };
      }),

    // 예상 질문 리스트 PDF 다운로드
    exportQuestionListPDF: protectedProcedure
      .input(z.object({ 
        sessionId: z.number(),
        category: z.string().optional(),
        selectedQuestionIds: z.array(z.number().int()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterviewSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error('권한이 없습니다.');
        }
        
        const allQaList = await db.getSessionQAs(input.sessionId);
        const categoryAliases: Record<string, string[]> = {
          "직무역량": ["technical", "company", "직무역량", "기술/전문성", "회사/직무 이해"],
          "인성": ["personality", "인성", "인성/성격"],
          "경험": ["experience", "경험", "경험/역량", "behavioral"],
          "상황대처": ["situational", "상황대처", "roleplay", "scenario"],
          "전략게임": ["strategy", "technical", "전략게임", "게임"],
          "심층면접": ["deep", "follow_up", "심층면접", "꼬리질문"],
        };
        const requestedCategory = input.category?.trim() || "all";
        const aliases = categoryAliases[requestedCategory] || [requestedCategory];
        const normalizedAliases = aliases.map(alias => alias.toLowerCase());
        const categoryFilteredQaList = requestedCategory !== "all"
          ? allQaList.filter(qa => normalizedAliases.includes((qa.questionType || "").toLowerCase()))
          : allQaList;
        const qaList = input.selectedQuestionIds
          ? categoryFilteredQaList.filter((qa) => input.selectedQuestionIds!.includes(qa.id))
          : categoryFilteredQaList;

        if (qaList.length === 0) {
          throw new Error('선택한 조건에 맞는 질문이 없습니다. 질문을 하나 이상 선택해주세요.');
        }
        
        const { generateQuestionListPDF } = await import('./_core/pdfGenerator');
        const pdfBuffer = await generateQuestionListPDF({
          session,
          qaList,
          category: input.category,
        });
        
        return {
          data: pdfBuffer.toString('base64'),
          filename: `AI예상질문리스트_${input.category && input.category !== "all" ? input.category : "전체"}_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }),
  }),

  // 결제 관련 (키움페이 통합)
  payment: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getPaymentsByUserId(ctx.user.id);
  }),

  // 레거시 키움페이 브라우저 콜백은 결제 진위를 서버에서 검증할 수 없어 비활성화했습니다.
  // 결제 생성·승인·취소는 tossPayment의 서버 검증 경로만 사용합니다.
  }),

  // 외부 결제 링크 관리
  paymentLink: router({
    // 플랜별 결제 링크 조회 (공개)
    getByPlan: publicProcedure
      .input(z.object({ planType: z.enum(["monthly", "basic", "premium", "premium_plus"]) }))
      .query(async ({ input }) => {
        const dbPaymentLinks = await import("./db_payment_links");
        return dbPaymentLinks.getPaymentLinkByPlanType(input.planType);
      }),
    
    // 결제 신청 생성
    createRequest: protectedProcedure
      .input(z.object({
        planType: z.enum(["monthly", "basic", "premium", "premium_plus"]),
        externalPaymentId: z.string().trim().min(1).max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbPaymentLinks = await import("./db_payment_links");
        const productType = input.planType === "monthly" ? "premium_plus" : input.planType;
        const amount = PAYMENT_PRODUCTS[productType].price;
        const request = await dbPaymentLinks.createPaymentRequest({
          userId: ctx.user.id,
          planType: input.planType,
          amount,
          externalPaymentId: input.externalPaymentId,
        });
        
        return {
          success: true,
          requestId: request.insertId,
          message: "결제 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다.",
        };
      }),
    
    // 내 결제 신청 내역 조회
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      const dbPaymentLinks = await import("./db_payment_links");
      return dbPaymentLinks.getUserPaymentRequests(ctx.user.id);
    }),
    
    // 결제 신청 취소
    cancelRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbPaymentLinks = await import("./db_payment_links");
        const request = await dbPaymentLinks.getPaymentRequestById(input.requestId);
        
        if (!request || request.userId !== ctx.user.id) {
          throw new Error("결제 신청을 찾을 수 없습니다.");
        }
        
        if (request.status !== "pending") {
          throw new Error("대기 중인 신청만 취소할 수 있습니다.");
        }
        
        await dbPaymentLinks.cancelPaymentRequest(input.requestId);
        return { success: true, message: "결제 신청이 취소되었습니다." };
      }),
    
    // 관리자: 모든 결제 링크 조회
    listLinks: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      const dbPaymentLinks = await import("./db_payment_links");
      return dbPaymentLinks.getAllPaymentLinks();
    }),
    
    // 관리자: 결제 링크 생성/수정
    upsertLink: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        planType: z.enum(["monthly", "basic", "premium", "premium_plus"]),
        externalUrl: storedHttpsUrlSchema,
        description: z.string().trim().max(255).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        const dbPaymentLinks = await import("./db_payment_links");
        const { id, ...data } = input;
        
        if (id) {
          await dbPaymentLinks.updatePaymentLink(id, data);
        } else {
          await dbPaymentLinks.createPaymentLink(data);
        }
        
        return { success: true };
      }),
    
    // 관리자: 대기 중인 결제 신청 조회
    pendingRequests: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      const dbPaymentLinks = await import("./db_payment_links");
      return dbPaymentLinks.getPendingPaymentRequests();
    }),
    
    // 관리자: 결제 신청 승인
    approveRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        const dbPaymentLinks = await import("./db_payment_links");
        const request = await dbPaymentLinks.getPaymentRequestById(input.requestId);
        
        if (!request) {
          throw new Error("결제 신청을 찾을 수 없습니다.");
        }
        
        if (request.status !== "pending") {
          throw new Error("대기 중인 신청만 승인할 수 있습니다.");
        }
        
        const fulfilled = await dbPaymentLinks.fulfillPendingPaymentRequest(request, ctx.user.id);
        if (!fulfilled) {
          throw new Error("이미 처리된 결제 신청입니다.");
        }
        
        return { success: true, message: "결제 신청이 승인되었습니다." };
      }),
    
    // 관리자: 결제 신청 거부
    rejectRequest: protectedProcedure
      .input(z.object({ 
        requestId: z.number().int().positive(),
        reason: z.string().trim().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        const dbPaymentLinks = await import("./db_payment_links");
        const request = await dbPaymentLinks.getPaymentRequestById(input.requestId);
        if (!request || request.status !== "pending") {
          throw new Error("대기 중인 결제 신청만 거부할 수 있습니다.");
        }
        await dbPaymentLinks.rejectPaymentRequest(input.requestId, input.reason);
        return { success: true, message: "결제 신청이 거부되었습니다." };
      }),
  }),

  // 구독 관련
  subscription: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserActiveSubscription(ctx.user.id);
    }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSubscriptions(ctx.user.id);
    }),
    
    // 구독 접근 권한 확인
    checkAccess: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserActiveSubscription(ctx.user.id);
      if (subscription && subscription.status === "active") {
        return { hasAccess: true, type: "subscription" as const };
      }
      return { hasAccess: false, type: null };
    }),
    
    // 구독 해지
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const subscription = await db.getUserActiveSubscription(ctx.user.id);
      if (!subscription) {
        throw new Error("활성 구독이 없습니다.");
      }
      
      // 키움페이 구독 취소 (자동키 삭제)
      // 현재는 데이터베이스에서만 처리
      await db.updateSubscription(subscription.id, {
        status: "cancelled",
        cancelledAt: new Date(),
      });
      
      return { success: true };
    }),
  }),

  // 면접 후기 데이터
  reviews: router({
    list: publicProcedure
      .input(z.object({
        companyName: z.string().optional(),
        positionType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getInterviewReviews(input?.companyName, input?.positionType);
      }),
  }),

  // 어려운 질문 관리
  difficultQuestions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getDifficultQuestions(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        question: z.string().trim().min(1).max(1000),
        category: z.string().trim().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createDifficultQuestion({
          userId: ctx.user.id,
          question: input.question,
          category: input.category,
        });
      }),
    
    practice: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        answer: z.string().trim().min(1).max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const question = await db.getDifficultQuestionById(input.id);
        if (!question || question.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "질문을 찾을 수 없습니다." });
        }
        
        const profile = await db.getUserProfile(ctx.user.id);
        
        const prompt = `당신은 면접 코치입니다.

어려운 질문: ${question.question}
사용자 답변: ${input.answer}

지원자 배경:
- 지원 회사: ${profile?.targetCompany || "정보 없음"}
- 지원 직무: ${profile?.targetPosition || "정보 없음"}

답변에 대한 상세한 피드백을 제공해주세요. 강점, 개선점, 모범 답안을 포함해주세요.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "당신은 면접 코칭 전문가입니다. 건설적이고 구체적인 피드백을 제공합니다." },
            { role: "user", content: prompt }
          ],
        });

        const feedbackContent = response.choices[0].message.content;
        const feedback = typeof feedbackContent === 'string' ? feedbackContent : "";
        
        await db.updateDifficultQuestion(input.id, {
          userAnswer: input.answer,
          aiFeedback: feedback,
          practiceCount: (question.practiceCount || 0) + 1,
          lastPracticedAt: new Date(),
        });
        
        return { ...question, userAnswer: input.answer, aiFeedback: feedback };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const question = await db.getDifficultQuestionById(input.id);
        if (!question || question.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "질문을 찾을 수 없습니다." });
        }
        await db.deleteDifficultQuestion(input.id);
        return { success: true };
      }),
  }),

  // 파일 업로드 관련
  files: router({
    saveResumeFile: protectedProcedure
      .input(z.object({
        fileUrl: storedHttpsUrlSchema,
        fileName: z.string().trim().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserProfile({
          userId: ctx.user.id,
          resumeFileUrl: input.fileUrl,
          resumeFileName: input.fileName,
        });
      }),
    
    saveCoverLetterFile: protectedProcedure
      .input(z.object({
        fileUrl: storedHttpsUrlSchema,
        fileName: z.string().trim().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserProfile({
          userId: ctx.user.id,
          coverLetterFileUrl: input.fileUrl,
          coverLetterFileName: input.fileName,
        });
      }),
  }),

  // 저장된 연습 내역 관리
  savedPractices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getSavedPractices(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number().optional(),
        title: z.string(),
        companyName: z.string().optional(),
        positionName: z.string().optional(),
        practiceType: z.enum(["mock_interview", "difficult_question", "custom"]).optional(),
        content: z.string(),
        overallScore: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSavedPractice({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        notes: z.string().optional(),
        isFavorite: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const practice = await db.getSavedPracticeById(id);
        if (!practice || practice.userId !== ctx.user.id) {
          throw new Error("저장된 연습을 찾을 수 없습니다.");
        }
        await db.updateSavedPractice(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const practice = await db.getSavedPracticeById(input.id);
        if (!practice || practice.userId !== ctx.user.id) {
          throw new Error("저장된 연습을 찾을 수 없습니다.");
        }
        await db.deleteSavedPractice(input.id);
        return { success: true };
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const practice = await db.getSavedPracticeById(input.id);
        if (!practice || practice.userId !== ctx.user.id) {
          throw new Error("저장된 연습을 찾을 수 없습니다.");
        }
        return practice;
      }),
  }),

  // 사용자 설정 관리
  user: router({
    // 사용자 유형 업데이트
    updateType: protectedProcedure
      .input(z.object({
        userType: z.enum(["new_grad", "experienced", "career_change", "return"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserType(ctx.user.id, input.userType);
        return { success: true };
      }),
    
    // 7일 무료 체험 시작
    startFreeTrial: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (user?.freeTrialStartedAt) {
        throw new Error("이미 무료 체험을 사용하셨습니다.");
      }
      return db.startFreeTrial(ctx.user.id);
    }),
    
    // 무료 체험 상태 확인
    checkFreeTrial: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.freeTrialStartedAt) {
        return { hasUsedTrial: false, isActive: false, endsAt: null };
      }
      const now = new Date();
      const isActive = user.freeTrialEndsAt ? now < user.freeTrialEndsAt : false;
      return {
        hasUsedTrial: true,
        isActive,
        endsAt: user.freeTrialEndsAt,
        startedAt: user.freeTrialStartedAt,
      };
    }),
    
    // 사용자 정보 조회
    getInfo: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        userType: user?.userType,
        role: user?.role,
        freeTrialStartedAt: user?.freeTrialStartedAt,
        freeTrialEndsAt: user?.freeTrialEndsAt,
        firstVisitAt: user?.firstVisitAt,
        createdAt: user?.createdAt,
      };
    }),
     // 최초 방문 기록 (타이머용)
    recordFirstVisit: protectedProcedure.mutation(async ({ ctx }) => {
      return db.updateUserFirstVisit(ctx.user.id);
    }),
    
    // 목표 점수 설정
    setTargetScore: protectedProcedure
      .input(z.object({ targetScore: z.number().min(0).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.id, { targetScore: input.targetScore });
        return { success: true };
      }),
    
    // 목표 점수 조회
    getTargetScore: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { targetScore: user?.targetScore || 70 };
    }),
  }),

  // 자동 질문 생성 및 대표 질문 추천
  autoQuestion: router({
    // 이력서/자소서 기반 자동 질문 생성
    generateFromProfile: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await db.getUserProfile(ctx.user.id);
      
      const prompt = `당신은 구조화 면접 연습 질문을 설계하는 코치입니다.

지원자 정보:
- 이력서: ${profile?.resume || "정보 없음"}
- 자기소개서: ${profile?.coverLetter || "정보 없음"}
- 지원 회사: ${profile?.targetCompany || "정보 없음"}
- 지원 직무: ${profile?.targetPosition || "정보 없음"}
- 경력: ${profile?.experience || "정보 없음"}
- 학력: ${profile?.education || "정보 없음"}

이 지원자에게 나올 수 있는 면접 질문 5개를 생성해주세요.
각 질문에는 질문 유형(personality/experience/technical/situational/company)과 난이도(1-5)를 포함해주세요.`;

      let response;
      try {
        response = await invokeLLM({
          messages: [
            { role: "system", content: "당신은 구조화 면접 연습 코치입니다. 제공된 지원 정보에만 근거해 맞춤형 질문을 생성하고, 실제 출제 확률이나 채용 결과를 주장하지 않습니다. 반드시 JSON 형식으로 응답하세요." },
            { role: "user", content: prompt + "\n\n반드시 다음 JSON 형식으로 응답하세요: {\"questions\": [{\"question\": \"질문\", \"type\": \"유형\", \"difficulty\": 숫자, \"reason\": \"이유\"}]}" }
          ],
          response_format: {
            type: "json_object",
          },
        });
      } catch (llmError) {
        console.error('[generateFromProfile] LLM 호출 실패:', llmError);
        throw new Error('질문 생성 중 AI 오류가 발생했습니다.');
      }

      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        console.error('[generateFromProfile] LLM 응답 형식 오류:', JSON.stringify(response));
        throw new Error('AI 응답을 처리할 수 없습니다.');
      }

      const content = response.choices[0].message.content;
      try {
        return JSON.parse(typeof content === 'string' ? content : "{}");
      } catch (parseError) {
        console.error('[generateFromProfile] JSON 파싱 실패:', content);
        return { questions: [] };
      }
    }),

    // 상황 유추 질문 (나이, 전공, 지역 등)
    generateSituational: protectedProcedure
      .input(z.object({
        age: z.number().optional(),
        major: z.string().optional(),
        region: z.string().optional(),
        careerGap: z.boolean().optional(),
        isCareerChange: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getUserProfile(ctx.user.id);
        
        let situationContext = "";
        if (input.age && input.age > 30) situationContext += `\n- 나이: ${input.age}세 (다소 늦은 취업)`;
        if (input.major) situationContext += `\n- 전공: ${input.major}`;
        if (input.region && input.region !== "서울") situationContext += `\n- 거주지: ${input.region} (지방 거주)`;
        if (input.careerGap) situationContext += `\n- 경력 공백 있음`;
        if (input.isCareerChange) situationContext += `\n- 이직/전직 지원자`;

        const prompt = `당신은 면접관입니다. 다음 지원자의 특수한 상황에 대해 질문할 수 있는 질문 3개를 생성해주세요.

지원자 상황:${situationContext || "\n- 일반적인 신입 지원자"}
지원 회사: ${profile?.targetCompany || "정보 없음"}
지원 직무: ${profile?.targetPosition || "정보 없음"}

이러한 상황에서 면접관이 자주 묻는 질문들을 생성해주세요.`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 대한민국 취업 면접 전문가입니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt + "\n\n반드시 다음 JSON 형식으로 응답하세요: {\"questions\": [{\"question\": \"질문\", \"situation\": \"상황\", \"tip\": \"팁\"}]}" }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[generateSituational] LLM 호출 실패:', llmError);
          throw new Error('질문 생성 중 AI 오류가 발생했습니다.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[generateSituational] LLM 응답 형식 오류:', JSON.stringify(response));
          throw new Error('AI 응답을 처리할 수 없습니다.');
        }

        const content = response.choices[0].message.content;
        try {
          return JSON.parse(typeof content === 'string' ? content : "{}");
        } catch (parseError) {
          console.error('[generateSituational] JSON 파싱 실패:', content);
          return { questions: [] };
        }
      }),

    // 대표 연습 질문 추천
    getPopularQuestions: publicProcedure
      .input(z.object({
        category: z.enum(["all", "personality", "experience", "technical", "situational", "company"]).default("all"),
        limit: z.number().int().min(1).max(50).default(10),
      }))
      .query(async ({ input }) => {
        // 일반적인 구조화 면접 연습 범주를 기반으로 한 대표 질문
        const popularQuestions = [
          // 인성/성격 (personality) - 15개
          { id: 1, question: "자기소개를 해주세요.", category: "personality", frequency: 98 },
          { id: 2, question: "본인의 장점과 단점을 말씀해주세요.", category: "personality", frequency: 92 },
          { id: 3, question: "마지막으로 하고 싶은 말이 있나요?", category: "personality", frequency: 82 },
          { id: 4, question: "5년 후 어떤 모습이길 바라나요?", category: "personality", frequency: 75 },
          { id: 5, question: "본인을 한 단어로 표현한다면?", category: "personality", frequency: 70 },
          { id: 6, question: "주변 사람들은 본인을 어떻게 평가하나요?", category: "personality", frequency: 68 },
          { id: 7, question: "인생에서 가장 중요하게 생각하는 가치는 무엇인가요?", category: "personality", frequency: 65 },
          { id: 8, question: "스트레스를 받으면 어떻게 해소하나요?", category: "personality", frequency: 62 },
          { id: 9, question: "본인의 업무 스타일은 어떤가요?", category: "personality", frequency: 60 },
          { id: 10, question: "어떤 환경에서 가장 일을 잘하나요?", category: "personality", frequency: 58 },
          { id: 11, question: "삶의 목표는 무엇인가요?", category: "personality", frequency: 55 },
          { id: 12, question: "본인의 리더십 스타일은 어떤가요?", category: "personality", frequency: 52 },
          { id: 13, question: "어떤 상사와 일하고 싶으세요?", category: "personality", frequency: 50 },
          { id: 14, question: "어떤 동료와 일하기 어려울 것 같나요?", category: "personality", frequency: 48 },
          { id: 15, question: "워라이프 밸런스에 대해 어떻게 생각하나요?", category: "personality", frequency: 45 },
          
          // 경험/역량 (experience) - 15개
          { id: 16, question: "가장 어려웠던 경험과 그것을 어떻게 극복했나요?", category: "experience", frequency: 90 },
          { id: 17, question: "이직/전직 사유가 무엇인가요?", category: "experience", frequency: 72 },
          { id: 18, question: "가장 성공적인 프로젝트 경험을 말씀해주세요.", category: "experience", frequency: 85 },
          { id: 19, question: "실패 경험과 그것에서 배운 점은 무엇인가요?", category: "experience", frequency: 80 },
          { id: 20, question: "팀워크 경험에 대해 말씀해주세요.", category: "experience", frequency: 78 },
          { id: 21, question: "리더십을 발휘한 경험이 있나요?", category: "experience", frequency: 75 },
          { id: 22, question: "전공을 선택한 이유는 무엇인가요?", category: "experience", frequency: 70 },
          { id: 23, question: "학창 시절 가장 열정적으로 한 활동은 무엇인가요?", category: "experience", frequency: 68 },
          { id: 24, question: "인턴/아르바이트 경험에서 배운 점은?", category: "experience", frequency: 65 },
          { id: 25, question: "본인이 이룬낸 가장 큰 성과는 무엇인가요?", category: "experience", frequency: 62 },
          { id: 26, question: "업무 외에 어떤 자기계발을 하고 있나요?", category: "experience", frequency: 58 },
          { id: 27, question: "공백 기간이 있는데 그 동안 무엇을 했나요?", category: "experience", frequency: 55 },
          { id: 28, question: "해외 경험이 있다면 말씀해주세요.", category: "experience", frequency: 52 },
          { id: 29, question: "보유한 자격증에 대해 설명해주세요.", category: "experience", frequency: 50 },
          { id: 30, question: "어학 능력은 어느 정도인가요?", category: "experience", frequency: 48 },
          
          // 기술/전문성 (technical) - 12개
          { id: 31, question: "해당 직무에 필요한 역량은 무엇이라고 생각하나요?", category: "technical", frequency: 78 },
          { id: 32, question: "이 직무를 위해 어떤 준비를 했나요?", category: "technical", frequency: 75 },
          { id: 33, question: "최신 업계 트렌드에 대해 어떻게 생각하나요?", category: "technical", frequency: 70 },
          { id: 34, question: "전문 분야에서 가장 자신 있는 기술은 무엇인가요?", category: "technical", frequency: 68 },
          { id: 35, question: "해당 직무에서 가장 중요한 것은 무엇이라고 생각하나요?", category: "technical", frequency: 65 },
          { id: 36, question: "업무 효율을 높이기 위해 어떤 노력을 하나요?", category: "technical", frequency: 62 },
          { id: 37, question: "데이터 분석/활용 경험이 있나요?", category: "technical", frequency: 58 },
          { id: 38, question: "AI/디지털 트랜스포메이션에 대해 어떻게 생각하나요?", category: "technical", frequency: 55 },
          { id: 39, question: "프로젝트 관리 경험이 있나요?", category: "technical", frequency: 52 },
          { id: 40, question: "업무 우선순위를 어떻게 정하나요?", category: "technical", frequency: 50 },
          { id: 41, question: "복잡한 문제를 해결한 경험을 말씀해주세요.", category: "technical", frequency: 48 },
          { id: 42, question: "업무 프로세스를 개선한 경험이 있나요?", category: "technical", frequency: 45 },
          
          // 상황대처 (situational) - 12개
          { id: 43, question: "팀 프로젝트에서 갈등이 생기면 어떻게 해결하나요?", category: "situational", frequency: 85 },
          { id: 44, question: "업무 중 실수를 했을 때 어떻게 대처하나요?", category: "situational", frequency: 80 },
          { id: 45, question: "마감 기한을 맞추지 못할 것 같을 때 어떻게 하나요?", category: "situational", frequency: 75 },
          { id: 46, question: "상사의 지시에 동의하지 않을 때 어떻게 하나요?", category: "situational", frequency: 72 },
          { id: 47, question: "고객이 불만을 표출할 때 어떻게 대응하나요?", category: "situational", frequency: 70 },
          { id: 48, question: "여러 업무가 동시에 주어지면 어떻게 처리하나요?", category: "situational", frequency: 68 },
          { id: 49, question: "팀원이 업무를 제대로 수행하지 않을 때 어떻게 하나요?", category: "situational", frequency: 65 },
          { id: 50, question: "예상치 못한 문제가 발생했을 때 어떻게 대처하나요?", category: "situational", frequency: 62 },
          { id: 51, question: "업무 중 압박감을 느낄 때 어떻게 관리하나요?", category: "situational", frequency: 60 },
          { id: 52, question: "회사의 방향과 본인의 의견이 다를 때 어떻게 하나요?", category: "situational", frequency: 58 },
          { id: 53, question: "새로운 환경에 적응한 경험을 말씀해주세요.", category: "situational", frequency: 55 },
          { id: 54, question: "비효율적인 프로세스를 발견했을 때 어떻게 하나요?", category: "situational", frequency: 52 },
          
          // 회사/직무 (company) - 12개
          { id: 55, question: "우리 회사에 지원한 이유가 무엇인가요?", category: "company", frequency: 95 },
          { id: 56, question: "입사 후 포부는 무엇인가요?", category: "company", frequency: 88 },
          { id: 57, question: "연봉 희망액이 어떻게 되나요?", category: "company", frequency: 70 },
          { id: 58, question: "우리 회사에 대해 얼마나 알고 있나요?", category: "company", frequency: 85 },
          { id: 59, question: "우리 회사의 경쟁사는 어디라고 생각하나요?", category: "company", frequency: 72 },
          { id: 60, question: "우리 회사의 강점과 약점은 무엇이라고 생각하나요?", category: "company", frequency: 68 },
          { id: 61, question: "이 직무에 지원한 이유는 무엇인가요?", category: "company", frequency: 82 },
          { id: 62, question: "우리 회사에서 어떤 기여를 할 수 있나요?", category: "company", frequency: 78 },
          { id: 63, question: "입사 후 어떤 부서에서 일하고 싶으세요?", category: "company", frequency: 65 },
          { id: 64, question: "우리 회사의 제품/서비스를 사용해본 적 있나요?", category: "company", frequency: 62 },
          { id: 65, question: "다른 회사에도 지원했나요? 그 회사들과 비교하면?", category: "company", frequency: 60 },
          { id: 66, question: "입사 가능 시기는 언제인가요?", category: "company", frequency: 58 },
          
          // 추가 신입/경력 공통 질문 - 10개
          { id: 67, question: "회사를 선택할 때 가장 중요하게 생각하는 기준은?", category: "company", frequency: 55 },
          { id: 68, question: "업무에서 가장 보람을 느낀 때는 언제인가요?", category: "personality", frequency: 52 },
          { id: 69, question: "업무 외 시간에는 주로 무엇을 하나요?", category: "personality", frequency: 50 },
          { id: 70, question: "최근에 읽은 책이나 본 콘텐츠 중 인상 깊은 것은?", category: "personality", frequency: 48 },
          { id: 71, question: "협업 시 가장 중요하게 생각하는 것은 무엇인가요?", category: "experience", frequency: 55 },
          { id: 72, question: "본인만의 차별화된 경쟁력은 무엇인가요?", category: "experience", frequency: 52 },
          { id: 73, question: "업무에서 가장 어려운 점은 무엇이라고 생각하나요?", category: "technical", frequency: 50 },
          { id: 74, question: "새로운 기술이나 트렌드를 어떻게 학습하나요?", category: "technical", frequency: 48 },
          { id: 75, question: "업무 성과를 어떻게 측정하나요?", category: "technical", frequency: 45 },
          { id: 76, question: "회사에 바라는 점이 있다면 무엇인가요?", category: "company", frequency: 42 },
        ];

        const selected = input.category === "all"
          ? popularQuestions.slice(0, input.limit)
          : popularQuestions.filter(q => q.category === input.category).slice(0, input.limit);
        return selected.map(({ id, question, category }) => ({ id, question, category }));
      }),
  }),

  // 질문 크레딧 관리
  freeLimit: router({
    // 크레딧 상태 확인
    check: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserActiveSubscription(ctx.user.id);
      const hasSubscription = subscription?.status === "active";
      
      const user = await db.getUserById(ctx.user.id);
      const hasFreeTrial = user?.freeTrialEndsAt && new Date() < user.freeTrialEndsAt;
      
      const questionCredits = user?.questionCredits || 0;
      const totalPurchasedCredits = user?.totalPurchasedCredits || 0;
      
      return {
        questionCredits, // 잔여 크레딧
        totalPurchasedCredits, // 총 구매한 크레딧
        freeLimit: 3, // 초기 무료 크레딧
        remaining: questionCredits,
        needsPayment: questionCredits <= 0 && !hasSubscription && !hasFreeTrial,
        hasSubscription,
        hasFreeTrial,
        // 레거시 필드 (호환성)
        usedQuestions: totalPurchasedCredits - questionCredits,
      };
    }),
    
    // 크레딧 차감
    useCredit: protectedProcedure
      .input(z.object({ count: z.number().optional().default(1) }))
      .mutation(async ({ ctx, input }) => {
        // 구독 사용자는 차감 없이 통과
        const subscription = await db.getUserActiveSubscription(ctx.user.id);
        if (subscription?.status === "active") {
          return { success: true, remainingCredits: -1, message: "구독 사용자" };
        }
        
        // 무료 체험 사용자도 차감 없이 통과
        const user = await db.getUserById(ctx.user.id);
        if (user?.freeTrialEndsAt && new Date() < user.freeTrialEndsAt) {
          return { success: true, remainingCredits: -1, message: "무료 체험 중" };
        }
        
        return db.useQuestionCredit(ctx.user.id, input.count);
      }),
    
    // 크레딧 추가 (결제 후) - 내역 기록 포함
    addCredits: protectedProcedure
      .input(z.object({ 
        credits: z.number(),
        description: z.string().optional(),
        paymentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.addQuestionCreditsWithHistory(
          ctx.user.id, 
          input.credits, 
          input.description || `${input.credits}개 크레딧 구매`,
          input.paymentId
        );
      }),
    
    // 크레딧 내역 조회
    history: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const history = await db.getCreditHistory(ctx.user.id, input.limit, input.offset);
        const stats = await db.getCreditStats(ctx.user.id);
        return { history, stats };
      }),
    
    // 크레딧 통계
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getCreditStats(ctx.user.id);
    }),
    
    // 실패 시 크레딧 복원은 서버의 원래 작업 흐름에서만 자동 처리합니다.
  }),

  // TTS 모니터링 (관리자 전용)
  ttsMonitoring: router({ 
    // TTS 오류 로그 기록
    logError: protectedProcedure
      .input(z.object({
        errorMessage: z.string(),
        errorType: z.string(),
        questionText: z.string().optional(),
        voiceType: z.string().optional(),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.recordTTSError({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    // TTS 오류 로그 조회 (관리자 전용)
    getLogs: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        // 관리자 권한 확인
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        
        return db.getTTSErrorLogs(input);
      }),
    
    // TTS 오류 통계 (관리자 전용)
    getStats: protectedProcedure.query(async ({ ctx }) => {
      // 관리자 권한 확인
      if (ctx.user.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      return db.getTTSErrorStats();
    }),
  }),

  // 사용 횟수 추적 (sessionId 기반)
  usage: router({
    // 사용 횟수 조회
    get: publicProcedure
      .input(z.object({
        sessionId: z.string().min(12).max(128).regex(/^[A-Za-z0-9_-]+$/),
        featureType: z.enum(["voice_interview", "text_interview", "company_analysis", "difficult_question", "feedback"]),
      }))
      .query(async ({ input }) => {
        const count = await db.getUsageCount(input.sessionId, input.featureType);
        return { count };
      }),
    
    // 사용 횟수 증가
    increment: publicProcedure
      .input(z.object({
        sessionId: z.string().min(12).max(128).regex(/^[A-Za-z0-9_-]+$/),
        featureType: z.enum(["voice_interview", "text_interview", "company_analysis", "difficult_question", "feedback"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const newCount = await db.incrementUsageCount(input.sessionId, input.featureType, ctx.user?.id);
        return { count: newCount };
      }),
    
    // 전체 사용 횟수 조회
    getTotal: publicProcedure
      .input(z.object({ sessionId: z.string().min(12).max(128).regex(/^[A-Za-z0-9_-]+$/) }))
      .query(async ({ input }) => {
        const total = await db.getTotalUsageCount(input.sessionId);
        return { total };
      }),
    
    // 가입 유도 필요 여부 확인
    shouldPromptSignup: publicProcedure
      .input(z.object({ sessionId: z.string().min(12).max(128).regex(/^[A-Za-z0-9_-]+$/) }))
      .query(async ({ input }) => {
        const voiceCount = await db.getUsageCount(input.sessionId, "voice_interview");
        const totalCount = await db.getTotalUsageCount(input.sessionId);
        
        // 음성 면접 1회는 무료, 2회부터 가입 유도 / 다른 기능 3회 후 가입 유도
        const shouldPromptForVoice = voiceCount >= 1; // 1회 사용 후부터 유도 (시작 전에는 0이므로 1회 무료 사용 가능)
        const shouldPromptForOther = totalCount >= 3;
        
        return {
          shouldPrompt: shouldPromptForVoice || shouldPromptForOther,
          reason: shouldPromptForVoice ? "voice_limit" : shouldPromptForOther ? "usage_limit" : null,
          voiceCount,
          totalCount,
        };
      }),
  }),

  // 기업 정보 검색 및 분석
  companySearch: router({
    // 기업명으로 검색 및 AI 분석
    analyze: protectedProcedure
      .input(z.object({
        companyName: z.string().trim().min(1).max(100),
        positionType: z.string().trim().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        // 캐시 확인
        const cached = await db.getCompanyInfoCache(input.companyName);
        
        // 캐시가 24시간 이내면 캐시 사용
        if (cached && cached.lastUpdatedAt) {
          const hoursSinceUpdate = (Date.now() - new Date(cached.lastUpdatedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 24) {
            return {
              ...cached,
              fromCache: true,
            };
          }
        }
        
        // AI를 통한 기업 분석
        const prompt = `당신은 대한민국 기업 분석 전문가입니다.

기업명: ${input.companyName}
지원 직무: ${input.positionType || "정보 없음"}

다음 정보를 기반으로 기업을 분석해주세요:
1. 공시 정보 (DART 공시, 사업보고서)
2. 최근 뉴스 보도자료 (3년 이내)
3. 기업 공식 블로그/SNS
4. 관련 정부 부처 정책 및 지원 사업

분석 결과를 JSON 형식으로 제공해주세요.`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 대한민국 기업 분석 전문가입니다. 공시, 뉴스, 블로그, 정부 정책 등을 종합적으로 분석합니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[analyzeCompany] LLM 호출 실패:', llmError);
          throw new Error('기업 분석 중 AI 오류가 발생했습니다.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[analyzeCompany] LLM 응답 형식 오류:', JSON.stringify(response));
          throw new Error('AI 응답을 처리할 수 없습니다.');
        }

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        let analysisResult;
        try {
          analysisResult = JSON.parse(content || "{}");
        } catch {
          analysisResult = { error: "AI 분석 실패" };
        }

        // 캐시 저장
        await db.upsertCompanyInfoCache({
          companyName: input.companyName,
          industry: analysisResult.industry,
          foundedYear: analysisResult.foundedYear,
          employeeCount: analysisResult.employeeCount,
          revenue: analysisResult.revenue,
          newsData: JSON.stringify(analysisResult.recentNews || []),
          governmentData: analysisResult.governmentRelation,
          analyzedStage: analysisResult.stage,
          stageAnalysisReason: analysisResult.stageReason,
        });

        return {
          companyName: input.companyName,
          ...analysisResult,
          fromCache: false,
        };
      }),
    
    // 캐시된 기업 정보 조회
    getCached: publicProcedure
      .input(z.object({ companyName: z.string() }))
      .query(async ({ input }) => {
        return db.getCompanyInfoCache(input.companyName);
      }),
  }),

  // 면접 일정 관리
  schedule: router({
    // 면접 일정 목록 조회
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getInterviewSchedules(ctx.user.id);
    }),
    
    // 다가오는 면접 일정 조회
    upcoming: protectedProcedure.query(async ({ ctx }) => {
      return db.getUpcomingSchedules(ctx.user.id);
    }),
    
    // 면접 일정 생성
    create: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        positionName: z.string().optional(),
        interviewDate: z.string(), // ISO 날짜 문자열
        interviewType: z.enum(["phone", "video", "onsite", "other"]).optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        reminderDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createInterviewSchedule({
          userId: ctx.user.id,
          companyName: input.companyName,
          positionName: input.positionName,
          interviewDate: new Date(input.interviewDate),
          interviewType: input.interviewType,
          location: input.location,
          notes: input.notes,
          reminderDays: input.reminderDays || 3,
        });
      }),
    
    // 면접 일정 수정
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().optional(),
        positionName: z.string().optional(),
        interviewDate: z.string().optional(),
        interviewType: z.enum(["phone", "video", "onsite", "other"]).optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ownedSchedules = await db.getInterviewSchedules(ctx.user.id);
        if (!ownedSchedules.some(schedule => schedule.id === input.id)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "면접 일정을 찾을 수 없습니다." });
        }
        const { id, interviewDate, ...data } = input;
        await db.updateInterviewSchedule(id, {
          ...data,
          ...(interviewDate && { interviewDate: new Date(interviewDate) }),
        });
        return { success: true };
      }),
    
    // 면접 일정 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ownedSchedules = await db.getInterviewSchedules(ctx.user.id);
        if (!ownedSchedules.some(schedule => schedule.id === input.id)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "면접 일정을 찾을 수 없습니다." });
        }
        await db.deleteInterviewSchedule(input.id);
        return { success: true };
      }),
  }),

  // 알림 설정 관리
  notification: router({
    // 알림 설정 조회
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getNotificationSettings(ctx.user.id);
      return settings || {
        emailNotification: true,
        inAppNotification: true,
        subscriptionReminder: true,
        interviewReminder: true,
        reminderDaysBefore: 3,
      };
    }),
    
    // 알림 설정 업데이트
    updateSettings: protectedProcedure
      .input(z.object({
        emailNotification: z.boolean().optional(),
        inAppNotification: z.boolean().optional(),
        subscriptionReminder: z.boolean().optional(),
        interviewReminder: z.boolean().optional(),
        reminderDaysBefore: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertNotificationSettings(ctx.user.id, input);
      }),
  }),

  // 쿠폰 관리
  coupon: router({
    // 쿠폰 코드로 적용
    redeem: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const coupon = await db.getCouponByCode(input.code.toUpperCase());
        
        if (!coupon) {
          throw new Error("유효하지 않은 쿠폰 코드입니다.");
        }
        
        if (!coupon.isActive) {
          throw new Error("비활성화된 쿠폰입니다.");
        }
        
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
          throw new Error("만료된 쿠폰입니다.");
        }
        
        if (coupon.maxUses && coupon.currentUses && coupon.currentUses >= coupon.maxUses) {
          throw new Error("쿠폰 사용 횟수가 초과되었습니다.");
        }
        
        // 이미 사용한 쿠폰인지 확인
        const existingUsage = await db.getCouponUsageByUser(ctx.user.id, coupon.id);
        if (existingUsage) {
          throw new Error("이미 사용한 쿠폰입니다.");
        }
        
        // 쿠폰 사용 기록
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (coupon.freeHours || 24));
        
        await db.createCouponUsage({
          couponId: coupon.id,
          userId: ctx.user.id,
          expiresAt,
        });
        
        // 쿠폰 사용 횟수 증가
        await db.incrementCouponUsage(coupon.id);
        
        // 무료 시간 추가 (시간을 분으로 변환)
        await db.addUserFreeTime(ctx.user.id, (coupon.freeHours || 24) * 60);
        
        return {
          success: true,
          freeHours: coupon.freeHours,
          expiresAt,
          message: `${coupon.freeHours}시간 무료 사용 쿠폰이 적용되었습니다!`,
        };
      }),
    
    // 내 무료 시간 조회
    myFreeTime: protectedProcedure.query(async ({ ctx }) => {
      const freeTime = await db.getUserFreeTime(ctx.user.id);
      const remaining = freeTime ? (freeTime.totalFreeMinutes || 0) - (freeTime.usedMinutes || 0) : 0;
      return {
        totalMinutes: freeTime?.totalFreeMinutes || 0,
        usedMinutes: freeTime?.usedMinutes || 0,
        remainingMinutes: Math.max(0, remaining),
      };
    }),
    
    // 관리자: 쿠폰 목록 조회
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getAllCoupons();
    }),
    
    // 관리자: 쿠폰 생성
    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        description: z.string().optional(),
        freeHours: z.number().default(24),
        maxUses: z.number().optional(),
        expiresAt: z.string().optional(), // ISO 날짜 문자열
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        // 중복 코드 확인
        const existing = await db.getCouponByCode(input.code.toUpperCase());
        if (existing) {
          throw new Error("이미 존재하는 쿠폰 코드입니다.");
        }
        
        return db.createCoupon({
          code: input.code.toUpperCase(),
          description: input.description,
          freeHours: input.freeHours,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          createdBy: ctx.user.id,
        });
      }),
    
    // 관리자: 쿠폰 수정
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        freeHours: z.number().optional(),
        maxUses: z.number().optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        const { id, expiresAt, ...data } = input;
        await db.updateCoupon(id, {
          ...data,
          ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        });
        return { success: true };
      }),
    
    // 관리자: 쿠폰 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        await db.deleteCoupon(input.id);
        return { success: true };
      }),
    
    // 관리자: 쿠폰 통계
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getCouponStats();
    }),
    
    // 관리자: 쿠폰 사용 내역
    usageHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getCouponUsageHistory();
    }),
  }),

  // 사용자 후기
  review: router({
    // 후기 작성
    create: protectedProcedure
      .input(z.object({
        rating: z.number().min(1).max(5),
        content: z.string().min(10).max(500),
        userName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 이미 후기를 작성했는지 확인
        const existing = await db.getUserReviewByUserId(ctx.user.id);
        if (existing) {
          throw new Error("이미 후기를 작성하셨습니다.");
        }
        
        // 후기 작성 보너스 쿠폰 생성
        const couponCode = `REVIEW-${ctx.user.id}-${Date.now()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료
        
        const coupon = await db.createCoupon({
          code: couponCode,
          description: `후기 작성 보너스 쿠폰 (${ctx.user.name || ctx.user.openId})`,
          freeHours: 1,
          maxUses: 1,
          expiresAt,
          createdBy: ctx.user.id,
        });
        
        const review = await db.createUserReview({
          userId: ctx.user.id,
          userName: input.userName || "익명",
          rating: input.rating,
          content: input.content,
          bonusHours: 1,
          couponIssued: true,
          issuedCouponId: coupon.id,
          isApproved: true,
          isDisplayed: true,
        });
        
        // 쿠폰 자동 적용
        const couponExpiresAt = new Date();
        couponExpiresAt.setHours(couponExpiresAt.getHours() + 1);
        
        await db.createCouponUsage({
          couponId: coupon.id,
          userId: ctx.user.id,
          expiresAt: couponExpiresAt,
        });
        
        await db.incrementCouponUsage(coupon.id);
        await db.addUserFreeTime(ctx.user.id, 60);
        
        return {
          success: true,
          bonusHours: 1,
          message: "후기 작성 감사합니다! 1시간 무료 사용 시간이 추가되었습니다.",
        };
      }),
    
    // 메인 페이지용 승인된 후기 목록
    getApproved: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getApprovedReviews(input?.limit || 10);
      }),
    
    // 내 후기 조회
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserReviewByUserId(ctx.user.id);
    }),
    
    // 관리자: 전체 후기 목록
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getAllReviews();
    }),
    
    // 관리자: 후기 승인/거부
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        isApproved: z.boolean().optional(),
        isDisplayed: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        const { id, ...data } = input;
        await db.updateReview(id, data);
        return { success: true };
      }),

    // 관리자: 후기 수정
    edit: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1),
        rating: z.number().min(1).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        await db.updateReview(input.id, {
          content: input.content,
          rating: input.rating,
        });
        return { success: true };
      }),

    // 관리자: 후기 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        await db.deleteReview(input.id);
        return { success: true };
      }),

    // 관리자: 후기 생성 (사이트 활성화용)
    createByAdmin: protectedProcedure
      .input(z.object({
        author: z.string().min(1).max(50),
        content: z.string().min(10).max(500),
        rating: z.number().min(1).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        const review = await db.createUserReview({
          userId: ctx.user.id, // 관리자 ID로 저장
          userName: input.author,
          rating: input.rating,
          content: input.content,
          bonusHours: 0,
          couponIssued: false,
          isApproved: true,
          isDisplayed: true,
        });
        
        return { success: true, review };
      }),
  }),

  // 관리자 기능 (학습 자료 관리)
  admin: router({
    // 학습 자료 목록
    learningData: router({
      list: protectedProcedure
        .input(z.object({
          dataType: z.enum(["interview_qa", "company_info", "job_info", "feedback_template"]).optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          return db.getAdminLearningData(input?.dataType);
        }),
      
      create: protectedProcedure
        .input(z.object({
          dataType: z.enum(["interview_qa", "company_info", "job_info", "feedback_template"]),
          title: z.string(),
          content: z.string(),
          companyName: z.string().optional(),
          positionType: z.string().optional(),
          tags: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          return db.createAdminLearningData({
            ...input,
            createdBy: ctx.user.id,
          });
        }),
      
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          companyName: z.string().optional(),
          positionType: z.string().optional(),
          tags: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          const { id, ...data } = input;
          await db.updateAdminLearningData(id, data);
          return { success: true };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          await db.deleteAdminLearningData(input.id);
          return { success: true };
        }),
    }),
    
    // 시스템 설정 관리
    settings: router({
      // 모든 설정 조회
      list: protectedProcedure
        .query(async ({ ctx }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          return db.getAllAdminSettings();
        }),
      
      // 특정 설정 조회
      get: protectedProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          return db.getAdminSetting(input.key);
        }),
      
      // 설정 저장/수정
      upsert: protectedProcedure
        .input(z.object({
          key: z.string(),
          value: z.string(),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "admin") {
            throw new Error("관리자 권한이 필요합니다.");
          }
          return db.upsertAdminSetting(input.key, input.value, input.description, ctx.user.id);
        }),
    }),
    
    // 회원 목록 조회
    getUsers: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        role: z.enum(['user', 'admin']).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.getAllUsers(input);
      }),
    
    // 회원 통계
    getUserStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.getUserStats();
      }),
    
    // 회원 권한 변경
    updateUserRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.updateUserRole(input.userId, input.role);
      }),
    
    // 이메일로 관리자 설정
    setAdminByEmail: protectedProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.setUserAsAdmin(input.email);
      }),
    
    // 회원 상세 정보 조회
    getUserDetail: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        const user = await db.getUserById(input.userId);
        const profile = await db.getUserProfile(input.userId);
        const subscription = await db.getUserActiveSubscription(input.userId);
        const sessions = await db.getUserInterviewSessions(input.userId);
        return { user, profile, subscription, sessionCount: sessions.length };
      }),
    
    // 관리자 대시보드 통계
    getDashboardStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.getAdminDashboardStats();
      }),
    
    // 회원 활동 로그 조회
    getUserActivityLog: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.getUserActivityLog(input.userId);
      }),
    
    // 일괄 권한 변경
    bulkUpdateRoles: protectedProcedure
      .input(z.object({
        userIds: z.array(z.number()),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.bulkUpdateUserRoles(input.userIds, input.role);
      }),
    
    // 일괄 알림 발송 (선택된 회원들에게)
    sendBulkNotification: protectedProcedure
      .input(z.object({
        userIds: z.array(z.number()),
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(2000),
        sendEmail: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        
        // 선택된 사용자들의 정보 조회
        const users = await db.getUsersByIds(input.userIds);
        
        // 알림 기록 저장
        const notifications = [];
        let emailSentCount = 0;
        
        for (const user of users) {
          const notification = await db.createNotification({
            userId: user.id,
            title: input.title,
            content: input.content,
            type: 'admin_message',
            isRead: false,
          });
          notifications.push(notification);
          
          // 이메일 발송 (선택적)
          if (input.sendEmail && user.email) {
            try {
              const { sendEmail, createNotificationEmailTemplate } = await import("./_core/email");
              const emailHtml = createNotificationEmailTemplate({
                userName: user.name || '회원',
                title: input.title,
                content: input.content,
              });
              
              const emailSent = await sendEmail({
                to: user.email,
                subject: `[JOB HILL] ${input.title}`,
                html: emailHtml,
              });
              
              if (emailSent) {
                emailSentCount++;
              }
            } catch (emailError) {
              console.error(`[이메일 발송 실패] ${user.email}:`, emailError);
            }
          }
        }
        
        // 소유자에게도 알림
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `회원 알림 발송 완료`,
          content: `${input.userIds.length}명의 회원에게 알림을 발송했습니다.${input.sendEmail ? ` (이메일 ${emailSentCount}건 발송)` : ''}\n제목: ${input.title}`,
        });
        
        return {
          success: true,
          sentCount: notifications.length,
          emailSentCount: input.sendEmail ? emailSentCount : 0,
        };
      }),
    
    // 알림 목록 조회 (관리자용)
    getNotifications: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('관리자 권한이 필요합니다.');
        }
        return db.getAdminNotifications(input.limit, input.offset);
      }),
  }),

  // 답변 수정 및 재피드백
  answerRevision: router({
    // 답변 수정 및 AI 피드백 재생성
    revise: protectedProcedure
      .input(z.object({
        qaId: z.number().int().positive(),
        revisedAnswer: z.string().trim().min(1).max(12_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const { qa } = await requireOwnedInterviewQa(ctx.user.id, input.qaId);
        
        const profile = await db.getUserProfile(ctx.user.id);
        
        const prompt = `당신은 면접 피드백 전문가입니다.

면접 질문: ${qa.question}
기존 답변: ${qa.userAnswer || "없음"}
수정된 답변: ${input.revisedAnswer}

지원자 배경:
- 지원 회사: ${profile?.targetCompany || "정보 없음"}
- 지원 직무: ${profile?.targetPosition || "정보 없음"}

수정된 답변에 대해 평가해주세요:
1. 기존 답변 대비 개선된 점
2. 여전히 개선이 필요한 점
3. 새로운 점수 (0-100)`;

        let response;
        try {
          response = await invokeLLM({
            messages: [
              { role: "system", content: "당신은 면접 코칭 전문가입니다. 건설적이고 구체적인 피드백을 제공합니다. 반드시 JSON 형식으로 응답하세요." },
              { role: "user", content: prompt }
            ],
            response_format: {
              type: "json_object",
            },
          });
        } catch (llmError) {
          console.error('[savedPractice.revise] LLM 호출 실패:', llmError);
          throw new Error('피드백 생성 중 AI 오류가 발생했습니다.');
        }

        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          console.error('[savedPractice.revise] LLM 응답 형식 오류:', JSON.stringify(response));
          throw new Error('AI 응답을 처리할 수 없습니다.');
        }

        const content = response.choices[0].message.content;
        let feedbackData: z.infer<typeof revisionFeedbackSchema>;
        try {
          feedbackData = revisionFeedbackSchema.parse(JSON.parse(typeof content === 'string' ? content : "{}"));
        } catch (parseError) {
          console.error('[savedPractice.revise] JSON 검증 실패:', parseError);
          throw new Error('재평가 결과 형식이 올바르지 않습니다. 다시 시도해주세요.');
        }
        
        // DB 업데이트
        await db.updateInterviewQA(input.qaId, {
          revisedAnswer: input.revisedAnswer,
          revisedFeedback: feedbackData.feedback,
          revisedScore: feedbackData.score,
        });
        
        return {
          ...feedbackData,
          originalScore: qa.score,
          revisedAnswer: input.revisedAnswer,
        };
      }),
  }),

  // 질문 목록 공유
  sharedQuestions: router({
    // 공유 링크 생성
    create: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(1_000).optional(),
        questions: z.array(z.string().trim().min(1).max(1_000)).min(1).max(100),
        targetCompany: z.string().trim().max(100).optional(),
        targetPosition: z.string().trim().max(100).optional(),
        isPublic: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          console.log('[sharedQuestions.create] 입력:', input);
          // 고유 공유 코드 생성
          const shareCode = randomBytes(12).toString("base64url");
          console.log('[sharedQuestions.create] shareCode:', shareCode);
          
          const result = await db.createSharedQuestionList({
            userId: ctx.user.id,
            shareCode,
            title: input.title,
            description: input.description,
            questions: JSON.stringify(input.questions),
            targetCompany: input.targetCompany,
            targetPosition: input.targetPosition,
            isPublic: input.isPublic,
          });
          
          console.log('[sharedQuestions.create] 결과:', result);
          
          return {
            id: result.insertId,
            shareCode,
            shareUrl: `/shared/${shareCode}`,
          };
        } catch (error) {
          console.error('[sharedQuestions.create] 에러:', error);
          throw error;
        }
      }),
    
    // 공유된 질문 목록 조회
    get: publicProcedure
      .input(z.object({ shareCode: z.string().min(8).max(32) }))
      .query(async ({ ctx, input }) => {
        const list = await db.getSharedQuestionListByCode(input.shareCode);
        if (!list) throw new Error("공유된 질문 목록을 찾을 수 없습니다.");
        if (!list.isPublic && list.userId !== ctx.user?.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "공유된 질문 목록을 찾을 수 없습니다." });
        }
        
        // 조회수 증가
        await db.incrementSharedListViewCount(list.id);
        
        return {
          id: list.id,
          shareCode: list.shareCode,
          title: list.title,
          description: list.description,
          targetCompany: list.targetCompany,
          targetPosition: list.targetPosition,
          isPublic: list.isPublic,
          viewCount: list.viewCount,
          createdAt: list.createdAt,
          questions: JSON.parse(list.questions || "[]"),
        };
      }),
    
    // 내 공유 목록
    myLists: protectedProcedure.query(async ({ ctx }) => {
      const lists = await db.getSharedQuestionListsByUser(ctx.user.id);
      return lists.map(list => ({
        ...list,
        questions: JSON.parse(list.questions || "[]"),
      }));
    }),
    
    // 피드백 작성
    addFeedback: publicProcedure
      .input(z.object({
        shareCode: z.string().min(8).max(32),
        content: z.string().trim().min(2).max(1_000),
        rating: z.number().min(1).max(5).optional(),
        authorName: z.string().trim().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const list = await db.getSharedQuestionListByCode(input.shareCode);
        if (!list) throw new Error("공유된 질문 목록을 찾을 수 없습니다.");
        if (!list.isPublic && list.userId !== ctx.user?.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "공유된 질문 목록을 찾을 수 없습니다." });
        }
        
        await db.createSharedListFeedback({
          sharedListId: list.id,
          userId: ctx.user?.id,
          authorName: input.authorName || "익명",
          content: input.content,
          rating: input.rating,
        });
        
        return { success: true };
      }),
    
    // 피드백 목록 조회
    getFeedbacks: publicProcedure
      .input(z.object({ shareCode: z.string().min(8).max(32) }))
      .query(async ({ ctx, input }) => {
        const list = await db.getSharedQuestionListByCode(input.shareCode);
        if (!list) throw new Error("공유된 질문 목록을 찾을 수 없습니다.");
        if (!list.isPublic && list.userId !== ctx.user?.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "공유된 질문 목록을 찾을 수 없습니다." });
        }
        
        return db.getSharedListFeedbacks(list.id);
      }),
    
    // 공유 목록 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const list = await db.getSharedQuestionListById(input.id);
        if (!list || list.userId !== ctx.user.id) {
          throw new Error("삭제 권한이 없습니다.");
        }
        
        await db.deleteSharedQuestionList(input.id);
        return { success: true };
      }),
  }),

  // 토스페이먼츠 결제
  tossPayment: router({
    // 결제 준비 (주문 정보 생성)
    prepare: protectedProcedure
      .input(z.object({
        productType: z.enum(["single", "single_voice", "basic", "premium", "premium_plus"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const orderId = `TOSS_${ctx.user.id}_${Date.now()}_${randomBytes(8).toString("hex")}`;
        const product = PAYMENT_PRODUCTS[input.productType];
        
        // 데이터베이스에 결제 정보 임시 저장
        await db.createPayment({
          userId: ctx.user.id,
          amount: product.price,
          currency: "KRW",
          status: "pending",
          paymentType: product.paymentType,
          productType: input.productType,
          description: `토스페이먼츠 결제 - ${product.name}`,
          kiwoompayOrderNo: orderId,
          paymentGateway: "kiwoompay", // 토스페이먼츠는 임시로 kiwoompay 사용
        });
        
        return { orderId, amount: product.price, orderName: product.name };
      }),
    
    // 결제 승인
    confirm: protectedProcedure
      .input(z.object({
        paymentKey: z.string().trim().min(10).max(300),
        orderId: z.string().trim().min(20).max(255).regex(/^TOSS_[0-9]+_[0-9]+_[a-f0-9]{16}$/),
        amount: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { paymentKey, orderId, amount } = input;
        const payment = await db.getPaymentByOrderNo(orderId);
        if (!payment || payment.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "결제 정보를 찾을 수 없습니다." });
        }
        if (payment.status === "completed") {
          return { success: true, paymentResult: null, idempotent: true };
        }
        if (payment.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "처리할 수 없는 결제 상태입니다." });
        }

        const productType = payment.productType as PaymentProductType;
        const product = PAYMENT_PRODUCTS[productType];
        if (!product || payment.amount !== product.price || amount !== payment.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "주문 금액이 서버의 상품 금액과 일치하지 않습니다." });
        }
        
        // 토스페이먼츠 결제 승인 API 호출
        const secretKey = requireConfiguredSecret(ENV.tossSecretKey, "TOSS_SECRET_KEY");
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        
        const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "결제 승인에 실패했습니다.");
        }
        
        const paymentResult = await response.json();
        
        // 같은 주문의 중복 승인 요청에서도 이용권은 한 번만 지급합니다.
        const claimed = await db.fulfillPendingTossPayment({
          paymentId: payment.id,
          userId: ctx.user.id,
          paymentKey,
          productType,
          amount: product.price,
        });
        if (!claimed) {
          return { success: true, paymentResult, idempotent: true };
        }
        
        return { success: true, paymentResult };
      }),
    
    // 결제 내역 조회
    list: protectedProcedure.query(async ({ ctx }) => {
      const payments = await db.getPaymentsByUserId(ctx.user.id);
      return payments;
    }),
    
    // 결제 상세 조회
    get: protectedProcedure
      .input(z.object({ paymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const payment = await db.getPaymentById(input.paymentId);
        if (!payment || payment.userId !== ctx.user.id) {
          throw new Error("결제 정보를 찾을 수 없습니다.");
        }
        return payment;
      }),
    
    // 결제 취소/환불
    cancel: protectedProcedure
      .input(z.object({
        paymentId: z.number().int().positive(),
        cancelReason: z.string().min(1).max(200),
        cancelAmount: z.number().int().positive().optional(), // 부분 취소 시 사용
      }))
      .mutation(async ({ ctx, input }) => {
        const payment = await db.getPaymentById(input.paymentId);
        
        if (!payment) {
          throw new Error("결제 정보를 찾을 수 없습니다.");
        }
        
        if (payment.userId !== ctx.user.id) {
          throw new Error("결제 취소 권한이 없습니다.");
        }
        
        if (payment.status !== "completed") {
          throw new Error("취소할 수 없는 결제 상태입니다.");
        }
        if (input.cancelAmount && input.cancelAmount > payment.amount) {
          throw new Error("취소 금액이 결제 금액을 초과할 수 없습니다.");
        }
        
        const paymentKey = payment.kiwoompayTrxId; // 키움페이 거래번호
        if (!paymentKey) {
          throw new Error("결제 키를 찾을 수 없습니다.");
        }
        
        // 토스페이먼츠 결제 취소 API 호출
        const secretKey = requireConfiguredSecret(ENV.tossSecretKey, "TOSS_SECRET_KEY");
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        
        const cancelBody: { cancelReason: string; cancelAmount?: number } = {
          cancelReason: input.cancelReason,
        };
        
        if (input.cancelAmount) {
          cancelBody.cancelAmount = input.cancelAmount;
        }
        
        const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cancelBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "결제 취소에 실패했습니다.");
        }
        
        const cancelResult = await response.json();
        
        // 결제 상태 업데이트
        const isFullCancel = !input.cancelAmount || input.cancelAmount >= payment.amount;
        await db.updatePayment(payment.id, {
          status: isFullCancel ? "refunded" : "partial_refunded",
          cancelReason: input.cancelReason,
          cancelAmount: input.cancelAmount || payment.amount,
          canceledAt: new Date(),
        });
        
        // 관련 구독 취소 (구독 상품인 경우)
        if (payment.paymentType === "subscription" && isFullCancel) {
          const subscription = await db.getUserActiveSubscription(ctx.user.id);
          if (subscription) {
            await db.updateSubscription(subscription.id, { status: "cancelled" });
          }
        }
        
        return { success: true, cancelResult };
      }),
    
    // 환불 가능 여부 확인
    canRefund: protectedProcedure
      .input(z.object({ paymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const payment = await db.getPaymentById(input.paymentId);
        
        if (!payment || payment.userId !== ctx.user.id) {
          return { canRefund: false, reason: "결제 정보를 찾을 수 없습니다." };
        }
        
        if (payment.status !== "completed") {
          return { canRefund: false, reason: "취소할 수 없는 결제 상태입니다." };
        }
        
        // 결제 후 7일 이내만 환불 가능
        const paymentDate = new Date(payment.createdAt);
        const now = new Date();
        const daysSincePayment = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSincePayment > 7) {
          return { canRefund: false, reason: "결제 후 7일이 지나 환불이 불가능합니다." };
        }
        
        return { canRefund: true, refundableAmount: payment.amount };
      }),
    
    // 빌링키 발급 (정기 결제 등록)
    issueBillingKey: protectedProcedure
      .input(z.object({
        authKey: z.string().trim().min(1).max(300),
        planType: z.enum(["basic", "premium", "premium_plus"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const existingSubscription = await db.getUserActiveSubscription(ctx.user.id);
        if (existingSubscription) {
          throw new Error("이미 활성 구독이 있습니다.");
        }
        const customerKey = `customer_${ctx.user.id}`;
        const amount = PAYMENT_PRODUCTS[input.planType].price;
        const secretKey = requireConfiguredSecret(ENV.tossSecretKey, "TOSS_SECRET_KEY");
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        
        // 빌링키 발급 API 호출
        const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authKey: input.authKey,
            customerKey,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "빌링키 발급에 실패했습니다.");
        }
        
        const billingData = await response.json();
        const billingKey = billingData.billingKey;
        
        // 구독 생성
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일
        const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후
        
        await db.createSubscription({
          userId: ctx.user.id,
          planType: input.planType,
          status: "active",
          amount,
          startDate: now,
          endDate,
          tossBillingKey: billingKey,
          tossCustomerKey: customerKey,
          nextBillingDate,
          autoRenew: true,
        });
        
        return { success: true, billingKey };
      }),
    
    // 자동결제 승인 (정기 결제 실행)
    executeBilling: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await db.getSubscriptionById(input.subscriptionId);
        
        if (!subscription || subscription.userId !== ctx.user.id) {
          throw new Error("구독 정보를 찾을 수 없습니다.");
        }
        
        if (!subscription.tossBillingKey) {
          throw new Error("빌링키가 등록되지 않았습니다.");
        }
        if (!subscription.autoRenew || !subscription.nextBillingDate || subscription.nextBillingDate > new Date()) {
          throw new Error("아직 자동 결제일이 아니거나 자동 갱신이 꺼져 있습니다.");
        }
        
        const secretKey = requireConfiguredSecret(ENV.tossSecretKey, "TOSS_SECRET_KEY");
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        
        const orderId = `TOSS_BILLING_${ctx.user.id}_${Date.now()}_${randomBytes(8).toString("hex")}`;
        
        // 자동결제 승인 API 호출
        const response = await fetch(`https://api.tosspayments.com/v1/billing/${subscription.tossBillingKey}`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerKey: subscription.tossCustomerKey,
            amount: subscription.amount,
            orderId,
            orderName: `${subscription.planType} 구독 갱신`,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          // 결제 실패 시 구독 상태 업데이트
          await db.updateSubscription(subscription.id, { status: "past_due" });
          throw new Error(errorData.message || "자동결제에 실패했습니다.");
        }
        
        const paymentResult = await response.json();
        
        // 결제 기록 생성
        await db.createPayment({
          userId: ctx.user.id,
          amount: subscription.amount,
          currency: "KRW",
          status: "completed",
          paymentType: "subscription",
          productType: subscription.planType,
          description: `${subscription.planType} 구독 갱신`,
          kiwoompayTrxId: paymentResult.paymentKey,
          kiwoompayOrderNo: orderId,
          paymentGateway: "kiwoompay",
          authDate: new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14),
        });
        
        // 구독 기간 연장
        const renewalBase = subscription.endDate && subscription.endDate > new Date() ? subscription.endDate : new Date();
        const newEndDate = new Date(renewalBase.getTime() + 30 * 24 * 60 * 60 * 1000);
        const newNextBillingDate = new Date(newEndDate);
        
        await db.updateSubscription(subscription.id, {
          status: "active",
          endDate: newEndDate,
          nextBillingDate: newNextBillingDate,
        });
        
        return { success: true, paymentResult };
      }),
    
    // 빌링키 삭제 (정기 결제 해지)
    deleteBillingKey: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await db.getSubscriptionById(input.subscriptionId);
        
        if (!subscription || subscription.userId !== ctx.user.id) {
          throw new Error("구독 정보를 찾을 수 없습니다.");
        }
        
        if (!subscription.tossBillingKey) {
          throw new Error("빌링키가 등록되지 않았습니다.");
        }
        
        const secretKey = requireConfiguredSecret(ENV.tossSecretKey, "TOSS_SECRET_KEY");
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        
        // 빌링키 삭제 API 호출
        const response = await fetch(`https://api.tosspayments.com/v1/billing/${subscription.tossBillingKey}`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "빌링키 삭제에 실패했습니다.");
        }
        
        // 구독 상태 업데이트
        await db.updateSubscription(subscription.id, {
          status: "cancelled",
          autoRenew: false,
          cancelledAt: new Date(),
          tossBillingKey: null,
        });
        
        return { success: true };
      }),
    
    // 구독 정보 조회
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const subscription = await db.getUserActiveSubscription(ctx.user.id);
      return subscription;
    }),
    
    // 자동 갱신 설정 변경
    toggleAutoRenew: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
        autoRenew: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await db.getSubscriptionById(input.subscriptionId);
        
        if (!subscription || subscription.userId !== ctx.user.id) {
          throw new Error("구독 정보를 찾을 수 없습니다.");
        }
        
        await db.updateSubscription(subscription.id, {
          autoRenew: input.autoRenew,
        });
        
        return { success: true, autoRenew: input.autoRenew };
      }),
  }),

  // 관리자 결제 대시보드
  adminPayment: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const stats = await db.getPaymentStats();
      return stats;
    }),

    getDailyStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const stats = await db.getDailyPaymentStats();
      return stats;
    }),

    getMonthlyStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const stats = await db.getMonthlyPaymentStats();
      return stats;
    }),

    getMethodStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const stats = await db.getPaymentMethodStats();
      return stats;
    }),

    getRecentPayments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const payments = await db.getRecentPaymentsForAdmin(20);
      return payments;
    }),

    getProducts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      
      const products = await db.getProducts();
      return products;
    }),

    updateProduct: protectedProcedure
      .input(z.object({
        productId: z.string(),
        price: z.number().min(0),
        discountRate: z.number().min(0).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        
        await db.updateProduct(input.productId, {
          price: input.price,
          discountRate: input.discountRate,
        });
        
        return { success: true };
      }),
  }),

  // 스케줄러 API (매일 자동 실행용)
  scheduler: router({
    // 구독 만료 알림 발송 (3일 전 알림)
    sendExpiryReminders: publicProcedure
      .input(z.object({ secret: z.string() }).optional())
      .mutation(async ({ input }) => {
        // 간단한 인증 (스케줄러 호출용)
        const schedulerSecret = requireConfiguredSecret(ENV.schedulerSecret, "SCHEDULER_SECRET");
        if (input?.secret !== schedulerSecret) {
          // 시크릿이 없으면 에러 반환
          throw new Error("인증이 필요합니다.");
        }
        
        const { sendSubscriptionExpiryReminders } = await import("./scheduler");
        return sendSubscriptionExpiryReminders();
      }),
    
    // 만료된 구독 비활성화
    deactivateExpired: publicProcedure
      .input(z.object({ secret: z.string() }).optional())
      .mutation(async ({ input }) => {
        const schedulerSecret = requireConfiguredSecret(ENV.schedulerSecret, "SCHEDULER_SECRET");
        if (input?.secret !== schedulerSecret) {
          throw new Error("인증이 필요합니다.");
        }
        
        const { deactivateExpiredSubscriptions } = await import("./scheduler");
        return deactivateExpiredSubscriptions();
      }),
    
    // 자동 갱신 결제 처리
    processAutoRenewals: publicProcedure
      .input(z.object({ secret: z.string() }).optional())
      .mutation(async ({ input }) => {
        const schedulerSecret = requireConfiguredSecret(ENV.schedulerSecret, "SCHEDULER_SECRET");
        if (input?.secret !== schedulerSecret) {
          throw new Error("인증이 필요합니다.");
        }
        
        const { processAutoRenewals } = await import("./scheduler");
        return processAutoRenewals();
      }),
    
    // 모든 스케줄러 작업 실행 (매일 한 번)
    runDaily: publicProcedure
      .input(z.object({ secret: z.string() }).optional())
      .mutation(async ({ input }) => {
        const schedulerSecret = requireConfiguredSecret(ENV.schedulerSecret, "SCHEDULER_SECRET");
        if (input?.secret !== schedulerSecret) {
          throw new Error("인증이 필요합니다.");
        }
        
        const scheduler = await import("./scheduler");
        
        const results = {
          expiryReminders: await scheduler.sendSubscriptionExpiryReminders(),
          deactivated: await scheduler.deactivateExpiredSubscriptions(),
          autoRenewals: await scheduler.processAutoRenewals(),
        };
        
        return results;
      }),
  }),

  // 단체 관리
  organization: router({
    // 단체 목록 조회 (관리자)
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getAllOrganizations();
    }),

    // 단체 생성
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["university", "company", "academy", "other"]),
        domain: z.string().optional(),
        joinCode: z.string().optional(),
        maxMembers: z.number().optional(),
        planType: z.enum(["free", "basic", "premium", "enterprise"]),
        freeInterviewsPerMember: z.number().optional(),
        discountPercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        return db.createOrganization({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    // 단체 수정
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.enum(["university", "company", "academy", "other"]).optional(),
        domain: z.string().optional(),
        joinCode: z.string().optional(),
        maxMembers: z.number().optional(),
        planType: z.enum(["free", "basic", "premium", "enterprise"]).optional(),
        freeInterviewsPerMember: z.number().optional(),
        discountPercent: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        const { id, ...data } = input;
        return db.updateOrganization(id, data);
      }),

    // 단체 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        return db.deleteOrganization(input.id);
      }),

    // 가입 신청 목록 (대기 중)
    getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }
      return db.getPendingOrganizationRequests();
    }),

    // 가입 신청 처리
    processRequest: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        responseMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("관리자 권한이 필요합니다.");
        }
        return db.processOrganizationRequest(input.id, input.status, ctx.user.id, input.responseMessage);
      }),

    // 사용자: 단체 가입 신청
    requestJoin: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        requestMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createOrganizationRequest({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          requestMessage: input.requestMessage,
        });
      }),

    // 사용자: 내 단체 정보
    getMyOrganization: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.organizationId) return null;
      return db.getOrganizationById(user.organizationId);
    }),

    // 공개 단체 목록 (가입 신청용)
    listPublic: publicProcedure.query(async () => {
      return db.getPublicOrganizations();
    }),

    // 쿠폰 코드로 단체 가입
    joinByCode: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // 쿠폰 코드로 단체 찾기
        const organization = await db.getOrganizationByCode(input.code);
        if (!organization) {
          throw new Error("유효하지 않은 인증 코드입니다.");
        }
        
        // 이미 단체에 가입되어 있는지 확인
        const user = await db.getUserById(ctx.user.id);
        if (user?.organizationId) {
          throw new Error("이미 단체에 가입되어 있습니다.");
        }
        
        // 사용자의 organizationId 업데이트
        await db.updateUser(ctx.user.id, { organizationId: organization.id });
        
        return {
          success: true,
          organizationName: organization.name,
          organizationId: organization.id,
        };
      }),
  }),

  // 음성 인식 (Whisper API)
  voice: router({
    // 음성 파일 업로드 및 텍스트 변환 (S3 업로드 없이 직접 처리)
    transcribe: protectedProcedure
      .input(z.object({
        audioBase64: z.string().min(1).max(17_000_000), // 약 12MB 오디오의 Base64 상한
        mimeType: z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]).default("audio/webm"),
        language: z.enum(["ko", "en"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { transcribeFromBuffer } = await import("./_core/voiceTranscription");
        
        try {
          console.log(`[voice.transcribe] User ${ctx.user.id} - Base64 길이: ${input.audioBase64.length}, mimeType: ${input.mimeType}`);
          
          // Base64 디코딩
          const audioBuffer = Buffer.from(input.audioBase64, "base64");
          
          console.log(`[voice.transcribe] 오디오 버퍼 크기: ${audioBuffer.length} bytes`);
          
          // JSON Base64 오버헤드를 고려해 12MB로 제한합니다.
          const sizeMB = audioBuffer.length / (1024 * 1024);
          if (sizeMB > 12) {
            throw new Error(`오디오 파일이 너무 큽니다 (${sizeMB.toFixed(2)}MB). 최대 12MB까지 지원합니다.`);
          }
          
          // Whisper API로 직접 텍스트 변환 (S3 업로드 없이)
          const result = await transcribeFromBuffer({
            audioBuffer,
            mimeType: input.mimeType,
            language: input.language || "ko",
            prompt: "면접 답변을 정확하게 받아쓰기해주세요. 한국어로 답변합니다.",
          });
          
          // 에러 체크
          if ("error" in result) {
            console.error("[voice.transcribe] Whisper API 오류:", result);
            throw new Error(`${result.error}${result.details ? `: ${result.details}` : ""}`);
          }
          
          console.log(`[voice.transcribe] 성공: "${result.text?.substring(0, 50)}..."`);
          
          return {
            text: result.text,
            language: result.language,
            duration: result.duration,
            segments: result.segments,
          };
        } catch (error) {
          console.error("[voice.transcribe] 오류:", error);
          throw new Error(error instanceof Error ? error.message : "음성 인식에 실패했습니다.");
        }
      }),
  }),
  
  // 회원 알림 관리
  notifications: router({
    // 내 알림 목록 조회
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.limit, input.offset);
      }),
    
    // 읽지 않은 알림 개수
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await db.getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),
    
    // 알림 읽음 처리
    markAsRead: protectedProcedure
      .input(z.object({
        notificationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.markNotificationAsRead(input.notificationId, ctx.user.id);
      }),
    
    // 모든 알림 읽음 처리
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        return db.markAllNotificationsAsRead(ctx.user.id);
      }),
  }),

  // AI 평가 결과
  aiEvaluation: router({
    // 브라우저가 임의 생성한 표정·감정·성격 점수를 신뢰해 저장하던 쓰기 API는 폐기했습니다.
    
    // 면접 세션별 AI 평가 조회
    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOwnedInterviewSession(ctx.user.id, input.sessionId);
        return db.getAIEvaluationBySession(input.sessionId);
      }),
    
    // 사용자별 AI 평가 이력
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAIEvaluationsByUser(ctx.user.id);
      }),
    
    // 개선도 추적
    improvement: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return db.getAIEvaluationImprovement(ctx.user.id, input.limit);
      }),
  }),
  
  // 게임 결과 관리
  game: router({
    // 게임 결과 저장
    saveResult: protectedProcedure
      .input(z.object({
        gameType: z.enum(['rps', 'rotation', 'numberClick', 'pathMaking']),
        score: z.number().min(0).max(100),
        timeSpent: z.number().optional(),
        level: z.number().default(1),
        mistakes: z.number().default(0),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveGameResult({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    // 사용자 게임 결과 조회
    getResults: protectedProcedure
      .input(z.object({
        gameType: z.enum(['rps', 'rotation', 'numberClick', 'pathMaking']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getUserGameResults(ctx.user.id, input.gameType);
      }),
    
    // 게임 통계
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getGameStats(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
