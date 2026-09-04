import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "./env";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

const OPENAI_TEST_WINDOW_MS = 10 * 60 * 1_000;
const OPENAI_TEST_LIMIT = 5;
const openAiTestAttempts = new Map<string, { count: number; resetAt: number }>();

const openAiKeySchema = z
  .string()
  .min(20, "API 키가 너무 짧습니다.")
  .max(512, "API 키가 너무 깁니다.")
  .regex(/^\S+$/, "API 키에는 공백을 넣을 수 없습니다.");

const openAiTestInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("configured") }).strict(),
  z.object({ mode: z.literal("ephemeral"), apiKey: openAiKeySchema }).strict(),
]);

const assertSameOrigin = (origin: string | undefined, secFetchSite: string | undefined) => {
  if (secFetchSite === "cross-site") {
    throw new TRPCError({ code: "FORBIDDEN", message: "교차 사이트 요청은 허용하지 않습니다." });
  }
  if (!origin || !ENV.appBaseUrl) return;
  try {
    if (new URL(origin).origin !== new URL(ENV.appBaseUrl).origin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "허용되지 않은 요청 출처입니다." });
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "FORBIDDEN", message: "요청 출처를 확인할 수 없습니다." });
  }
};

const enforceOpenAiTestRateLimit = (adminId: string) => {
  const now = Date.now();
  const current = openAiTestAttempts.get(adminId);
  if (!current || current.resetAt <= now) {
    openAiTestAttempts.set(adminId, { count: 1, resetAt: now + OPENAI_TEST_WINDOW_MS });
    return;
  }
  if (current.count >= OPENAI_TEST_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "연결 검사는 10분에 5회까지 가능합니다.",
    });
  }
  current.count += 1;
};

const safeOpenAiStatus = (status: number) => {
  if (status >= 200 && status < 300) {
    return { ok: true, code: "authenticated", message: "OpenAI 인증 연결을 확인했습니다." };
  }
  if (status === 401) {
    return { ok: false, code: "invalid_key", message: "키가 유효하지 않거나 폐기되었습니다." };
  }
  if (status === 403) {
    return { ok: false, code: "forbidden", message: "프로젝트 또는 조직 권한을 확인해주세요." };
  }
  if (status === 429) {
    return { ok: false, code: "limited", message: "할당량·요금·속도 제한 상태를 확인해주세요." };
  }
  if (status >= 500) {
    return { ok: false, code: "provider_error", message: "OpenAI 서비스가 일시적으로 응답하지 않습니다." };
  }
  return { ok: false, code: "unexpected_status", message: "OpenAI 연결 설정을 확인해주세요." };
};

async function testOpenAiKey(apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { authorization: "Bearer " + apiKey },
      redirect: "error",
      signal: controller.signal,
    });
    if (response.body) await response.body.cancel().catch(() => undefined);
    return safeOpenAiStatus(response.status);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, code: "timeout", message: "5초 안에 응답이 없어 다시 확인이 필요합니다." };
    }
    return { ok: false, code: "network_error", message: "OpenAI 연결 중 네트워크 오류가 발생했습니다." };
  } finally {
    clearTimeout(timeout);
  }
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  openAiStatus: adminProcedure.query(() => ({
    configured: Boolean(ENV.openaiApiKey),
    modelConfigured: Boolean(ENV.openaiModel),
    forgeFallbackConfigured: Boolean(ENV.forgeApiKey),
  })),

  testOpenAiApiKey: adminProcedure
    .input(openAiTestInput)
    .mutation(async ({ ctx, input }) => {
      ctx.res.setHeader("Cache-Control", "no-store");
      ctx.res.setHeader("Pragma", "no-cache");
      assertSameOrigin(ctx.req.get("origin"), ctx.req.get("sec-fetch-site"));
      enforceOpenAiTestRateLimit(String(ctx.user.id));

      const configured = input.mode === "configured";
      const apiKey = configured ? ENV.openaiApiKey : input.apiKey;
      if (!apiKey) {
        return {
          ok: false,
          configured: false,
          code: "not_configured",
          message: "운영 Secret 저장소에 OPENAI_API_KEY가 등록되지 않았습니다.",
        } as const;
      }

      const result = await testOpenAiKey(apiKey);
      return {
        ...result,
        configured,
        message: configured
          ? result.message
          : result.ok
            ? "키는 유효하지만 저장되지 않았습니다. 운영 Secret에 별도로 등록해주세요."
            : result.message,
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
