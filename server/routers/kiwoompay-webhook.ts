/**
 * 키움페이 웹훅 라우터
 * 결제 완료, 실패, 자동 갱신 등의 웹훅 처리
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  processWebhook,
  KiwoompayWebhookPayload,
} from "../_core/kiwoompay-webhook";
import { TRPCError } from "@trpc/server";

export const kiwoompayWebhookRouter = router({
  /**
   * 키움페이 웹훅 처리
   * POST /api/trpc/kiwoompayWebhook.handleWebhook
   */
  handleWebhook: publicProcedure
    .input(
      z.object({
        RESULTCODE: z.string(),
        ORDERNO: z.string(),
        DAOUTRX: z.string().optional(),
        AMOUNT: z.string().optional(),
        PAYMETHOD: z.string().optional(),
        AUTHDATE: z.string().optional(),
        AUTHNO: z.string().optional(),
        CARDCODE: z.string().optional(),
        AUTOKEY: z.string().optional(),
        GENDATE: z.string().optional(),
        USERID: z.string().optional(),
        PRODUCTNAME: z.string().optional(),
        SIGNATURE: z.string().optional(),
        ERRORMESSAGE: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const payload = input as unknown as KiwoompayWebhookPayload;

        // 웹훅 처리
        const result = await processWebhook(payload);

        if (!result.success) {
          console.error(
            `[Kiwoompay Webhook] 처리 실패: ${result.message}`
          );
          return {
            success: false,
            message: result.message,
            orderId: result.orderId,
          };
        }

        console.log(
          `[Kiwoompay Webhook] 처리 완료: ${result.orderId} - ${result.message}`
        );

        return {
          success: true,
          message: result.message,
          orderId: result.orderId,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`[Kiwoompay Webhook] 오류: ${errorMessage}`);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `웹훅 처리 중 오류: ${errorMessage}`,
        });
      }
    }),

  /**
   * 웹훅 상태 확인 (헬스 체크)
   */
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      message: "키움페이 웹훅 서버 정상 작동 중",
      timestamp: new Date().toISOString(),
    };
  }),
});
