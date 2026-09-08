import { eq, and, desc, or, lte, gte, inArray, isNull, sql, like, count } from "drizzle-orm";
import {
  GAME_ASSESSMENT_BY_ID,
  getStoredAssessmentId,
  type GameAssessmentId,
} from "@shared/gameAssessments";
import { getAnsweredUniqueFollowUps } from "@shared/interviewFollowUps";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  userProfiles, InsertUserProfile,
  companyAnalysis, InsertCompanyAnalysis,
  interviewSessions, InsertInterviewSession,
  interviewQA, InsertInterviewQA,
  payments, InsertPayment,
  subscriptions, InsertSubscription,
  interviewReviews,
  difficultQuestions, InsertDifficultQuestion,
  savedPractices, InsertSavedPractice,
  adminLearningData, InsertAdminLearningData,
  coverLetterItems, InsertCoverLetterItem,
  usageTracking, InsertUsageTracking,
  companyInfoCache, InsertCompanyInfoCache,
  interviewSchedules, InsertInterviewSchedule,
  notificationSettings, InsertNotificationSetting,
  feedbackRatings, InsertFeedbackRating,
  coupons, InsertCoupon,
  couponUsages, InsertCouponUsage,
  userReviews, InsertUserReview,
  userFreeTime, InsertUserFreeTime,
  sharedQuestionLists, InsertSharedQuestionList,
  sharedListFeedbacks, InsertSharedListFeedback,
  notificationLogs, InsertNotificationLog,
  organizations, InsertOrganization,
  organizationRequests, InsertOrganizationRequest,
  adminSettings, InsertAdminSetting,
  followUpHistory, InsertFollowUpHistory,
  aiEvaluationResults, InsertAIEvaluationResult,
  gameResults, InsertGameResult,
  ttsErrorLogs, InsertTTSErrorLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Functions ==========
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== User Profile Functions ==========
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserProfile(profile.userId);
  if (existing) {
    await db.update(userProfiles).set(profile).where(eq(userProfiles.userId, profile.userId));
    return { ...existing, ...profile };
  } else {
    const result = await db.insert(userProfiles).values(profile);
    return { id: Number(result[0].insertId), ...profile };
  }
}

// ========== Company Analysis Functions ==========
export async function getCompanyAnalysisByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(companyAnalysis).where(eq(companyAnalysis.userId, userId)).orderBy(desc(companyAnalysis.createdAt));
}

export async function createCompanyAnalysis(analysis: InsertCompanyAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(companyAnalysis).values(analysis);
  return { id: Number(result[0].insertId), ...analysis };
}

export async function getCompanyAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(companyAnalysis).where(eq(companyAnalysis.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Interview Session Functions ==========
export async function createInterviewSession(session: InsertInterviewSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(interviewSessions).values(session);
  return { id: Number(result[0].insertId), ...session };
}

export async function getInterviewSession(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(interviewSessions).where(eq(interviewSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserInterviewSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).orderBy(desc(interviewSessions.createdAt));
}

export async function updateInterviewSession(id: number, data: Partial<InsertInterviewSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(interviewSessions).set(data).where(eq(interviewSessions.id, id));
}

export async function incrementInterviewCompletedQuestions(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(interviewSessions)
    .set({ completedQuestions: sql`coalesce(${interviewSessions.completedQuestions}, 0) + 1` })
    .where(and(eq(interviewSessions.id, id), eq(interviewSessions.userId, userId)));
}

export async function deleteInterviewSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 면접 QA 먼저 삭제
  await db.delete(interviewQA).where(eq(interviewQA.sessionId, id));
  // 면접 세션 삭제
  await db.delete(interviewSessions).where(eq(interviewSessions.id, id));
}

// ========== Interview QA Functions ==========
export async function createInterviewQA(qa: InsertInterviewQA) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(interviewQA).values(qa);
  return { id: Number(result[0].insertId), ...qa };
}

export async function getSessionQAs(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(interviewQA).where(eq(interviewQA.sessionId, sessionId)).orderBy(interviewQA.questionOrder);
}

export async function updateInterviewQA(id: number, data: Partial<InsertInterviewQA>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(interviewQA).set(data).where(eq(interviewQA.id, id));
}

export async function getInterviewQAById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(interviewQA).where(eq(interviewQA.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Payment Functions ==========
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(payments).values(payment);
  return { id: Number(result[0].insertId), ...payment };
}

export async function completePendingPayment(
  paymentId: number,
  userId: number,
  data: Partial<InsertPayment>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(payments)
    .set({ ...data, status: "completed" })
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.userId, userId),
      eq(payments.status, "pending"),
    ));
  return Number((result as any)?.[0]?.affectedRows || 0) === 1;
}

export async function fulfillPendingTossPayment(params: {
  paymentId: number;
  userId: number;
  paymentKey: string;
  productType: "single" | "single_voice" | "basic" | "premium" | "premium_plus";
  amount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const updated = await tx.update(payments)
      .set({
        status: "completed",
        authDate: new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14),
        kiwoompayTrxId: params.paymentKey,
      })
      .where(and(
        eq(payments.id, params.paymentId),
        eq(payments.userId, params.userId),
        eq(payments.status, "pending"),
      ));

    if (Number((updated as any)?.[0]?.affectedRows || 0) !== 1) return false;

    if (params.productType === "single" || params.productType === "single_voice") {
      await tx.insert(interviewSessions).values({
        userId: params.userId,
        sessionType: params.productType === "single_voice" ? "voice_interview" : "mock_interview",
        isVoiceMode: params.productType === "single_voice",
        status: "pending",
        totalQuestions: 5,
        paymentId: params.paymentId,
      });
    } else {
      const now = new Date();
      await tx.insert(subscriptions).values({
        userId: params.userId,
        planType: params.productType,
        amount: params.amount,
        status: "active",
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        // 일반 결제 paymentKey는 빌링키가 아니므로 자동 갱신에 사용하지 않습니다.
        autoRenew: false,
      });
    }

    return true;
  });
}

export async function getUserPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Subscription Functions ==========
export async function createSubscription(subscription: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(subscriptions).values(subscription);
  return { id: Number(result[0].insertId), ...subscription };
}

export async function getUserActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // active 또는 trialing 상태의 구독 조회
  const result = await db.select().from(subscriptions)
    .where(and(
      eq(subscriptions.userId, userId),
      or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing"))
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function getSubscriptionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSubscriptionsForAutoRenewal() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  // 다음 결제일이 오늘이거나 지난 구독 조회
  return db.select().from(subscriptions)
    .where(and(
      eq(subscriptions.status, "active"),
      eq(subscriptions.autoRenew, true),
      lte(subscriptions.nextBillingDate, now)
    ));
}

// ========== Interview Reviews Functions ==========
export async function getInterviewReviews(companyName?: string, positionType?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(interviewReviews).where(eq(interviewReviews.isPublic, true));
  
  return query.orderBy(desc(interviewReviews.createdAt)).limit(100);
}

export async function createInterviewReview(review: typeof interviewReviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(interviewReviews).values(review);
  return { id: Number(result[0].insertId), ...review };
}

// ========== Difficult Questions Functions ==========
export async function getDifficultQuestions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(difficultQuestions)
    .where(eq(difficultQuestions.userId, userId))
    .orderBy(desc(difficultQuestions.createdAt));
}

export async function createDifficultQuestion(question: InsertDifficultQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(difficultQuestions).values(question);
  return { id: Number(result[0].insertId), ...question };
}

export async function updateDifficultQuestion(id: number, data: Partial<InsertDifficultQuestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(difficultQuestions).set(data).where(eq(difficultQuestions.id, id));
}

export async function getDifficultQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(difficultQuestions).where(eq(difficultQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteDifficultQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(difficultQuestions).where(eq(difficultQuestions.id, id));
}

// ========== Saved Practices Functions ==========
export async function getSavedPractices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(savedPractices)
    .where(eq(savedPractices.userId, userId))
    .orderBy(desc(savedPractices.createdAt));
}

export async function createSavedPractice(practice: InsertSavedPractice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(savedPractices).values(practice);
  return { id: Number(result[0].insertId), ...practice };
}

export async function updateSavedPractice(id: number, data: Partial<InsertSavedPractice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(savedPractices).set(data).where(eq(savedPractices.id, id));
}

export async function deleteSavedPractice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(savedPractices).where(eq(savedPractices.id, id));
}

export async function getSavedPracticeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(savedPractices).where(eq(savedPractices.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Admin Learning Data Functions ==========
export async function getAdminLearningData(dataType?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (dataType) {
    return db.select().from(adminLearningData)
      .where(and(eq(adminLearningData.dataType, dataType as any), eq(adminLearningData.isActive, true)))
      .orderBy(desc(adminLearningData.createdAt));
  }
  
  return db.select().from(adminLearningData)
    .where(eq(adminLearningData.isActive, true))
    .orderBy(desc(adminLearningData.createdAt));
}

export async function createAdminLearningData(data: InsertAdminLearningData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(adminLearningData).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateAdminLearningData(id: number, data: Partial<InsertAdminLearningData>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(adminLearningData).set(data).where(eq(adminLearningData.id, id));
}

export async function deleteAdminLearningData(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(adminLearningData).set({ isActive: false }).where(eq(adminLearningData.id, id));
}

// ========== User Type & Free Trial Functions ==========
export async function updateUserType(userId: number, userType: "new_grad" | "experienced" | "career_change" | "return") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ userType }).where(eq(users.id, userId));
}

export async function startFreeTrial(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후

  await db.update(users).set({
    freeTrialStartedAt: now,
    freeTrialEndsAt: endsAt,
  }).where(eq(users.id, userId));

  return { startedAt: now, endsAt };
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserFirstVisit(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (user && !user.firstVisitAt) {
    await db.update(users).set({ firstVisitAt: new Date() }).where(eq(users.id, userId));
  }
}

// 사용자 정보 업데이트
export async function updateUser(userId: number, data: Partial<{ 
  organizationId: number | null; 
  organizationRole: "member" | "manager" | "admin";
  completedInterviews: number;
  lastMilestoneReached: number;
  questionCredits: number;
  freeUnlimitedCount: number;
  voiceInterviewEnabled: boolean;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  targetScore: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, userId));
  return { success: true };
}

// ========== Cover Letter Items Functions ==========
export async function getCoverLetterItems(profileId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(coverLetterItems)
    .where(eq(coverLetterItems.profileId, profileId))
    .orderBy(coverLetterItems.itemOrder);
}

export async function getCoverLetterItemsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(coverLetterItems)
    .where(eq(coverLetterItems.userId, userId))
    .orderBy(coverLetterItems.itemOrder);
}

export async function createCoverLetterItem(item: InsertCoverLetterItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(coverLetterItems).values(item);
  return { id: Number(result[0].insertId), ...item };
}

export async function updateCoverLetterItem(id: number, data: Partial<InsertCoverLetterItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(coverLetterItems).set(data).where(eq(coverLetterItems.id, id));
}

export async function deleteCoverLetterItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(coverLetterItems).where(eq(coverLetterItems.id, id));
}

export async function deleteAllCoverLetterItems(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(coverLetterItems).where(eq(coverLetterItems.profileId, profileId));
}

export async function upsertCoverLetterItems(profileId: number, userId: number, items: Array<{
  itemOrder: number;
  itemTitle: string;
  maxLength?: number;
  content?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 기존 항목 삭제
  await deleteAllCoverLetterItems(profileId);
  
  // 새 항목 추가
  const results = [];
  for (const item of items) {
    const result = await createCoverLetterItem({
      profileId,
      userId,
      itemOrder: item.itemOrder,
      itemTitle: item.itemTitle,
      maxLength: item.maxLength || null,
      content: item.content || null,
      currentLength: item.content ? item.content.length : 0,
    });
    results.push(result);
  }
  
  return results;
}


// ========== Usage Tracking Functions ==========
export async function getUsageCount(sessionId: string, featureType: string) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(usageTracking)
    .where(and(
      eq(usageTracking.sessionId, sessionId),
      eq(usageTracking.featureType, featureType as any)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0].usageCount : 0;
}

export async function incrementUsageCount(sessionId: string, featureType: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(usageTracking)
    .where(and(
      eq(usageTracking.sessionId, sessionId),
      eq(usageTracking.featureType, featureType as any)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(usageTracking)
      .set({ 
        usageCount: existing[0].usageCount + 1,
        lastUsedAt: new Date(),
        userId: userId || existing[0].userId
      })
      .where(eq(usageTracking.id, existing[0].id));
    return existing[0].usageCount + 1;
  } else {
    await db.insert(usageTracking).values({
      sessionId,
      featureType: featureType as any,
      userId: userId || null,
      usageCount: 1,
      lastUsedAt: new Date(),
    });
    return 1;
  }
}

export async function getTotalUsageCount(sessionId: string) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(usageTracking)
    .where(eq(usageTracking.sessionId, sessionId));
  
  return result.reduce((sum, r) => sum + r.usageCount, 0);
}

// ========== Company Info Cache Functions ==========
export async function getCompanyInfoCache(companyName: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(companyInfoCache)
    .where(eq(companyInfoCache.companyName, companyName))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertCompanyInfoCache(data: InsertCompanyInfoCache) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getCompanyInfoCache(data.companyName);
  
  if (existing) {
    await db.update(companyInfoCache)
      .set({ ...data, lastUpdatedAt: new Date() })
      .where(eq(companyInfoCache.id, existing.id));
    return { id: existing.id, ...data };
  } else {
    const result = await db.insert(companyInfoCache).values(data);
    return { id: Number(result[0].insertId), ...data };
  }
}


// ========== Interview Schedule Functions ==========
export async function getInterviewSchedules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(interviewSchedules)
    .where(eq(interviewSchedules.userId, userId))
    .orderBy(interviewSchedules.interviewDate);
}

export async function getUpcomingSchedules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return db.select().from(interviewSchedules)
    .where(and(
      eq(interviewSchedules.userId, userId),
      eq(interviewSchedules.status, "scheduled")
    ))
    .orderBy(interviewSchedules.interviewDate);
}

export async function createInterviewSchedule(schedule: InsertInterviewSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(interviewSchedules).values(schedule);
  return { id: Number(result[0].insertId), ...schedule };
}

export async function updateInterviewSchedule(id: number, data: Partial<InsertInterviewSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(interviewSchedules).set(data).where(eq(interviewSchedules.id, id));
}

export async function deleteInterviewSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(interviewSchedules).where(eq(interviewSchedules.id, id));
}

// ========== Notification Settings Functions ==========
export async function getNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertNotificationSettings(userId: number, settings: Partial<InsertNotificationSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getNotificationSettings(userId);
  
  if (existing) {
    await db.update(notificationSettings)
      .set(settings)
      .where(eq(notificationSettings.userId, userId));
    return { ...existing, ...settings };
  } else {
    const result = await db.insert(notificationSettings).values({
      userId,
      ...settings
    });
    return { id: Number(result[0].insertId), userId, ...settings };
  }
}

// ========== Subscription Reminder Functions ==========
export async function getSubscriptionsNeedingReminder() {
  const db = await getDb();
  if (!db) return [];
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  // 3일 후 만료되는 구독 중 알림 미발송 건 조회
  return db.select().from(subscriptions)
    .where(and(
      eq(subscriptions.status, "active"),
      eq(subscriptions.cancelNotificationSent, false)
    ));
}

export async function markSubscriptionReminderSent(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(subscriptions)
    .set({ cancelNotificationSent: true })
    .where(eq(subscriptions.id, subscriptionId));
}


// ========== Feedback Rating Functions ==========
export async function createFeedbackRating(data: InsertFeedbackRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 기존 평가가 있으면 업데이트
  const existing = await getFeedbackRating(data.qaId, data.userId);
  if (existing) {
    await db.update(feedbackRatings)
      .set({ rating: data.rating, comment: data.comment })
      .where(eq(feedbackRatings.id, existing.id));
    return { ...existing, rating: data.rating, comment: data.comment };
  }
  
  const result = await db.insert(feedbackRatings).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getFeedbackRating(qaId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(feedbackRatings)
    .where(and(
      eq(feedbackRatings.qaId, qaId),
      eq(feedbackRatings.userId, userId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}


// ========== Coupon Functions ==========
export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(coupons).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(coupons).set(data).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function incrementCouponUsage(couponId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const coupon = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);
  if (coupon.length > 0) {
    await db.update(coupons)
      .set({ currentUses: (coupon[0].currentUses || 0) + 1 })
      .where(eq(coupons.id, couponId));
  }
}

// ========== Coupon Usage Functions ==========
export async function createCouponUsage(data: InsertCouponUsage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(couponUsages).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getCouponUsageByUser(userId: number, couponId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(couponUsages)
    .where(and(
      eq(couponUsages.userId, userId),
      eq(couponUsages.couponId, couponId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getActiveCouponUsages(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return db.select().from(couponUsages)
    .where(eq(couponUsages.userId, userId));
}

// ========== User Review Functions ==========
export async function createUserReview(data: InsertUserReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userReviews).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getApprovedReviews(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(userReviews)
    .where(and(
      eq(userReviews.isApproved, true),
      eq(userReviews.isDisplayed, true)
    ))
    .orderBy(desc(userReviews.createdAt))
    .limit(limit);
}

export async function getAllReviews() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(userReviews).orderBy(desc(userReviews.createdAt));
}

export async function updateReview(id: number, data: Partial<InsertUserReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userReviews).set(data).where(eq(userReviews.id, id));
}

export async function deleteReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(userReviews).where(eq(userReviews.id, id));
}

export async function getUserReviewByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(userReviews)
    .where(eq(userReviews.userId, userId))
    .orderBy(desc(userReviews.createdAt))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

// ========== User Free Time Functions ==========
export async function getUserFreeTime(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(userFreeTime)
    .where(eq(userFreeTime.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function addUserFreeTime(userId: number, minutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserFreeTime(userId);
  if (existing) {
    await db.update(userFreeTime)
      .set({ totalFreeMinutes: (existing.totalFreeMinutes || 0) + minutes })
      .where(eq(userFreeTime.userId, userId));
    return { ...existing, totalFreeMinutes: (existing.totalFreeMinutes || 0) + minutes };
  } else {
    const result = await db.insert(userFreeTime).values({
      userId,
      totalFreeMinutes: minutes,
      usedMinutes: 0
    });
    return { id: Number(result[0].insertId), userId, totalFreeMinutes: minutes, usedMinutes: 0 };
  }
}

export async function useUserFreeTime(userId: number, minutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserFreeTime(userId);
  if (existing) {
    const newUsedMinutes = Math.min((existing.usedMinutes || 0) + minutes, existing.totalFreeMinutes || 0);
    await db.update(userFreeTime)
      .set({ usedMinutes: newUsedMinutes })
      .where(eq(userFreeTime.userId, userId));
    return { ...existing, usedMinutes: newUsedMinutes };
  }
  return null;
}


// ========== Coupon Statistics Functions ==========
export async function getCouponStats() {
  const dbConn = await getDb();
  if (!dbConn) return {
    totalCoupons: 0,
    activeCoupons: 0,
    totalUsages: 0,
    totalFreeHoursGiven: 0,
    usageByMonth: [],
    couponUsageRates: [],
  };
  
  // 전체 쿠폰 수
  const allCoupons = await dbConn.select().from(coupons);
  const totalCoupons = allCoupons.length;
  const activeCoupons = allCoupons.filter(c => c.isActive).length;
  
  // 전체 사용 횟수
  const allUsages = await dbConn.select().from(couponUsages);
  const totalUsages = allUsages.length;
  
  // 지급된 총 무료 시간
  const totalFreeHoursGiven = allCoupons.reduce((sum, c) => sum + ((c.currentUses || 0) * (c.freeHours || 0)), 0);
  
  // 월별 사용 추이 (최근 6개월)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const usageByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = allUsages.filter(u => {
      if (!u.usedAt) return false;
      const usedDate = new Date(u.usedAt);
      return usedDate.getFullYear() === date.getFullYear() && usedDate.getMonth() === date.getMonth();
    }).length;
    usageByMonth.push({ month: monthKey, count });
  }
  
  // 쿠폰별 사용률
  const couponUsageRates = allCoupons.map(c => ({
    code: c.code,
    description: c.description,
    maxUses: c.maxUses || 0,
    currentUses: c.currentUses || 0,
    usageRate: c.maxUses ? Math.round(((c.currentUses || 0) / c.maxUses) * 100) : 0,
    freeHours: c.freeHours || 0,
  }));
  
  return {
    totalCoupons,
    activeCoupons,
    totalUsages,
    totalFreeHoursGiven,
    usageByMonth,
    couponUsageRates,
  };
}

export async function getCouponUsageHistory() {
  const dbConn = await getDb();
  if (!dbConn) return [];
  
  // 최근 100개 사용 내역
  const usages = await dbConn.select().from(couponUsages)
    .orderBy(desc(couponUsages.usedAt))
    .limit(100);
  
  // 쿠폰 정보 조인
  const allCoupons = await dbConn.select().from(coupons);
  const couponMap = new Map(allCoupons.map(c => [c.id, c]));
  
  return usages.map(u => ({
    id: u.id,
    userId: u.userId,
    couponId: u.couponId,
    couponCode: couponMap.get(u.couponId)?.code || "Unknown",
    couponDescription: couponMap.get(u.couponId)?.description || "",
    freeHours: couponMap.get(u.couponId)?.freeHours || 0,
    usedAt: u.usedAt,
    expiresAt: u.expiresAt,
  }));
}


// ========== Kiwoompay Payment Functions ==========
export async function createKiwoompayPayment(data: {
  userId: number;
  kiwoompayOrderNo: string;
  amount: number;
  productType: string;
  paymentMethod?: string;
  buyerName?: string;
  buyerEmail?: string;
  description?: string;
  isSubscription?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values({
    userId: data.userId,
    kiwoompayOrderNo: data.kiwoompayOrderNo,
    paymentGateway: "kiwoompay",
    paymentType: data.isSubscription ? "subscription" : "single",
    productType: data.productType,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    buyerName: data.buyerName,
    buyerEmail: data.buyerEmail,
    description: data.description,
    status: "pending",
  });
  
  return { id: Number(result[0].insertId), ...data };
}

export async function getPaymentByOrderNo(orderNo: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(payments)
    .where(eq(payments.kiwoompayOrderNo, orderNo))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function completeKiwoompayPayment(orderNo: string, webhookData: {
  kiwoompayTrxId: string;
  paymentMethod: string;
  cardName?: string;
  cardNo?: string;
  installment?: number;
  authDate: string;
  buyerName?: string;
  buyerEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments)
    .set({
      status: "completed",
      kiwoompayTrxId: webhookData.kiwoompayTrxId,
      paymentMethod: webhookData.paymentMethod,
      cardName: webhookData.cardName,
      cardNo: webhookData.cardNo,
      installment: webhookData.installment,
      authDate: webhookData.authDate,
      buyerName: webhookData.buyerName,
      buyerEmail: webhookData.buyerEmail,
    })
    .where(eq(payments.kiwoompayOrderNo, orderNo));
  
  return getPaymentByOrderNo(orderNo);
}

export async function failKiwoompayPayment(orderNo: string, errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments)
    .set({
      status: "failed",
      description: errorMessage,
    })
    .where(eq(payments.kiwoompayOrderNo, orderNo));
}

export async function activateSubscriptionForPayment(userId: number, productType: string, paymentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 기존 활성 구독 만료 처리
  await db.update(subscriptions)
    .set({ status: "expired" })
    .where(and(
      eq(subscriptions.userId, userId),
      or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing"))
    ));
  
  // 상품 유형에 따른 구독 기간 설정
  const now = new Date();
  let endDate = new Date(now);
  let planType: "monthly" | "basic" | "premium" | "premium_plus" = "monthly";
  
  switch (productType) {
    case "single":
    case "single_voice":
      // 건당 결제는 구독 생성하지 않음
      return null;
    case "basic":
      planType = "basic";
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "premium":
      planType = "premium";
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "premium_plus":
      planType = "premium_plus";
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    default:
      planType = "monthly";
      endDate.setMonth(endDate.getMonth() + 1);
  }
  
  // 새 구독 생성
  const result = await db.insert(subscriptions).values({
    userId,
    status: "active",
    planType,
    startDate: now,
    endDate,
  });
  
  return { id: Number(result[0].insertId), planType, endDate };
}

export async function updatePaymentReceiptInfo(paymentId: number, receiptUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments)
    .set({
      receiptUrl,
      receiptSentAt: new Date(),
    })
    .where(eq(payments.id, paymentId));
}

export async function getPaymentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
}


// ========== Shared Question Lists Functions ==========
export async function createSharedQuestionList(data: InsertSharedQuestionList) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sharedQuestionLists).values(data);
  return { insertId: Number(result[0].insertId), ...data };
}

export async function getSharedQuestionListByCode(shareCode: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(sharedQuestionLists)
    .where(eq(sharedQuestionLists.shareCode, shareCode))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getSharedQuestionListById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(sharedQuestionLists)
    .where(eq(sharedQuestionLists.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getSharedQuestionListsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(sharedQuestionLists)
    .where(eq(sharedQuestionLists.userId, userId))
    .orderBy(desc(sharedQuestionLists.createdAt));
}

export async function incrementSharedListViewCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const list = await getSharedQuestionListById(id);
  if (list) {
    await db.update(sharedQuestionLists)
      .set({ viewCount: (list.viewCount || 0) + 1 })
      .where(eq(sharedQuestionLists.id, id));
  }
}

export async function deleteSharedQuestionList(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 관련 피드백도 삭제
  await db.delete(sharedListFeedbacks).where(eq(sharedListFeedbacks.sharedListId, id));
  await db.delete(sharedQuestionLists).where(eq(sharedQuestionLists.id, id));
}

// ========== Shared List Feedbacks Functions ==========
export async function createSharedListFeedback(data: InsertSharedListFeedback) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sharedListFeedbacks).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getSharedListFeedbacks(sharedListId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(sharedListFeedbacks)
    .where(eq(sharedListFeedbacks.sharedListId, sharedListId))
    .orderBy(desc(sharedListFeedbacks.createdAt));
}


// ========== Admin Payment Dashboard Functions ==========
export async function getPaymentStats() {
  const db = await getDb();
  if (!db) return {
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0,
    totalTransactions: 0,
    monthlyTransactions: 0,
    revenueGrowth: 0,
    refundRate: 0,
  };
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // 전체 통계
  const allPayments = await db.select().from(payments);
  
  const totalRevenue = allPayments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalRefunds = allPayments
    .filter(p => p.status === "refunded" || p.status === "partial_refunded")
    .reduce((sum, p) => sum + (p.cancelAmount || 0), 0);
  
  const netRevenue = totalRevenue - totalRefunds;
  const totalTransactions = allPayments.filter(p => p.status === "completed").length;
  
  // 이번 달 통계
  const monthlyPayments = allPayments.filter(p => 
    new Date(p.createdAt).getTime() >= startOfMonth.getTime() && p.status === "completed"
  );
  const monthlyTransactions = monthlyPayments.length;
  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // 지난 달 통계
  const lastMonthPayments = allPayments.filter(p => 
    new Date(p.createdAt).getTime() >= startOfLastMonth.getTime() && 
    new Date(p.createdAt).getTime() <= endOfLastMonth.getTime() && 
    p.status === "completed"
  );
  const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // 성장률 계산
  const revenueGrowth = lastMonthRevenue > 0 
    ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;
  
  // 환불률 계산
  const refundRate = totalRevenue > 0 
    ? Math.round((totalRefunds / totalRevenue) * 100)
    : 0;
  
  return {
    totalRevenue,
    totalRefunds,
    netRevenue,
    totalTransactions,
    monthlyTransactions,
    revenueGrowth,
    refundRate,
  };
}

export async function getDailyPaymentStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const allPayments = await db.select().from(payments)
    .where(gte(payments.createdAt, thirtyDaysAgo));
  
  // 일별로 그룹화
  const dailyMap = new Map<string, { revenue: number; refunds: number }>();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dailyMap.set(dateStr, { revenue: 0, refunds: 0 });
  }
  
  allPayments.forEach(p => {
    const dateStr = new Date(p.createdAt).toISOString().split("T")[0];
    const existing = dailyMap.get(dateStr);
    if (existing) {
      if (p.status === "completed") {
        existing.revenue += p.amount;
      } else if (p.status === "refunded" || p.status === "partial_refunded") {
        existing.refunds += p.cancelAmount || 0;
      }
    }
  });
  
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date: date.slice(5), // MM-DD 형식
      revenue: data.revenue,
      refunds: data.refunds,
    }))
    .reverse();
}

export async function getMonthlyPaymentStats() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  
  const allPayments = await db.select().from(payments)
    .where(gte(payments.createdAt, twelveMonthsAgo));
  
  // 월별로 그룹화
  const monthlyMap = new Map<string, { revenue: number; refunds: number }>();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthStr, { revenue: 0, refunds: 0 });
  }
  
  allPayments.forEach(p => {
    const date = new Date(p.createdAt);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(monthStr);
    if (existing) {
      if (p.status === "completed") {
        existing.revenue += p.amount;
      } else if (p.status === "refunded" || p.status === "partial_refunded") {
        existing.refunds += p.cancelAmount || 0;
      }
    }
  });
  
  return Array.from(monthlyMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      refunds: data.refunds,
    }))
    .reverse();
}

export async function getPaymentMethodStats() {
  const db = await getDb();
  if (!db) return [];
  
  const allPayments = await db.select().from(payments)
    .where(eq(payments.status, "completed"));
  
  // 결제 수단별로 그룹화
  const methodMap = new Map<string, { count: number; amount: number }>();
  
  allPayments.forEach(p => {
    const method = p.paymentMethod || "OTHER";
    const existing = methodMap.get(method);
    if (existing) {
      existing.count += 1;
      existing.amount += p.amount;
    } else {
      methodMap.set(method, { count: 1, amount: p.amount });
    }
  });
  
  return Array.from(methodMap.entries())
    .map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getRecentPaymentsForAdmin(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  const recentPayments = await db.select({
    id: payments.id,
    orderNo: payments.kiwoompayOrderNo,
    amount: payments.amount,
    status: payments.status,
    paymentMethod: payments.paymentMethod,
    productName: payments.productType,
    createdAt: payments.createdAt,
    userId: payments.userId,
  }).from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(limit);
  
  // 사용자 정보 조회
  const userIds = Array.from(new Set(recentPayments.map(p => p.userId)));
  const userList = await db.select({
    id: users.id,
    name: users.name,
  }).from(users)
    .where(inArray(users.id, userIds));
  
  const userMap = new Map(userList.map(u => [u.id, u.name]));
  
  return recentPayments.map(p => ({
    ...p,
    userName: userMap.get(p.userId) || null,
  }));
}

// ========== Products Functions ==========
export async function getProducts() {
  // 하드코딩된 상품 목록 (추후 DB 테이블로 이동 가능)
  return [
    { id: "text_interview_1", name: "텍스트 면접 1회", price: 1200, discountRate: 25 },
    { id: "text_interview_3", name: "텍스트 면접 3회", price: 3900, discountRate: 25 },
    { id: "voice_interview_1", name: "음성 면접 1회", price: 2400, discountRate: 25 },
    { id: "voice_interview_3", name: "음성 면접 3회", price: 5900, discountRate: 25 },
    { id: "premium_monthly", name: "프리미엄 월정액", price: 9900, discountRate: 0 },
    { id: "premium_plus_monthly", name: "프리미엄+ 월정액", price: 29900, discountRate: 0 },
  ];
}

export async function updateProduct(productId: string, data: { price: number; discountRate: number }) {
  // 실제 구현에서는 DB에 저장
  // 현재는 메모리에만 저장 (서버 재시작 시 초기화)
  console.log(`[Admin] Product ${productId} updated:`, data);
  return { success: true };
}


// 알림 로그 관련 함수
export async function createNotificationLog(data: {
  userId: number;
  type: string;
  title: string;
  content: string;
  status: "sent" | "failed" | "pending";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notificationLogs).values({
    ...data,
    sentAt: data.status === "sent" ? new Date() : null,
  });
  return result;
}

export async function hasNotificationLog(userId: number, type: string, date: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const logs = await db.select().from(notificationLogs)
    .where(and(
      eq(notificationLogs.userId, userId),
      eq(notificationLogs.type, type),
      gte(notificationLogs.createdAt, startOfDay),
      lte(notificationLogs.createdAt, endOfDay)
    ))
    .limit(1);
  
  return logs.length > 0;
}

export async function getExpiringSubscriptions(startTime: number, endTime: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  return db.select().from(subscriptions)
    .where(and(
      eq(subscriptions.status, "active"),
      gte(subscriptions.endDate, startDate),
      lte(subscriptions.endDate, endDate)
    ));
}


// 단체 관련 함수
export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  
  const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  
  // 각 단체의 멤버 수 계산
  const result = await Promise.all(orgs.map(async (org) => {
    const members = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.organizationId, org.id));
    return {
      ...org,
      memberCount: members[0]?.count || 0,
    };
  }));
  
  return result;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] || null;
}

export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(organizations).values(data);
  const [insertResult] = result as unknown as [{ insertId: number }];
  return { insertId: Number(insertResult?.insertId || 0) };
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(organizations).set(data).where(eq(organizations.id, id));
  return { success: true };
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 먼저 해당 단체에 소속된 사용자들의 organizationId를 null로 설정
  await db.update(users).set({ organizationId: null }).where(eq(users.organizationId, id));
  
  // 단체 삭제
  await db.delete(organizations).where(eq(organizations.id, id));
  return { success: true };
}

export async function getPublicOrganizations() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: organizations.id,
    name: organizations.name,
    type: organizations.type,
    domain: organizations.domain,
    planType: organizations.planType,
    freeInterviewsPerMember: organizations.freeInterviewsPerMember,
    discountPercent: organizations.discountPercent,
  }).from(organizations).where(eq(organizations.isActive, true));
}

// 쿠폰 코드로 단체 조회
export async function getOrganizationByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(organizations)
    .where(and(
      eq(organizations.joinCode, code),
      eq(organizations.isActive, true)
    ))
    .limit(1);
  
  return result[0] || null;
}

// 단체 가입 신청 관련
export async function getPendingOrganizationRequests() {
  const db = await getDb();
  if (!db) return [];
  
  const requests = await db.select().from(organizationRequests)
    .where(eq(organizationRequests.status, "pending"))
    .orderBy(desc(organizationRequests.createdAt));
  
  // 사용자 및 단체 정보 조인
  const result = await Promise.all(requests.map(async (req) => {
    const user = await getUserById(req.userId);
    const org = await getOrganizationById(req.organizationId);
    return {
      ...req,
      userName: user?.name || "알 수 없음",
      userEmail: user?.email || "",
      organizationName: org?.name || "알 수 없음",
    };
  }));
  
  return result;
}

export async function createOrganizationRequest(data: InsertOrganizationRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 이미 신청했는지 확인
  const existing = await db.select().from(organizationRequests)
    .where(and(
      eq(organizationRequests.userId, data.userId),
      eq(organizationRequests.organizationId, data.organizationId),
      eq(organizationRequests.status, "pending")
    ))
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("이미 가입 신청 중입니다.");
  }
  
  const result = await db.insert(organizationRequests).values(data);
  const [insertResult] = result as unknown as [{ insertId: number }];
  return { insertId: Number(insertResult?.insertId || 0) };
}

export async function processOrganizationRequest(
  id: number,
  status: "approved" | "rejected",
  processedBy: number,
  responseMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 신청 정보 조회
  const request = await db.select().from(organizationRequests)
    .where(eq(organizationRequests.id, id))
    .limit(1);
  
  if (!request[0]) {
    throw new Error("가입 신청을 찾을 수 없습니다.");
  }
  
  // 신청 상태 업데이트
  await db.update(organizationRequests).set({
    status,
    processedBy,
    responseMessage,
    processedAt: new Date(),
  }).where(eq(organizationRequests.id, id));
  
  // 승인된 경우 사용자의 organizationId 업데이트
  if (status === "approved") {
    await db.update(users).set({
      organizationId: request[0].organizationId,
    }).where(eq(users.id, request[0].userId));
  }
  
  return { success: true };
}


// ========== Subscription Scheduler Functions ==========
export async function deactivateExpiredSubscriptions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  
  // 만료된 구독 조회 및 비활성화
  const result = await db.update(subscriptions)
    .set({ status: "expired" })
    .where(and(
      eq(subscriptions.status, "active"),
      lte(subscriptions.endDate, now)
    ));
  
  return { updated: result[0]?.affectedRows || 0 };
}


// ========== Interview Statistics Functions ==========
export async function getUserInterviewStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 총 면접 횟수
  const sessions = await db.select()
    .from(interviewSessions)
    .where(eq(interviewSessions.userId, userId));
  
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  
  // 모든 QA 가져오기
  const allQAs = await db.select()
    .from(interviewQA)
    .innerJoin(interviewSessions, eq(interviewQA.sessionId, interviewSessions.id))
    .where(eq(interviewSessions.userId, userId));
  
  const totalQuestions = allQAs.length;
  const answeredQuestions = allQAs.filter(qa => qa.interview_qa.userAnswer).length;
  
  // 평균 점수 계산
  const scores = allQAs
    .map(qa => qa.interview_qa.score)
    .filter((score): score is number => score !== null && score !== undefined);
  
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
    : 0;
  
  // 최고 점수
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  
  // 이번 주 면접 횟수
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekSessions = sessions.filter(s => 
    s.createdAt && new Date(s.createdAt) >= oneWeekAgo
  ).length;
  
  // 이번 달 면접 횟수
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const thisMonthSessions = sessions.filter(s => 
    s.createdAt && new Date(s.createdAt) >= oneMonthAgo
  ).length;
  
  // 연속 면접 일수 계산
  const sessionDates = sessions
    .filter(s => s.createdAt)
    .map(s => new Date(s.createdAt!).toISOString().split('T')[0])
    .sort()
    .reverse();
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sessionDates.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr !== today) {
      break;
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  return {
    totalSessions,
    completedSessions,
    totalQuestions,
    answeredQuestions,
    averageScore,
    highestScore,
    thisWeekSessions,
    thisMonthSessions,
    streak,
  };
}

export async function getUserScoreTrend(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const qas = await db.select({
    score: interviewQA.score,
    createdAt: interviewQA.createdAt,
  })
    .from(interviewQA)
    .innerJoin(interviewSessions, eq(interviewQA.sessionId, interviewSessions.id))
    .where(and(
      eq(interviewSessions.userId, userId),
      gte(interviewQA.createdAt, thirtyDaysAgo)
    ))
    .orderBy(interviewQA.createdAt);
  
  // 날짜별로 그룹화하여 평균 점수 계산
  const dailyScores: Record<string, number[]> = {};
  
  for (const qa of qas) {
    if (qa.score !== null && qa.createdAt) {
      const dateStr = new Date(qa.createdAt).toISOString().split('T')[0];
      if (!dailyScores[dateStr]) {
        dailyScores[dateStr] = [];
      }
      dailyScores[dateStr].push(qa.score);
    }
  }
  
  return Object.entries(dailyScores).map(([date, scores]) => ({
    date,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  }));
}

export async function getUserTypePerformance(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const qas = await db.select({
    questionType: interviewQA.questionType,
    score: interviewQA.score,
  })
    .from(interviewQA)
    .innerJoin(interviewSessions, eq(interviewQA.sessionId, interviewSessions.id))
    .where(eq(interviewSessions.userId, userId));
  
  // 질문 유형별로 그룹화
  const typeScores: Record<string, number[]> = {};
  
  for (const qa of qas) {
    if (qa.score !== null && qa.questionType) {
      if (!typeScores[qa.questionType]) {
        typeScores[qa.questionType] = [];
      }
      typeScores[qa.questionType].push(qa.score);
    }
  }
  
  const typeLabels: Record<string, string> = {
    personality: "인성/성격",
    experience: "경험/역량",
    technical: "기술/전문성",
    situational: "상황대처",
    company: "회사/직무 이해",
  };
  
  return Object.entries(typeScores).map(([type, scores]) => ({
    type,
    label: typeLabels[type] || type,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
    strength: scores.reduce((a, b) => a + b, 0) / scores.length >= 75,
  }));
}


// ========== Admin Settings Functions ==========
export async function getAdminSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getAllAdminSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(adminSettings);
}

export async function upsertAdminSetting(key: string, value: string, description?: string, updatedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getAdminSetting(key);
  
  if (existing) {
    await db.update(adminSettings)
      .set({ value, description: description || existing.description, updatedBy })
      .where(eq(adminSettings.key, key));
    return { ...existing, value, description: description || existing.description };
  } else {
    const result = await db.insert(adminSettings).values({
      key,
      value,
      description,
      updatedBy,
    });
    return { id: Number(result[0].insertId), key, value, description };
  }
}



// ========== Follow-Up History Functions ==========
export async function createFollowUpHistory(data: InsertFollowUpHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(followUpHistory).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getFollowUpHistoryByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(followUpHistory)
    .where(eq(followUpHistory.userId, userId))
    .orderBy(desc(followUpHistory.createdAt));
}

export async function getFollowUpHistoryBySession(userId: number, sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(followUpHistory)
    .where(and(
      eq(followUpHistory.userId, userId),
      eq(followUpHistory.sessionId, sessionId),
    ))
    .orderBy(desc(followUpHistory.createdAt));
}

export async function getBookmarkedFollowUps(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(followUpHistory)
    .where(and(
      eq(followUpHistory.userId, userId),
      eq(followUpHistory.isBookmarked, true)
    ))
    .orderBy(desc(followUpHistory.createdAt));
}

export async function toggleFollowUpBookmark(id: number, userId: number, isBookmarked: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(followUpHistory)
    .set({ isBookmarked })
    .where(and(eq(followUpHistory.id, id), eq(followUpHistory.userId, userId)));
}

export async function updateFollowUpAnswer(id: number, userId: number, data: {
  followUpAnswer?: string;
  followUpFeedback?: string;
  followUpScore?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.update(followUpHistory)
    .set(data)
    .where(and(
      eq(followUpHistory.id, id),
      eq(followUpHistory.userId, userId),
      isNull(followUpHistory.followUpAnswer),
    ));
  return Number((result as any)?.[0]?.affectedRows || 0) === 1;
}


// ========== Admin User Management Functions ==========
export async function getAllUsers(options?: { 
  limit?: number; 
  offset?: number; 
  search?: string;
  role?: 'user' | 'admin';
}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  
  let query = db.select().from(users);
  
  // 검색 조건 적용
  const conditions = [];
  if (options?.search) {
    conditions.push(
      or(
        like(users.name, `%${options.search}%`),
        like(users.email, `%${options.search}%`)
      )
    );
  }
  if (options?.role) {
    conditions.push(eq(users.role, options.role));
  }
  
  // 전체 개수 조회
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = countResult[0]?.count || 0;
  
  // 페이지네이션 적용
  const result = await db.select().from(users)
    .orderBy(desc(users.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
  
  return { users: result, total };
}

// getUserById는 이미 위에서 정의됨

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set({ role })
    .where(eq(users.id, userId));
  
  return { success: true };
}

export async function setUserAsAdmin(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }
  
  await db.update(users)
    .set({ role: 'admin' })
    .where(eq(users.id, user.id));
  
  return { success: true, userId: user.id };
}

export async function getUserStats() {
  const db = await getDb();
  if (!db) return {
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    adminCount: 0,
  };
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const allUsers = await db.select().from(users);
  
  const totalUsers = allUsers.length;
  const newUsersToday = allUsers.filter(u => new Date(u.createdAt).getTime() >= startOfToday.getTime()).length;
  const newUsersThisWeek = allUsers.filter(u => new Date(u.createdAt).getTime() >= startOfWeek.getTime()).length;
  const newUsersThisMonth = allUsers.filter(u => new Date(u.createdAt).getTime() >= startOfMonth.getTime()).length;
  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  
  return {
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    adminCount,
  };
}


// 관리자 대시보드 통계 함수들
export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) return {
    totalUsers: 0,
    totalInterviews: 0,
    totalPayments: 0,
    newUsersToday: 0,
    interviewsToday: 0,
    revenueToday: 0,
    userGrowth: [],
    interviewGrowth: [],
    revenueGrowth: [],
  };
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 전체 통계
  const allUsers = await db.select().from(users);
  const allInterviews = await db.select().from(interviewSessions);
  const allPayments = await db.select().from(payments);
  
  const totalUsers = allUsers.length;
  const totalInterviews = allInterviews.length;
  const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // 오늘 통계
  const newUsersToday = allUsers.filter(u => new Date(u.createdAt).getTime() >= startOfToday.getTime()).length;
  const interviewsToday = allInterviews.filter(i => new Date(i.createdAt).getTime() >= startOfToday.getTime()).length;
  const revenueToday = allPayments
    .filter(p => new Date(p.createdAt).getTime() >= startOfToday.getTime())
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // 최근 30일 일별 통계
  const userGrowth: { date: string; count: number }[] = [];
  const interviewGrowth: { date: string; count: number }[] = [];
  const revenueGrowth: { date: string; amount: number }[] = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const usersOnDay = allUsers.filter(u => {
      const createdAt = new Date(u.createdAt).getTime();
      return createdAt >= startOfDay.getTime() && createdAt < endOfDay.getTime();
    }).length;
    
    const interviewsOnDay = allInterviews.filter(i => {
      const createdAt = new Date(i.createdAt).getTime();
      return createdAt >= startOfDay.getTime() && createdAt < endOfDay.getTime();
    }).length;
    
    const revenueOnDay = allPayments
      .filter(p => {
        const createdAt = new Date(p.createdAt).getTime();
        return createdAt >= startOfDay.getTime() && createdAt < endOfDay.getTime();
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    userGrowth.push({ date: dateStr, count: usersOnDay });
    interviewGrowth.push({ date: dateStr, count: interviewsOnDay });
    revenueGrowth.push({ date: dateStr, amount: revenueOnDay });
  }
  
  return {
    totalUsers,
    totalInterviews,
    totalPayments,
    newUsersToday,
    interviewsToday,
    revenueToday,
    userGrowth,
    interviewGrowth,
    revenueGrowth,
  };
}

// 회원 활동 로그 조회
export async function getUserActivityLog(userId: number) {
  const db = await getDb();
  if (!db) return { interviews: [], payments: [], feedbackRatings: [] };
  
  // 면접 이력
  const interviews = await db.select().from(interviewSessions)
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewSessions.createdAt))
    .limit(50);
  
  // 결제 이력
  const paymentsResult = await db.select().from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(50);
  
  // 피드백 평가 이력
  const feedbackRatingsResult = await db.select().from(feedbackRatings)
    .where(eq(feedbackRatings.userId, userId))
    .orderBy(desc(feedbackRatings.createdAt))
    .limit(50);
  
  return { interviews, payments: paymentsResult, feedbackRatings: feedbackRatingsResult };
}

// 일괄 권한 변경
export async function bulkUpdateUserRoles(userIds: number[], role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const userId of userIds) {
    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));
  }
  
  return { success: true, updatedCount: userIds.length };
}


// 여러 사용자 ID로 사용자 조회
export async function getUsersByIds(userIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(users)
    .where(inArray(users.id, userIds));
}

// 알림 생성
export async function createNotification(data: {
  userId: number;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notificationLogs).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    content: data.content,
    status: "sent",
    sentAt: new Date(),
  });
  
  return result;
}

// 관리자용 알림 목록 조회
export async function getAdminNotifications(limit: number, offset: number) {
  const db = await getDb();
  if (!db) return { notifications: [], total: 0 };
  
  const notifications = await db.select().from(notificationLogs)
    .orderBy(desc(notificationLogs.createdAt))
    .limit(limit)
    .offset(offset);
  
  const countResult = await db.select({ count: count() }).from(notificationLogs);
  const total = countResult[0]?.count || 0;
  
  return { notifications, total };
}


// 회원별 알림 목록 조회
export async function getUserNotifications(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) return { notifications: [], total: 0, unreadCount: 0 };
  
  const notifications = await db.select().from(notificationLogs)
    .where(eq(notificationLogs.userId, userId))
    .orderBy(desc(notificationLogs.createdAt))
    .limit(limit)
    .offset(offset);
  
  const countResult = await db.select({ count: count() }).from(notificationLogs)
    .where(eq(notificationLogs.userId, userId));
  const total = countResult[0]?.count || 0;
  
  const unreadResult = await db.select({ count: count() }).from(notificationLogs)
    .where(and(
      eq(notificationLogs.userId, userId),
      eq(notificationLogs.isRead, false)
    ));
  const unreadCount = unreadResult[0]?.count || 0;
  
  return { notifications, total, unreadCount };
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notificationLogs)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notificationLogs.id, notificationId),
      eq(notificationLogs.userId, userId)
    ));
  
  return { success: true };
}

// 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notificationLogs)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notificationLogs.userId, userId),
      eq(notificationLogs.isRead, false)
    ));
  
  return { success: true };
}

// 읽지 않은 알림 개수 조회
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: count() }).from(notificationLogs)
    .where(and(
      eq(notificationLogs.userId, userId),
      eq(notificationLogs.isRead, false)
    ));
  
  return result[0]?.count || 0;
}

// 사용자 이메일 조회
export async function getUserEmail(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({ email: users.email }).from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result[0]?.email || null;
}


// 세션별 후속 질문 통계 조회
export async function getFollowUpStatsBySession(userId: number, sessionId: number) {
  const db = await getDb();
  if (!db) return { count: 0, avgScore: 0, totalScore: 0 };
  
  const results = getAnsweredUniqueFollowUps(
    await db.select().from(followUpHistory)
      .where(and(
        eq(followUpHistory.userId, userId),
        eq(followUpHistory.sessionId, sessionId),
      ))
      .orderBy(desc(followUpHistory.createdAt)),
  );
  
  if (results.length === 0) {
    return { count: 0, avgScore: 0, totalScore: 0 };
  }
  
  const scores = results.map(r => r.followUpScore as number);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  
  return {
    count: results.length,
    avgScore,
    totalScore,
    details: results.map(r => ({
      id: r.id,
      question: r.followUpQuestion,
      answer: r.followUpAnswer,
      score: r.followUpScore,
      difficulty: r.difficulty,
      depth: r.depth,
    })),
  };
}

// 사용자별 후속 질문 전체 통계
export async function getFollowUpStatsByUser(userId: number) {
  const db = await getDb();
  if (!db) return { totalCount: 0, avgScore: 0, byDifficulty: {} };
  
  const results = getAnsweredUniqueFollowUps(
    await db.select().from(followUpHistory)
      .where(eq(followUpHistory.userId, userId))
      .orderBy(desc(followUpHistory.createdAt)),
  );
  
  if (results.length === 0) {
    return { totalCount: 0, avgScore: 0, byDifficulty: {} };
  }
  
  const scores = results.map(r => r.followUpScore as number);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
  
  // 난이도별 통계
  const byDifficulty: Record<string, { count: number; avgScore: number }> = {};
  ['easy', 'medium', 'hard'].forEach(diff => {
    const diffResults = results.filter(r => r.difficulty === diff);
    const diffScores = diffResults.map(r => r.followUpScore as number);
    byDifficulty[diff] = {
      count: diffResults.length,
      avgScore: diffScores.length > 0 ? Math.round(diffScores.reduce((sum, s) => sum + s, 0) / diffScores.length) : 0,
    };
  });
  
  return {
    totalCount: results.length,
    avgScore,
    byDifficulty,
  };
}


// ========== Question Credits Functions ==========

// 사용자 질문 크레딧 조회
export async function getUserQuestionCredits(userId: number) {
  const db = await getDb();
  if (!db) return { credits: 0, totalPurchased: 0 };
  
  const result = await db.select({
    questionCredits: users.questionCredits,
    totalPurchasedCredits: users.totalPurchasedCredits,
  }).from(users).where(eq(users.id, userId)).limit(1);
  
  if (result.length === 0) return { credits: 0, totalPurchased: 0 };
  
  return {
    credits: result[0].questionCredits || 0,
    totalPurchased: result[0].totalPurchasedCredits || 0,
  };
}

// 질문 크레딧 추가 (결제 후)
export async function addQuestionCredits(userId: number, credits: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  
  const currentCredits = user.questionCredits || 0;
  const totalPurchased = user.totalPurchasedCredits || 0;
  
  await db.update(users)
    .set({
      questionCredits: currentCredits + credits,
      totalPurchasedCredits: totalPurchased + credits,
    })
    .where(eq(users.id, userId));
  
  return { newCredits: currentCredits + credits };
}

// 질문 크레딧 차감 (질문 사용 시)
export async function useQuestionCredit(userId: number, count: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("Credit count must be a positive integer");
  }

  const result = await db.update(users)
    .set({ questionCredits: sql`${users.questionCredits} - ${count}` })
    .where(and(eq(users.id, userId), gte(users.questionCredits, count)));
  const affectedRows = Number((result as any)?.[0]?.affectedRows || 0);
  const balance = await getUserQuestionCredits(userId);

  if (affectedRows !== 1) {
    return { success: false, remainingCredits: balance.credits, message: "크레딧이 부족합니다" };
  }

  return { success: true, remainingCredits: balance.credits };
}

export async function restoreQuestionCredit(userId: number, count: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("Credit count must be a positive integer");
  }

  await db.update(users)
    .set({ questionCredits: sql`coalesce(${users.questionCredits}, 0) + ${count}` })
    .where(eq(users.id, userId));
}

// 질문 크레딧 충분 여부 확인
export async function hasEnoughCredits(userId: number, requiredCredits: number = 1) {
  const db = await getDb();
  if (!db) return false;
  
  const user = await getUserById(userId);
  if (!user) return false;
  
  // 구독 사용자는 무제한
  const subscription = await getUserActiveSubscription(userId);
  if (subscription?.status === "active") return true;
  
  // 무료 체험 기간 확인
  if (user.freeTrialEndsAt && new Date() < user.freeTrialEndsAt) return true;
  
  return (user.questionCredits || 0) >= requiredCredits;
}



// ========== Credit History Functions ==========

import { creditHistory } from "../drizzle/schema";

// 크레딧 내역 기록
export async function recordCreditHistory(data: {
  userId: number;
  type: "purchase" | "use" | "bonus" | "refund" | "expire";
  amount: number;
  balance: number;
  description?: string;
  relatedPaymentId?: number;
  relatedSessionId?: number;
  isFirstPurchase?: boolean;
  bonusCredits?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(creditHistory).values({
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    balance: data.balance,
    description: data.description,
    relatedPaymentId: data.relatedPaymentId,
    relatedSessionId: data.relatedSessionId,
    isFirstPurchase: data.isFirstPurchase || false,
    bonusCredits: data.bonusCredits || 0,
  });
}

// 크레딧 내역 조회
export async function getCreditHistory(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select()
    .from(creditHistory)
    .where(eq(creditHistory.userId, userId))
    .orderBy(desc(creditHistory.createdAt))
    .limit(limit)
    .offset(offset);
  
  return results;
}

// 크레딧 내역 통계
export async function getCreditStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalPurchased: 0, totalUsed: 0, totalBonus: 0 };
  
  const results = await db.select()
    .from(creditHistory)
    .where(eq(creditHistory.userId, userId));
  
  let totalPurchased = 0;
  let totalUsed = 0;
  let totalBonus = 0;
  
  results.forEach(record => {
    if (record.type === "purchase") totalPurchased += record.amount;
    if (record.type === "use") totalUsed += Math.abs(record.amount);
    if (record.type === "bonus") totalBonus += record.amount;
  });
  
  return { totalPurchased, totalUsed, totalBonus };
}

// 첫 결제 여부 확인
export async function isFirstPurchase(userId: number) {
  const db = await getDb();
  if (!db) return true;
  
  const results = await db.select()
    .from(creditHistory)
    .where(and(
      eq(creditHistory.userId, userId),
      eq(creditHistory.type, "purchase")
    ))
    .limit(1);
  
  return results.length === 0;
}

// 크레딧 추가 (내역 기록 포함)
export async function addQuestionCreditsWithHistory(
  userId: number, 
  credits: number, 
  description: string,
  relatedPaymentId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  
  const currentCredits = user.questionCredits || 0;
  const totalPurchased = user.totalPurchasedCredits || 0;
  const newBalance = currentCredits + credits;
  
  // 첫 결제 여부 확인
  const firstPurchase = await isFirstPurchase(userId);
  const bonusCredits = firstPurchase ? Math.floor(credits * 0.2) : 0; // 첫 결제 시 20% 보너스
  const finalBalance = newBalance + bonusCredits;
  
  // 사용자 크레딧 업데이트
  await db.update(users)
    .set({
      questionCredits: finalBalance,
      totalPurchasedCredits: totalPurchased + credits,
    })
    .where(eq(users.id, userId));
  
  // 결제 내역 기록
  await recordCreditHistory({
    userId,
    type: "purchase",
    amount: credits,
    balance: newBalance,
    description,
    relatedPaymentId,
    isFirstPurchase: firstPurchase,
    bonusCredits,
  });
  
  // 보너스 크레딧 내역 기록
  if (bonusCredits > 0) {
    await recordCreditHistory({
      userId,
      type: "bonus",
      amount: bonusCredits,
      balance: finalBalance,
      description: `첫 결제 보너스 (${credits}개 구매 시 20% 추가)`,
      relatedPaymentId,
    });
  }
  
  return { 
    newCredits: finalBalance, 
    bonusCredits, 
    isFirstPurchase: firstPurchase 
  };
}

// 크레딧 차감 (내역 기록 포함)
export async function useQuestionCreditWithHistory(
  userId: number, 
  count: number = 1,
  description: string = "면접 질문 답변",
  relatedSessionId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  
  const currentCredits = user.questionCredits || 0;
  
  if (currentCredits < count) {
    return { success: false, remainingCredits: currentCredits, message: "크레딧이 부족합니다" };
  }
  
  const newBalance = currentCredits - count;
  
  // 사용자 크레딧 업데이트
  await db.update(users)
    .set({
      questionCredits: newBalance,
    })
    .where(eq(users.id, userId));
  
  // 사용 내역 기록
  await recordCreditHistory({
    userId,
    type: "use",
    amount: -count,
    balance: newBalance,
    description,
    relatedSessionId,
  });
  
  return { success: true, remainingCredits: newBalance };
}


// ========== AI Evaluation Functions ==========
export async function createAIEvaluationResult(data: InsertAIEvaluationResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(aiEvaluationResults).values(data);
  return result;
}

export async function getAIEvaluationBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(aiEvaluationResults).where(eq(aiEvaluationResults.sessionId, sessionId));
  return results[0] || null;
}

export async function getAIEvaluationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(aiEvaluationResults).where(eq(aiEvaluationResults.userId, userId)).orderBy(desc(aiEvaluationResults.createdAt));
  return results;
}

export async function updateAIEvaluationResult(id: number, data: Partial<InsertAIEvaluationResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(aiEvaluationResults).set(data).where(eq(aiEvaluationResults.id, id));
}

export async function getAIEvaluationImprovement(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(aiEvaluationResults)
    .where(eq(aiEvaluationResults.userId, userId))
    .orderBy(desc(aiEvaluationResults.createdAt))
    .limit(limit);
  return results;
}

// ========== Game Results Functions ==========
export async function saveGameResult(data: InsertGameResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const result = await db.insert(gameResults).values(data);
  return result;
}

export async function getUserGameResults(userId: number, assessmentType?: GameAssessmentId) {
  const db = await getDb();
  if (!db) return [];
  
  if (assessmentType) {
    const storageType = GAME_ASSESSMENT_BY_ID[assessmentType].storageType;
    const results = await db.select().from(gameResults)
      .where(and(eq(gameResults.userId, userId), eq(gameResults.gameType, storageType)))
      .orderBy(desc(gameResults.createdAt));
    return results.filter(
      result => getStoredAssessmentId(result.gameType, result.metadata) === assessmentType,
    );
  }
  
  const results = await db.select().from(gameResults)
    .where(eq(gameResults.userId, userId))
    .orderBy(desc(gameResults.createdAt));
  return results;
}

export async function getGameStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(gameResults)
    .where(eq(gameResults.userId, userId))
    .orderBy(desc(gameResults.createdAt));
  
  if (results.length === 0) return null;
  
  type GameResultRow = (typeof results)[number];
  const grouped = new Map<GameAssessmentId, GameResultRow[]>();
  for (const result of results) {
    const assessmentType = getStoredAssessmentId(result.gameType, result.metadata);
    if (!assessmentType) continue;
    const attempts = grouped.get(assessmentType) ?? [];
    attempts.push(result);
    grouped.set(assessmentType, attempts);
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };
  const statsByAssessment: Partial<Record<GameAssessmentId, {
    count: number;
    latestScore: number;
    recentMedian: number;
    changeFromPrevious: number | null;
  }>> = {};

  grouped.forEach((attempts, assessmentType) => {
    const recentMedian = median(attempts.slice(0, 5).map(attempt => attempt.score));
    const previous = attempts.slice(5, 10);
    const previousMedian = previous.length > 0 ? median(previous.map(attempt => attempt.score)) : null;
    statsByAssessment[assessmentType] = {
      count: attempts.length,
      latestScore: attempts[0].score,
      recentMedian,
      changeFromPrevious: previousMedian === null ? null : recentMedian - previousMedian,
    };
  });
  
  return {
    totalAttempts: results.length,
    statsByAssessment,
    recentResults: results.slice(0, 10).flatMap(result => {
      const assessmentType = getStoredAssessmentId(result.gameType, result.metadata);
      return assessmentType ? [{
        id: result.id,
        assessmentType,
        score: result.score,
        timeSpent: result.timeSpent,
        mistakes: result.mistakes,
        createdAt: result.createdAt,
      }] : [];
    }),
  };
}


// ========== TTS Error Logs Functions ==========
export async function recordTTSError(data: {
  userId: number;
  errorMessage: string;
  errorType: string;
  questionText?: string;
  voiceType?: string;
  sessionId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(ttsErrorLogs).values(data);
  return { success: true };
}

export async function getTTSErrorLogs(options: {
  userId?: number;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(ttsErrorLogs);
  
  if (options.userId) {
    query = query.where(eq(ttsErrorLogs.userId, options.userId)) as any;
  }
  
  const results = await query
    .orderBy(desc(ttsErrorLogs.createdAt))
    .limit(options.limit || 100)
    .offset(options.offset || 0);
  
  return results;
}

export async function getTTSErrorStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return {
    totalErrors: 0,
    errorsByType: {},
    errorsByUser: {},
    failureRate: 0,
  };
  
  const logs = await db.select().from(ttsErrorLogs);
  
  const totalErrors = logs.length;
  const errorsByType: Record<string, number> = {};
  const errorsByUser: Record<number, number> = {};
  
  logs.forEach(log => {
    errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1;
    errorsByUser[log.userId] = (errorsByUser[log.userId] || 0) + 1;
  });
  
  return {
    totalErrors,
    errorsByType,
    errorsByUser,
    failureRate: totalErrors, // 실패율 계산 (총 시도 횟수 필요)
  };
}


// 이메일 인증 토큰으로 사용자 조회
export async function getUserByVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}
