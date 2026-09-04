import { describe, it, expect, vi } from "vitest";

// 스케줄러 및 단체 가입 기능 테스트

describe("Scheduler Functions", () => {
  it("should have sendSubscriptionExpiryReminders function", async () => {
    const scheduler = await import("./scheduler");
    expect(typeof scheduler.sendSubscriptionExpiryReminders).toBe("function");
  });

  it("should have deactivateExpiredSubscriptions function", async () => {
    const scheduler = await import("./scheduler");
    expect(typeof scheduler.deactivateExpiredSubscriptions).toBe("function");
  });

  it("should have processAutoRenewals function", async () => {
    const scheduler = await import("./scheduler");
    expect(typeof scheduler.processAutoRenewals).toBe("function");
  });
});

describe("Organization Functions", () => {
  it("should have getPublicOrganizations function in db", async () => {
    const db = await import("./db");
    expect(typeof db.getPublicOrganizations).toBe("function");
  });

  it("should return array from getPublicOrganizations", async () => {
    const db = await import("./db");
    const result = await db.getPublicOrganizations();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have deactivateExpiredSubscriptions function in db", async () => {
    const db = await import("./db");
    expect(typeof db.deactivateExpiredSubscriptions).toBe("function");
  });

  it("should have getSubscriptionsNeedingReminder function in db", async () => {
    const db = await import("./db");
    expect(typeof db.getSubscriptionsNeedingReminder).toBe("function");
  });

  it("should have getSubscriptionsForAutoRenewal function in db", async () => {
    const db = await import("./db");
    expect(typeof db.getSubscriptionsForAutoRenewal).toBe("function");
  });
});
