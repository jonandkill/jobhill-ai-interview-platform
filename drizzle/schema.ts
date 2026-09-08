import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

// 사용자 테이블
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["new_grad", "experienced", "career_change", "return"]).default("new_grad"), // 신입/경력/이직/중고신입
  // 이메일 인증 관련
  emailVerified: boolean("emailVerified").default(false), // 이메일 인증 여부
  emailVerificationToken: varchar("emailVerificationToken", { length: 255 }), // 인증 토큰
  emailVerificationExpires: timestamp("emailVerificationExpires"), // 토큰 만료 시간
  // 단체 관련
  organizationId: int("organizationId"), // 소속 단체 ID
  organizationRole: mysqlEnum("organizationRole", ["member", "manager", "admin"]).default("member"), // 단체 내 역할
  freeTrialStartedAt: timestamp("freeTrialStartedAt"), // 무료 체험 시작일
  freeTrialEndsAt: timestamp("freeTrialEndsAt"), // 무료 체험 종료일
  firstVisitAt: timestamp("firstVisitAt"), // 최초 방문일 (타이머용)
  questionCredits: int("questionCredits").default(3).notNull(), // 질문 크레딧 (기본 3개 무료)
  totalPurchasedCredits: int("totalPurchasedCredits").default(0).notNull(), // 총 구매한 크레딧
  freeUnlimitedCount: int("freeUnlimitedCount").default(5).notNull(), // 레거시 필드: 신규 권한 판단에는 questionCredits 사용
  voiceInterviewEnabled: boolean("voiceInterviewEnabled").default(false).notNull(), // 음성면접 활성화 여부
  completedInterviews: int("completedInterviews").default(0).notNull(), // 완료한 면접 횟수
  lastMilestoneReached: int("lastMilestoneReached").default(0).notNull(), // 마지막으로 달성한 마일스톤 (5, 10, 20...)
  targetScore: int("targetScore").default(70), // 목표 점수 (기본 70점)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// 사용자 프로필 (이력서, 자소서 저장)
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resume: text("resume"), // 이력서 내용
  resumeFileUrl: varchar("resumeFileUrl", { length: 512 }), // 이력서 파일 URL
  resumeFileName: varchar("resumeFileName", { length: 255 }), // 이력서 파일명
  coverLetter: text("coverLetter"), // 자기소개서
  coverLetterFileUrl: varchar("coverLetterFileUrl", { length: 512 }), // 자소서 파일 URL
  coverLetterFileName: varchar("coverLetterFileName", { length: 255 }), // 자소서 파일명
  coverLetterItems: text("coverLetterItems"), // 자소서 항목별 내용 (JSON)
  targetCompany: varchar("targetCompany", { length: 255 }), // 지원 회사
  targetPosition: varchar("targetPosition", { length: 255 }), // 지원 직무
  experience: text("experience"), // 경력 사항
  education: text("education"), // 학력
  skills: text("skills"), // 보유 기술
  // 상세 인적사항
  university: varchar("university", { length: 255 }), // 학교명
  major: varchar("major", { length: 255 }), // 학과
  gpa: varchar("gpa", { length: 20 }), // 학점
  degree: varchar("degree", { length: 50 }), // 학위 (학사/석사/박사)
  graduationYear: varchar("graduationYear", { length: 10 }), // 졸업년도
  educationStatus: varchar("educationStatus", { length: 20 }), // 재학/휴학/졸업/졸업예정
  educationList: text("educationList"), // 학력 목록 (JSON 배열)
  certifications: text("certifications"), // 자격증 (JSON 배열)
  languageScores: text("languageScores"), // 어학점수 (JSON 배열)
  activities: text("activities"), // 대외활동 (JSON 배열)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 기업 분석 테이블
export const companyAnalysis = mysqlTable("company_analysis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyStage: mysqlEnum("companyStage", ["introduction", "growth", "maturity", "decline"]).notNull(), // 도입기, 성장기, 성숙기, 쇠퇴기
  positionType: varchar("positionType", { length: 255 }), // 채용 직무
  situationAnalysis: text("situationAnalysis"), // 기업 상황 분석
  practicalTasks: text("practicalTasks"), // 실무자로서 해야할 일
  relatedDepartments: text("relatedDepartments"), // 유관부서
  partners: text("partners"), // 협력사
  weeklyTasks: text("weeklyTasks"), // 주간 업무
  monthlyTasks: text("monthlyTasks"), // 월간 업무
  quarterlyTasks: text("quarterlyTasks"), // 분기 업무
  semiAnnualTasks: text("semiAnnualTasks"), // 반기 업무
  annualTasks: text("annualTasks"), // 연간 업무
  jobFitness: text("jobFitness"), // 직무적합성
  jobExpertise: text("jobExpertise"), // 직무전문성
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 면접 세션 테이블
export const interviewSessions = mysqlTable("interview_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId"), // 사용한 프로필
  sessionType: mysqlEnum("sessionType", ["mock_interview", "feedback_only", "voice_interview"]).default("mock_interview").notNull(),
  isVoiceMode: boolean("isVoiceMode").default(false), // 음성 모드 여부
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  totalQuestions: int("totalQuestions").default(5),
  completedQuestions: int("completedQuestions").default(0),
  overallScore: int("overallScore"), // 전체 점수 (0-100)
  overallFeedback: text("overallFeedback"), // 전체 피드백
  balanceAnalysis: text("balanceAnalysis"), // 답변 밸런스 분석
  passRate: int("passRate"), // 하위 호환 컬럼: 답변 준비도 연습 지표 (0-100), 실제 합격 확률 아님
  paymentId: int("paymentId"), // 결제 ID
  selectedQuestions: text("selectedQuestions"), // 사용자가 선택한 질문 목록 (JSON)
  interviewStages: text("interviewStages"), // 실제 면접 단계 설정 (JSON)
  isFavorite: boolean("isFavorite").default(false), // 즐겨찾기 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 면접 질문/답변 테이블
export const interviewQA = mysqlTable("interview_qa", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionOrder: int("questionOrder").notNull(), // 질문 순서
  questionType: mysqlEnum("questionType", ["personality", "experience", "technical", "situational", "company"]).default("personality").notNull(),
  question: text("question").notNull(), // AI가 생성한 질문
  userAnswer: text("userAnswer"), // 사용자 답변
  feedback: text("feedback"), // AI 피드백
  score: int("score"), // 점수 (0-100)
  strengths: text("strengths"), // 강점
  improvements: text("improvements"), // 개선점
  suggestedAnswer: text("suggestedAnswer"), // 모범 답안
  answerDuration: int("answerDuration"), // 답변 소요 시간 (초 단위)
  audioUrl: varchar("audioUrl", { length: 512 }), // 음성 녹음 파일 URL (S3)
  revisedAnswer: text("revisedAnswer"), // 사용자가 수정한 답변
  revisedFeedback: text("revisedFeedback"), // 수정된 답변에 대한 AI 피드백
  revisedScore: int("revisedScore"), // 수정된 답변 점수
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 결제 내역 테이블
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 키움페이 결제 필드
  kiwoompayTrxId: varchar("kiwoompayTrxId", { length: 255 }), // 키움페이 거래번호 (DAOUTRX)
  kiwoompayOrderNo: varchar("kiwoompayOrderNo", { length: 255 }), // 주문번호
  paymentMethod: varchar("paymentMethod", { length: 50 }), // CARD, KAKAOPAY, MOBILE, VACCOUNT
  cardName: varchar("cardName", { length: 100 }), // 카드사명
  cardNo: varchar("cardNo", { length: 50 }), // 마스킹 카드번호
  installment: int("installment"), // 할부 개월 (0: 일시불)
  paymentGateway: mysqlEnum("paymentGateway", ["kiwoompay"]).default("kiwoompay"), // 결제 게이트웨이
  paymentType: mysqlEnum("paymentType", ["single", "subscription"]).notNull(), // 건당 또는 구독
  productType: varchar("productType", { length: 50 }), // single, single_voice, basic, premium, premium_plus
  amount: int("amount").notNull(), // 금액 (원)
  currency: varchar("currency", { length: 10 }).default("KRW").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded", "partial_refunded"]).default("pending").notNull(),
  description: text("description"),
  buyerName: varchar("buyerName", { length: 100 }), // 구매자명
  buyerEmail: varchar("buyerEmail", { length: 255 }), // 구매자 이메일
  receiptUrl: varchar("receiptUrl", { length: 512 }), // 영수증 URL
  receiptSentAt: timestamp("receiptSentAt"), // 영수증 발송일
  authDate: varchar("authDate", { length: 20 }), // 결제 승인일시
  cancelReason: varchar("cancelReason", { length: 200 }), // 취소 사유
  cancelAmount: int("cancelAmount"), // 취소 금액
  canceledAt: timestamp("canceledAt"), // 취소 일시
  // 환불 필드
  refundedAmount: int("refundedAmount").default(0), // 환불 금액
  refundedAt: timestamp("refundedAt"), // 환불 일시
  kiwoompayRefundTransactionId: varchar("kiwoompayRefundTransactionId", { length: 255 }), // 키움페이 환불 거래번호
  refundReason: varchar("refundReason", { length: 200 }), // 환불 사유
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 구독 상태 테이블
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kiwoompayAutoKey: varchar("kiwoompayAutoKey", { length: 255 }), // 키움페이 월자동결제 키
  tossBillingKey: varchar("tossBillingKey", { length: 255 }), // 토스페이먼츠 빌링키
  tossCustomerKey: varchar("tossCustomerKey", { length: 300 }), // 토스페이먼츠 구매자 ID
  nextBillingDate: timestamp("nextBillingDate"), // 다음 결제일
  autoRenew: boolean("autoRenew").default(true), // 자동 갱신 여부
  status: mysqlEnum("status", ["active", "trialing", "cancelled", "past_due", "expired"]).default("active").notNull(),
  planType: mysqlEnum("planType", ["monthly", "basic", "premium", "premium_plus"]).default("monthly").notNull(),
  amount: int("amount").default(9900).notNull(), // 월정액 금액 (원)
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // 구독 종료일
  trialEndDate: timestamp("trialEndDate"), // 7일 무료 체험 종료일
  cancelledAt: timestamp("cancelledAt"), // 해지 요청일
  cancelNotificationSent: boolean("cancelNotificationSent").default(false), // 해지 알림 발송 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// AI 평가 결과 테이블
export const aiEvaluationResults = mysqlTable("ai_evaluation_results", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // 면접 세션 ID
  userId: int("userId").notNull(),
  // 표정 분석 데이터
  emotionData: text("emotionData"), // JSON: { neutral, happy, sad, angry, fearful, disgusted, surprised }
  dominantEmotion: varchar("dominantEmotion", { length: 50 }), // 가장 많이 나타난 감정
  emotionScore: int("emotionScore"), // 표정 점수 (0-100)
  // 시선 추적 데이터
  attentionScore: int("attentionScore"), // 집중도 점수 (0-100)
  focusTime: int("focusTime"), // 중앙 응시 시간 (초)
  blinkCount: int("blinkCount"), // 깜빡임 횟수
  blinkRate: int("blinkRate"), // 깜빡임 빈도 (횟/분)
  gazeDistribution: text("gazeDistribution"), // JSON: { center, left, right, up, down } 비율
  // 목소리 분석 데이터
  voiceConfidence: int("voiceConfidence"), // 자신감 점수 (0-100)
  avgPitch: int("avgPitch"), // 평균 음높이 (Hz)
  avgVolume: int("avgVolume"), // 평균 음량 (0-100)
  tremor: int("tremor"), // 떨림 정도 (0-100)
  pauseCount: int("pauseCount"), // 침묵 횟수
  // 종합 평가
  overallScore: int("overallScore"), // 종합 점수 (0-100)
  feedback: text("feedback"), // AI 피드백
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 면접 후기 데이터 테이블 (학습용)
export const interviewReviews = mysqlTable("interview_reviews", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }),
  positionType: varchar("positionType", { length: 255 }),
  interviewType: varchar("interviewType", { length: 100 }), // 1차, 2차, 임원 면접 등
  questions: text("questions"), // 실제 면접 질문들
  tips: text("tips"), // 면접 팁
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium"),
  isPublic: boolean("isPublic").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type CompanyAnalysis = typeof companyAnalysis.$inferSelect;
export type InsertCompanyAnalysis = typeof companyAnalysis.$inferInsert;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;
export type InterviewQA = typeof interviewQA.$inferSelect;
export type InsertInterviewQA = typeof interviewQA.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type InterviewReview = typeof interviewReviews.$inferSelect;
export type InsertInterviewReview = typeof interviewReviews.$inferInsert;
export type AIEvaluationResult = typeof aiEvaluationResults.$inferSelect;
export type InsertAIEvaluationResult = typeof aiEvaluationResults.$inferInsert;

// 어려운 질문 테이블
export const difficultQuestions = mysqlTable("difficult_questions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  question: text("question").notNull(), // 어려운 질문
  category: varchar("category", { length: 100 }), // 질문 카테고리
  userAnswer: text("userAnswer"), // 사용자 답변
  aiFeedback: text("aiFeedback"), // AI 피드백
  practiceCount: int("practiceCount").default(0), // 연습 횟수
  lastPracticedAt: timestamp("lastPracticedAt"), // 마지막 연습일
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DifficultQuestion = typeof difficultQuestions.$inferSelect;
export type InsertDifficultQuestion = typeof difficultQuestions.$inferInsert;

// 저장된 면접 연습 내역 테이블
export const savedPractices = mysqlTable("saved_practices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId"), // 면접 세션 ID (선택)
  title: varchar("title", { length: 255 }).notNull(), // 저장 제목
  companyName: varchar("companyName", { length: 255 }), // 회사명
  positionName: varchar("positionName", { length: 255 }), // 직무명
  practiceType: mysqlEnum("practiceType", ["mock_interview", "difficult_question", "custom"]).default("mock_interview"),
  content: text("content").notNull(), // 연습 내용 (JSON)
  overallScore: int("overallScore"), // 전체 점수
  notes: text("notes"), // 메모
  isFavorite: boolean("isFavorite").default(false), // 즐겨찾기
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedPractice = typeof savedPractices.$inferSelect;
export type InsertSavedPractice = typeof savedPractices.$inferInsert;

// 관리자 학습 자료 테이블
export const adminLearningData = mysqlTable("admin_learning_data", {
  id: int("id").autoincrement().primaryKey(),
  dataType: mysqlEnum("dataType", ["interview_qa", "company_info", "job_info", "feedback_template"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // JSON 형식
  companyName: varchar("companyName", { length: 255 }),
  positionType: varchar("positionType", { length: 255 }),
  tags: text("tags"), // 태그 (JSON 배열)
  isActive: boolean("isActive").default(true),
  createdBy: int("createdBy").notNull(), // 작성자 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminLearningData = typeof adminLearningData.$inferSelect;
export type InsertAdminLearningData = typeof adminLearningData.$inferInsert;

// 자기소개서 항목 테이블
export const coverLetterItems = mysqlTable("cover_letter_items", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(), // user_profiles.id 참조
  userId: int("userId").notNull(),
  itemOrder: int("itemOrder").notNull(), // 항목 순서
  itemTitle: varchar("itemTitle", { length: 500 }).notNull(), // 항목명 (예: "지원동기를 작성해주세요")
  maxLength: int("maxLength"), // 글자수 제한
  content: text("content"), // 실제 작성 내용
  currentLength: int("currentLength").default(0), // 현재 글자수
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CoverLetterItem = typeof coverLetterItems.$inferSelect;
export type InsertCoverLetterItem = typeof coverLetterItems.$inferInsert;

// 사용 횟수 추적 테이블 (비회원/회원 모두)
export const usageTracking = mysqlTable("usage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(), // 브라우저 세션 ID
  userId: int("userId"), // 회원인 경우 사용자 ID
  featureType: mysqlEnum("featureType", [
    "voice_interview", 
    "text_interview", 
    "company_analysis", 
    "difficult_question",
    "feedback"
  ]).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

// 기업 정보 캐시 테이블 (검색 결과 캐싱)
export const companyInfoCache = mysqlTable("company_info_cache", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull().unique(),
  stockCode: varchar("stockCode", { length: 20 }), // 주식 코드
  industry: varchar("industry", { length: 255 }), // 업종
  foundedYear: int("foundedYear"), // 설립년도
  employeeCount: int("employeeCount"), // 직원수
  revenue: varchar("revenue", { length: 100 }), // 매출액
  newsData: text("newsData"), // 최근 뉴스 (JSON)
  disclosureData: text("disclosureData"), // 공시 정보 (JSON)
  blogData: text("blogData"), // 블로그 정보 (JSON)
  governmentData: text("governmentData"), // 정부 부처 관련 정보 (JSON)
  analyzedStage: mysqlEnum("analyzedStage", ["introduction", "growth", "maturity", "decline"]), // AI 분석 결과
  stageAnalysisReason: text("stageAnalysisReason"), // 분석 근거
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyInfoCache = typeof companyInfoCache.$inferSelect;
export type InsertCompanyInfoCache = typeof companyInfoCache.$inferInsert;


// 면접 일정 테이블
export const interviewSchedules = mysqlTable("interview_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(), // 회사명
  positionName: varchar("positionName", { length: 255 }), // 직무명
  interviewDate: timestamp("interviewDate").notNull(), // 면접 날짜/시간
  interviewType: mysqlEnum("interviewType", ["phone", "video", "onsite", "other"]).default("onsite"), // 면접 유형
  location: varchar("location", { length: 500 }), // 면접 장소
  notes: text("notes"), // 메모
  reminderDays: int("reminderDays").default(3), // 알림 D-day (기본 3일 전)
  reminderSent: boolean("reminderSent").default(false), // 알림 발송 여부
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InterviewSchedule = typeof interviewSchedules.$inferSelect;
export type InsertInterviewSchedule = typeof interviewSchedules.$inferInsert;

// 알림 설정 테이블
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailNotification: boolean("emailNotification").default(true), // 이메일 알림
  inAppNotification: boolean("inAppNotification").default(true), // 인앱 알림
  subscriptionReminder: boolean("subscriptionReminder").default(true), // 구독 갱신 알림
  interviewReminder: boolean("interviewReminder").default(true), // 면접 일정 알림
  reminderDaysBefore: int("reminderDaysBefore").default(3), // 알림 D-day
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;


// 피드백 평가 테이블
export const feedbackRatings = mysqlTable("feedback_ratings", {
  id: int("id").autoincrement().primaryKey(),
  qaId: int("qaId").notNull(), // interview_qa의 ID
  userId: int("userId").notNull(),
  rating: mysqlEnum("rating", ["helpful", "needs_improvement"]).notNull(), // 좋아요/개선필요
  comment: text("comment"), // 추가 코멘트 (선택)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeedbackRating = typeof feedbackRatings.$inferSelect;
export type InsertFeedbackRating = typeof feedbackRatings.$inferInsert;


// 무료 쿠폰 테이블
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 쿠폰 코드
  description: varchar("description", { length: 255 }), // 쿠폰 설명
  freeHours: int("freeHours").notNull().default(24), // 무료 사용 시간 (시간 단위)
  maxUses: int("maxUses").default(1), // 최대 사용 횟수 (null이면 무제한)
  currentUses: int("currentUses").default(0), // 현재 사용 횟수
  isActive: boolean("isActive").default(true), // 활성화 여부
  expiresAt: timestamp("expiresAt"), // 쿠폰 만료일 (null이면 무기한)
  createdBy: int("createdBy").notNull(), // 생성한 관리자 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// 쿠폰 사용 이력 테이블
export const couponUsages = mysqlTable("coupon_usages", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(), // 쿠폰 ID
  userId: int("userId").notNull(), // 사용한 사용자 ID
  usedAt: timestamp("usedAt").defaultNow().notNull(), // 사용 시간
  expiresAt: timestamp("expiresAt").notNull(), // 무료 사용 만료 시간
});

export type CouponUsage = typeof couponUsages.$inferSelect;
export type InsertCouponUsage = typeof couponUsages.$inferInsert;

// 외부 결제 링크 설정 테이블
export const paymentLinks = mysqlTable("payment_links", {
  id: int("id").autoincrement().primaryKey(),
  planType: mysqlEnum("planType", ["monthly", "basic", "premium", "premium_plus"]).notNull(),
  externalUrl: varchar("externalUrl", { length: 512 }).notNull(), // 외부 결제창 URL
  description: varchar("description", { length: 255 }), // 설명
  isActive: boolean("isActive").default(true), // 활성화 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertPaymentLink = typeof paymentLinks.$inferInsert;

// 결제 신청 내역 테이블
export const paymentRequests = mysqlTable("payment_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 신청한 사용자 ID
  planType: mysqlEnum("planType", ["monthly", "basic", "premium", "premium_plus"]).notNull(),
  amount: int("amount").notNull(), // 결제 금액
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  externalPaymentId: varchar("externalPaymentId", { length: 255 }), // 외부 결제 시스템의 결제 ID
  approvedBy: int("approvedBy"), // 승인한 관리자 ID
  approvedAt: timestamp("approvedAt"), // 승인 시간
  rejectedReason: text("rejectedReason"), // 거부 사유
  notes: text("notes"), // 관리자 메모
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = typeof paymentRequests.$inferInsert;

// 사용자 후기 테이블
export const userReviews = mysqlTable("user_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 작성자 ID
  userName: varchar("userName", { length: 100 }), // 표시될 이름 (익명 가능)
  rating: int("rating").notNull().default(5), // 별점 (1-5)
  content: text("content").notNull(), // 후기 내용
  bonusHours: int("bonusHours").default(1), // 후기 작성으로 받은 보너스 시간
  couponIssued: boolean("couponIssued").default(false), // 쿠폰 발급 여부
  issuedCouponId: int("issuedCouponId"), // 발급된 쿠폰 ID
  isApproved: boolean("isApproved").default(false), // 관리자 승인 여부
  isDisplayed: boolean("isDisplayed").default(true), // 메인 페이지 노출 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserReview = typeof userReviews.$inferSelect;
export type InsertUserReview = typeof userReviews.$inferInsert;

// 사용자 무료 시간 테이블 (쿠폰 + 후기 보너스 통합 관리)
export const userFreeTime = mysqlTable("user_free_time", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // 사용자 ID
  totalFreeMinutes: int("totalFreeMinutes").default(0), // 총 무료 시간 (분 단위)
  usedMinutes: int("usedMinutes").default(0), // 사용한 시간 (분 단위)
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserFreeTime = typeof userFreeTime.$inferSelect;
export type InsertUserFreeTime = typeof userFreeTime.$inferInsert;

// 질문 목록 공유 테이블
export const sharedQuestionLists = mysqlTable("shared_question_lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 공유한 사용자 ID
  shareCode: varchar("shareCode", { length: 32 }).notNull().unique(), // 공유 코드
  title: varchar("title", { length: 255 }).notNull(), // 공유 제목
  description: text("description"), // 설명
  questions: text("questions").notNull(), // 질문 목록 (JSON)
  targetCompany: varchar("targetCompany", { length: 255 }), // 대상 회사
  targetPosition: varchar("targetPosition", { length: 255 }), // 대상 직무
  viewCount: int("viewCount").default(0), // 조회수
  isPublic: boolean("isPublic").default(true), // 공개 여부
  expiresAt: timestamp("expiresAt"), // 만료일 (null이면 무기한)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SharedQuestionList = typeof sharedQuestionLists.$inferSelect;
export type InsertSharedQuestionList = typeof sharedQuestionLists.$inferInsert;

// 공유된 질문 목록에 대한 피드백 테이블
export const sharedListFeedbacks = mysqlTable("shared_list_feedbacks", {
  id: int("id").autoincrement().primaryKey(),
  sharedListId: int("sharedListId").notNull(), // 공유 목록 ID
  userId: int("userId"), // 피드백 작성자 ID (null이면 비회원)
  authorName: varchar("authorName", { length: 100 }), // 작성자 이름 (비회원용)
  content: text("content").notNull(), // 피드백 내용
  rating: int("rating"), // 평점 (1-5)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SharedListFeedback = typeof sharedListFeedbacks.$inferSelect;
export type InsertSharedListFeedback = typeof sharedListFeedbacks.$inferInsert;


// 알림 로그 테이블
export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // payment_success, payment_failed, subscription_expiring, admin_message, etc.
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;


// 단체(학교, 기업 등) 테이블
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 단체명
  type: mysqlEnum("type", ["university", "company", "academy", "other"]).default("other").notNull(), // 단체 유형
  domain: varchar("domain", { length: 255 }), // 이메일 도메인 (예: @korea.ac.kr)
  logoUrl: varchar("logoUrl", { length: 512 }), // 로고 URL
  description: text("description"), // 단체 설명
  // 권한 설정
  maxMembers: int("maxMembers").default(100), // 최대 멤버 수
  planType: mysqlEnum("planType", ["free", "basic", "premium", "enterprise"]).default("free").notNull(), // 단체 플랜
  planExpiresAt: timestamp("planExpiresAt"), // 플랜 만료일
  // 단체 혜택
  freeInterviewsPerMember: int("freeInterviewsPerMember").default(5), // 멤버당 무료 면접 횟수
  discountPercent: int("discountPercent").default(0), // 할인율
  joinCode: varchar("joinCode", { length: 50 }), // 단체 가입 코드 (쿠폰 코드)
  // 관리
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"), // 생성자 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// 단체 가입 신청 테이블
export const organizationRequests = mysqlTable("organization_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  requestMessage: text("requestMessage"), // 가입 신청 메시지
  responseMessage: text("responseMessage"), // 승인/거절 메시지
  processedBy: int("processedBy"), // 처리자 ID
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrganizationRequest = typeof organizationRequests.$inferSelect;
export type InsertOrganizationRequest = typeof organizationRequests.$inferInsert;


// 관리자 시스템 설정 테이블
export const adminSettings = mysqlTable("admin_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // 설정 키
  value: text("value"), // 설정 값 (JSON 가능)
  description: varchar("description", { length: 255 }), // 설정 설명
  updatedBy: int("updatedBy"), // 마지막 수정자 ID
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = typeof adminSettings.$inferInsert;


// 후속 질문 히스토리 테이블
export const followUpHistory = mysqlTable("follow_up_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 사용자 ID
  sessionId: int("sessionId"), // 면접 세션 ID (선택)
  originalQuestion: text("originalQuestion").notNull(), // 원래 질문
  userAnswer: text("userAnswer").notNull(), // 사용자 답변
  followUpQuestion: text("followUpQuestion").notNull(), // 후속 질문
  followUpAnswer: text("followUpAnswer"), // 후속 질문에 대한 답변
  followUpFeedback: text("followUpFeedback"), // 후속 질문 답변에 대한 피드백
  followUpScore: int("followUpScore"), // 후속 질문 답변 점수
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(), // 난이도
  depth: int("depth").default(1).notNull(), // 꼬리 질문 깊이 (1차, 2차, 3차...)
  isBookmarked: boolean("isBookmarked").default(false), // 북마크 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpHistory = typeof followUpHistory.$inferSelect;
export type InsertFollowUpHistory = typeof followUpHistory.$inferInsert;


// 크레딧 내역 테이블
export const creditHistory = mysqlTable("credit_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 사용자 ID
  type: mysqlEnum("type", ["purchase", "use", "bonus", "refund", "expire"]).notNull(), // 유형
  amount: int("amount").notNull(), // 크레딧 수량 (+/-)
  balance: int("balance").notNull(), // 변경 후 잔액
  description: varchar("description", { length: 255 }), // 설명
  relatedPaymentId: int("relatedPaymentId"), // 관련 결제 ID
  relatedSessionId: int("relatedSessionId"), // 관련 면접 세션 ID
  isFirstPurchase: boolean("isFirstPurchase").default(false), // 첫 결제 여부
  bonusCredits: int("bonusCredits").default(0), // 보너스 크레딧 (첫 결제 시)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditHistory = typeof creditHistory.$inferSelect;
export type InsertCreditHistory = typeof creditHistory.$inferInsert;


// 게임 평가 결과 테이블
export const gameResults = mysqlTable("game_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 사용자 ID
  gameType: mysqlEnum("gameType", ["rps", "rotation", "numberClick", "pathMaking"]).notNull(), // 게임 유형
  score: int("score").notNull(), // 점수 (0-100)
  timeSpent: int("timeSpent"), // 소요 시간 (밀리초)
  level: int("level").default(1), // 난이도 레벨
  mistakes: int("mistakes").default(0), // 실수 횟수
  metadata: text("metadata"), // 추가 게임 데이터 (JSON)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameResult = typeof gameResults.$inferSelect;
export type InsertGameResult = typeof gameResults.$inferInsert;


// TTS 오류 로그 테이블
export const ttsErrorLogs = mysqlTable("tts_error_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  errorMessage: text("errorMessage").notNull(),
  errorType: varchar("errorType", { length: 50 }).notNull(), // 'edge_tts_failure', 'audio_playback_error', 'fallback_success', etc.
  questionText: text("questionText"),
  voiceType: varchar("voiceType", { length: 20 }),
  sessionId: int("sessionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TTSErrorLog = typeof ttsErrorLogs.$inferSelect;
export type InsertTTSErrorLog = typeof ttsErrorLogs.$inferInsert;
