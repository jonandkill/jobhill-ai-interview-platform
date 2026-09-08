import { eq, and, or } from "drizzle-orm";
import { getDb } from "./db";
import { 
  paymentLinks, InsertPaymentLink,
  paymentRequests, InsertPaymentRequest, PaymentRequest,
  subscriptions,
} from "../drizzle/schema";

// ========== Payment Links Functions ==========

// 외부 결제 링크 생성
export async function createPaymentLink(data: Omit<InsertPaymentLink, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(paymentLinks).values(data);
  return result;
}

// 플랜 타입별 결제 링크 조회
export async function getPaymentLinkByPlanType(planType: "monthly" | "basic" | "premium" | "premium_plus") {
  const db = await getDb();
  if (!db) return null;
  
  const [link] = await db.select().from(paymentLinks)
    .where(and(
      eq(paymentLinks.planType, planType),
      eq(paymentLinks.isActive, true)
    ))
    .limit(1);
  
  return link || null;
}

// 모든 결제 링크 조회 (관리자용)
export async function getAllPaymentLinks() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(paymentLinks);
}

// 결제 링크 수정
export async function updatePaymentLink(id: number, data: Partial<Omit<InsertPaymentLink, 'id' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(paymentLinks).set(data).where(eq(paymentLinks.id, id));
  return { success: true };
}

// 결제 링크 삭제
export async function deletePaymentLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(paymentLinks).where(eq(paymentLinks.id, id));
  return { success: true };
}

// ========== Payment Requests Functions ==========

// 결제 신청 생성
export async function createPaymentRequest(data: Omit<InsertPaymentRequest, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(paymentRequests).values(data);
  return result;
}

// 사용자별 결제 신청 내역 조회
export async function getUserPaymentRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(paymentRequests)
    .where(eq(paymentRequests.userId, userId))
    .orderBy(paymentRequests.createdAt);
}

// 결제 신청 ID로 조회
export async function getPaymentRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [request] = await db.select().from(paymentRequests)
    .where(eq(paymentRequests.id, id))
    .limit(1);
  
  return request || null;
}

// 모든 결제 신청 내역 조회 (관리자용)
export async function getAllPaymentRequests() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(paymentRequests)
    .orderBy(paymentRequests.createdAt);
}

// 대기 중인 결제 신청 조회 (관리자용)
export async function getPendingPaymentRequests() {
  const db = await getDb();
  if (!db) return [];
  
  const { users } = await import("../drizzle/schema");
  
  return db.select({
    id: paymentRequests.id,
    userId: paymentRequests.userId,
    planType: paymentRequests.planType,
    amount: paymentRequests.amount,
    status: paymentRequests.status,
    externalPaymentId: paymentRequests.externalPaymentId,
    approvedBy: paymentRequests.approvedBy,
    approvedAt: paymentRequests.approvedAt,
    rejectedReason: paymentRequests.rejectedReason,
    createdAt: paymentRequests.createdAt,
    updatedAt: paymentRequests.updatedAt,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
    },
  })
  .from(paymentRequests)
  .leftJoin(users, eq(paymentRequests.userId, users.id))
  .where(eq(paymentRequests.status, "pending"))
  .orderBy(paymentRequests.createdAt);
}

// 결제 신청 승인
export async function fulfillPendingPaymentRequest(request: PaymentRequest, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const now = new Date();
    const updated = await tx.update(paymentRequests).set({
      status: "approved",
      approvedBy,
      approvedAt: now,
    }).where(and(
      eq(paymentRequests.id, request.id),
      eq(paymentRequests.userId, request.userId),
      eq(paymentRequests.status, "pending"),
    ));

    if (Number((updated as any)?.[0]?.affectedRows || 0) !== 1) return false;

    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    const [activeSubscription] = await tx.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, request.userId),
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing")),
      ))
      .limit(1);

    if (activeSubscription) {
      await tx.update(subscriptions).set({
        planType: request.planType,
        amount: request.amount,
        nextBillingDate,
        status: "active",
        autoRenew: false,
      }).where(eq(subscriptions.id, activeSubscription.id));
    } else {
      await tx.insert(subscriptions).values({
        userId: request.userId,
        planType: request.planType,
        amount: request.amount,
        startDate: now,
        nextBillingDate,
        status: "active",
        // 외부 결제 확인은 빌링키가 아니므로 자동 갱신으로 표시하지 않습니다.
        autoRenew: false,
      });
    }

    return true;
  });
}

// 결제 신청 거부
export async function rejectPaymentRequest(id: number, rejectedReason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(paymentRequests).set({
    status: "rejected",
    rejectedReason,
  }).where(eq(paymentRequests.id, id));
  
  return { success: true };
}

// 결제 신청 취소 (사용자)
export async function cancelPaymentRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(paymentRequests).set({
    status: "cancelled",
  }).where(eq(paymentRequests.id, id));
  
  return { success: true };
}

// 결제 신청 수정 (관리자)
export async function updatePaymentRequest(id: number, data: Partial<Omit<InsertPaymentRequest, 'id' | 'createdAt' | 'userId'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(paymentRequests).set(data).where(eq(paymentRequests.id, id));
  return { success: true };
}
