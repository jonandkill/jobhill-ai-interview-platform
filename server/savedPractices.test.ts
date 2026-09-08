import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
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

function createUnauthContext(): TrpcContext {
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

describe("savedPractices", () => {
  it("requires authentication for list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.savedPractices.list()).rejects.toThrow("Please login");
  });

  it("requires authentication for create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.savedPractices.create({
        title: "Test Practice",
        practiceType: "mock_interview",
        content: "{}",
      })
    ).rejects.toThrow("Please login");
  });

  it("allows authenticated user to create practice", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw for authenticated user
    const result = await caller.savedPractices.create({
      title: "Test Practice",
      practiceType: "mock_interview",
      content: "{}",
    });

    expect(result).toBeDefined();
    expect(result.title).toBe("Test Practice");
  });
});

describe("admin.learningData", () => {
  it("requires admin role for create", async () => {
    const ctx = createAuthContext(); // regular user
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.learningData.create({
        dataType: "interview_qa",
        title: "Test Data",
        content: "{}",
      })
    ).rejects.toThrow("관리자 권한이 필요합니다");
  });

  it("allows admin to access learning data", async () => {
    const adminUser: AuthenticatedUser = {
      id: 1,
      openId: "admin-user-123",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user: adminUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    // Should not throw for admin
    const result = await caller.admin.learningData.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});
