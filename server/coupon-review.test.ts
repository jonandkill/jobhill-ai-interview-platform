import { describe, it, expect, afterAll } from "vitest";
import * as db from "./db";

describe("Coupon System", () => {
  const testCouponCode = "TESTCOUPON" + Date.now();
  let createdCouponId: number;

  it("should create a coupon", async () => {
    const coupon = await db.createCoupon({
      code: testCouponCode,
      description: "Test coupon for unit testing",
      freeHours: 24,
      maxUses: 100,
      createdBy: 1,
    });
    
    expect(coupon).toBeDefined();
    expect(coupon.code).toBe(testCouponCode);
    expect(coupon.freeHours).toBe(24);
    createdCouponId = coupon.id;
  });

  it("should get coupon by code", async () => {
    const coupon = await db.getCouponByCode(testCouponCode);
    
    expect(coupon).toBeDefined();
    expect(coupon?.code).toBe(testCouponCode);
    expect(coupon?.isActive).toBe(true);
  });

  it("should get all coupons", async () => {
    const coupons = await db.getAllCoupons();
    
    expect(Array.isArray(coupons)).toBe(true);
    expect(coupons.length).toBeGreaterThan(0);
  });

  it("should update coupon", async () => {
    await db.updateCoupon(createdCouponId, {
      description: "Updated description",
      freeHours: 48,
    });
    
    const updated = await db.getCouponByCode(testCouponCode);
    expect(updated?.description).toBe("Updated description");
    expect(updated?.freeHours).toBe(48);
  });

  it("should increment coupon usage", async () => {
    await db.incrementCouponUsage(createdCouponId);
    
    const coupon = await db.getCouponByCode(testCouponCode);
    expect(coupon?.currentUses).toBe(1);
  });

  it("should add user free time", async () => {
    const testUserId = 999999;
    await db.addUserFreeTime(testUserId, 60);
    
    const freeTime = await db.getUserFreeTime(testUserId);
    expect(freeTime).toBeDefined();
    expect(freeTime?.totalFreeMinutes).toBeGreaterThanOrEqual(60);
  });

  afterAll(async () => {
    // Cleanup: delete test coupon
    if (createdCouponId) {
      await db.deleteCoupon(createdCouponId);
    }
  });
});

describe("Review System", () => {
  const testUserId = 888888 + Math.floor(Math.random() * 100000);
  let createdReviewId: number;

  it("should create a review", async () => {
    const review = await db.createUserReview({
      userId: testUserId,
      userName: "Test User",
      rating: 5,
      content: "This is a test review for unit testing purposes.",
      bonusHours: 1,
      isApproved: true,
      isDisplayed: true,
    });
    
    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.content).toContain("test review");
    createdReviewId = review.id;
  });

  it("should get user review by user id", async () => {
    const review = await db.getUserReviewByUserId(testUserId);
    
    expect(review).toBeDefined();
    expect(review?.userId).toBe(testUserId);
  });

  it("should get approved reviews", async () => {
    const reviews = await db.getApprovedReviews(10);
    
    expect(Array.isArray(reviews)).toBe(true);
  });

  it("should get all reviews", async () => {
    const reviews = await db.getAllReviews();
    
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBeGreaterThan(0);
  });

  it("should update review status", async () => {
    await db.updateReview(createdReviewId, {
      isDisplayed: false,
    });
    
    const updated = await db.getUserReviewByUserId(testUserId);
    expect(updated?.isDisplayed).toBe(false);
  });
});
