import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("difficultQuestions router", () => {
  it("should require authentication for list", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.difficultQuestions.list()).rejects.toThrow("Please login");
  });

  it("should require authentication for create", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.difficultQuestions.create({
        question: "테스트 질문",
      })
    ).rejects.toThrow("Please login");
  });

  it("should allow authenticated user to create question", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 인증된 사용자는 질문 생성 가능
    const result = await caller.difficultQuestions.create({
      question: "어려운 테스트 질문입니다",
      category: "인성",
    });

    expect(result).toBeDefined();
    expect(result.question).toBe("어려운 테스트 질문입니다");
    expect(result.category).toBe("인성");
  });

  it("should require authentication for delete", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.difficultQuestions.delete({ id: 1 })
    ).rejects.toThrow("Please login");
  });

  it("should require authentication for practice", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.difficultQuestions.practice({
        id: 1,
        answer: "테스트 답변",
      })
    ).rejects.toThrow("Please login");
  });
});
