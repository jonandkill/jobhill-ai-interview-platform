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

describe("coverLetterItems", () => {
  it("requires authentication for listByUser", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.coverLetterItems.listByUser()).rejects.toThrow();
  });

  it("requires authentication for upsert", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.coverLetterItems.upsert({
        profileId: 1,
        items: [
          {
            itemOrder: 1,
            itemTitle: "지원동기",
            maxLength: 500,
            content: "테스트 내용",
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("validates upsert input schema", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // profileId가 없으면 에러
    await expect(
      caller.coverLetterItems.upsert({
        profileId: undefined as any,
        items: [],
      })
    ).rejects.toThrow();
  });

  it("validates update input schema", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // id가 없으면 에러
    await expect(
      caller.coverLetterItems.update({
        id: undefined as any,
        content: "test",
      })
    ).rejects.toThrow();
  });

  it("validates delete input schema", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // id가 없으면 에러
    await expect(
      caller.coverLetterItems.delete({
        id: undefined as any,
      })
    ).rejects.toThrow();
  });
});
