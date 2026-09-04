import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("autoQuestion.getPopularQuestions", () => {
  it("returns popular questions for public users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.autoQuestion.getPopularQuestions({
      category: "all",
      limit: 5,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
    
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("question");
      expect(result[0]).toHaveProperty("category");
      expect(result[0]).toHaveProperty("frequency");
    }
  });

  it("filters questions by category", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.autoQuestion.getPopularQuestions({
      category: "personality",
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All returned questions should be personality type
    result.forEach((q) => {
      expect(q.category).toBe("personality");
    });
  });
});

describe("freeLimit.check", () => {
  it("returns free limit status for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.freeLimit.check();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("usedQuestions");
    expect(result).toHaveProperty("freeLimit");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("needsPayment");
    expect(result).toHaveProperty("hasSubscription");
    expect(result).toHaveProperty("hasFreeTrial");
    
    expect(typeof result.usedQuestions).toBe("number");
    expect(typeof result.freeLimit).toBe("number");
    expect(result.freeLimit).toBe(3); // Default free limit
  });

  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.freeLimit.check()).rejects.toThrow();
  });
});
