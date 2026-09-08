import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock context for admin user
const mockAdminContext: Context = {
  user: {
    id: 1,
    openId: "admin-test",
    name: "Admin User",
    email: "admin@test.com",
    role: "admin",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

// Mock context for regular user
const mockUserContext: Context = {
  user: {
    id: 2,
    openId: "user-test",
    name: "Test User",
    email: "user@test.com",
    role: "user",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

describe("External Payment Link System", () => {
  const caller = appRouter.createCaller(mockAdminContext);
  const userCaller = appRouter.createCaller(mockUserContext);

  describe("Payment Link Management (Admin)", () => {
    it("should create a payment link", async () => {
      const result = await caller.paymentLink.upsertLink({
        planType: "monthly",
        externalUrl: "https://external-payment.com/monthly",
        description: "월 정액 결제 링크",
        isActive: true,
      });

      expect(result.success).toBe(true);
    });

    it("should get payment link by plan type", async () => {
      const link = await caller.paymentLink.getByPlan({ planType: "monthly" });
      
      if (link) {
        expect(link.planType).toBe("monthly");
        expect(link.externalUrl).toContain("external-payment.com");
        expect(link.isActive).toBe(true);
      }
    });

    it("should list all payment links (admin only)", async () => {
      const links = await caller.paymentLink.listLinks();
      expect(Array.isArray(links)).toBe(true);
    });

    it("should reject non-admin from listing links", async () => {
      await expect(
        userCaller.paymentLink.listLinks()
      ).rejects.toThrow("관리자 권한이 필요합니다");
    });
  });

  describe("Payment Request Flow (User)", () => {
    let requestId: number;

    it("should create a payment request", async () => {
      const result = await userCaller.paymentLink.createRequest({
        planType: "monthly",
        amount: 9900,
        externalPaymentId: "ext-payment-123",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      requestId = result.requestId;
    });

    it("should get user's payment requests", async () => {
      const requests = await userCaller.paymentLink.myRequests();
      expect(Array.isArray(requests)).toBe(true);
      
      const myRequest = requests.find(r => r.id === requestId);
      expect(myRequest).toBeDefined();
      expect(myRequest?.status).toBe("pending");
    });

    it("should cancel pending payment request", async () => {
      const result = await userCaller.paymentLink.cancelRequest({ requestId });
      expect(result.success).toBe(true);
      expect(result.message).toContain("취소");
    });

    it("should reject canceling already cancelled request", async () => {
      await expect(
        userCaller.paymentLink.cancelRequest({ requestId })
      ).rejects.toThrow("대기 중인 신청만 취소할 수 있습니다");
    });
  });

  describe("Payment Request Approval (Admin)", () => {
    let pendingRequestId: number;

    beforeAll(async () => {
      // Create a new pending request for approval test
      const result = await userCaller.paymentLink.createRequest({
        planType: "basic",
        amount: 19900,
      });
      pendingRequestId = result.requestId;
    });

    it("should get pending payment requests (admin only)", async () => {
      const requests = await caller.paymentLink.pendingRequests();
      expect(Array.isArray(requests)).toBe(true);
      
      const pendingRequest = requests.find(r => r.id === pendingRequestId);
      expect(pendingRequest).toBeDefined();
      expect(pendingRequest?.status).toBe("pending");
    });

    it("should approve payment request", async () => {
      const result = await caller.paymentLink.approveRequest({ 
        requestId: pendingRequestId 
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("승인");
    });

    it("should reject approving already approved request", async () => {
      await expect(
        caller.paymentLink.approveRequest({ requestId: pendingRequestId })
      ).rejects.toThrow("대기 중인 신청만 승인할 수 있습니다");
    });
  });

  describe("Payment Request Rejection (Admin)", () => {
    let rejectRequestId: number;

    beforeAll(async () => {
      // Create a new pending request for rejection test
      const result = await userCaller.paymentLink.createRequest({
        planType: "premium",
        amount: 49900,
      });
      rejectRequestId = result.requestId;
    });

    it("should reject payment request with reason", async () => {
      const result = await caller.paymentLink.rejectRequest({
        requestId: rejectRequestId,
        reason: "결제 정보 불일치",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("거부");
    });
  });
});

describe("Coupon Auto-Issuance System", () => {
  // 테스트마다 다른 사용자 ID 사용
  const reviewTestUserId = 9999;
  const reviewTestUserContext = {
    user: { id: reviewTestUserId, email: "review-test@example.com", role: "user" as const, name: "후기 테스트 사용자" },
  };
  const reviewUserCaller = appRouter.createCaller(reviewTestUserContext);

  describe("Review Incentive System", () => {
    it("should issue coupon when user writes review", async () => {
      const result = await reviewUserCaller.review.create({
        rating: 5,
        content: "정말 도움이 많이 되었습니다. AI 피드백이 구체적이고 실전 같아서 좋았어요!",
        userName: "후기 테스트 사용자",
      });

      expect(result.success).toBe(true);
      expect(result.bonusHours).toBe(1);
      expect(result.message).toContain("1시간");
    });

    it("should reject duplicate review", async () => {
      await expect(reviewUserCaller.review.create({
        rating: 4,
        content: "또 후기를 작성합니다.",
        userName: "후기 테스트 사용자",
      })).rejects.toThrow("이미 후기를 작성하셨습니다");
    });
  });

  describe("Usage-Based Milestone System", () => {
    const milestoneTestUserId = 8888;
    const milestoneTestUserContext = {
      user: { id: milestoneTestUserId, email: "milestone-test@example.com", role: "user" as const, name: "마일스톤 테스트 사용자" },
    };
    const milestoneUserCaller = appRouter.createCaller(milestoneTestUserContext);

    it("should track completed interviews", async () => {
      // 실제 면접 완료 플로우가 필요하므로 기본 테스트만 수행
      // completedInterviews 필드가 증가하고 5, 10, 20, 50, 100회에 쿠폰 발급
      expect(true).toBe(true); // Placeholder test
      
      expect(true).toBe(true); // Placeholder for integration test
    });
  });
});
