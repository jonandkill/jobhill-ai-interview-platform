/**
 * 결제 환불 라우터
 * 결제 취소, 환불, 구독 중단 등의 기능
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  requestRefund,
  isRefundSuccess,
  getRefundResultMessage,
  isRefundWithinAllowedPeriod,
} from "../_core/kiwoompay-refund";
import {
  getPaymentById,
  updatePayment,
  getUserPayments,
} from "../db";
import { TRPCError } from "@trpc/server";

export const paymentRefundRouter = router({
  /**
   * 결제 환불 요청
   */
  requestRefund: protectedProcedure
    .input(
      z.object({
        paymentId: z.number(),
        amount: z.number().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { paymentId, amount, reason } = input;
      const userId = ctx.user.id;

      // 1. 결제 정보 조회
      const payment = await getPaymentById(paymentId);

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "결제 정보를 찾을 수 없습니다.",
        });
      }

      // 2. 본인 확인
      if (payment.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "다른 사용자의 결제를 환불할 수 없습니다.",
        });
      }

      // 3. 환불 가능 여부 확인
      if (!isRefundWithinAllowedPeriod(payment.createdAt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "환불 기간이 만료되었습니다. (결제 후 180일)",
        });
      }

      // 4. 이미 환불된 결제 확인
      if (payment.status === "refunded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "이미 환불된 결제입니다.",
        });
      }

      // 5. 환불 금액 검증
      const refundAmount = amount || payment.amount;
      const alreadyRefunded = payment.refundedAmount || 0;
      const remainingAmount = payment.amount - alreadyRefunded;

      if (refundAmount > remainingAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `환불 가능 금액: ${remainingAmount}원`,
        });
      }

      // 6. 키움페이 환불 API 호출
      if (!payment.kiwoompayTrxId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "환불할 수 없는 결제입니다.",
        });
      }

      const refundResult = await requestRefund({
        orderId: payment.kiwoompayOrderNo || "",
        trxId: payment.kiwoompayTrxId,
        amount: refundAmount !== payment.amount ? refundAmount : undefined,
        reason,
      });

      if (!isRefundSuccess(refundResult)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `환불 실패: ${getRefundResultMessage(refundResult.RESULTCODE)}`,
        });
      }

      // 7. 데이터베이스 업데이트
      const newRefundedAmount = alreadyRefunded + refundAmount;
      const newStatus =
        newRefundedAmount === payment.amount ? "refunded" : "partial_refunded";

      await updatePayment(payment.id, {
        status: newStatus as any,
        refundedAmount: newRefundedAmount,
        refundedAt: new Date(),
        kiwoompayRefundTransactionId: refundResult.CANCELTRX,
        refundReason: reason,
      });

      return {
        success: true,
        message: "환불이 완료되었습니다.",
        refundAmount,
        refundTransactionId: refundResult.CANCELTRX,
      };
    }),

  /**
   * 환불 가능 여부 확인
   */
  checkRefundEligibility: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { paymentId } = input;
      const userId = ctx.user.id;

      const payment = await getPaymentById(paymentId);

      if (!payment) {
        return {
          eligible: false,
          reason: "결제 정보를 찾을 수 없습니다.",
        };
      }

      if (payment.userId !== userId) {
        return {
          eligible: false,
          reason: "다른 사용자의 결제입니다.",
        };
      }

      if (payment.status === "refunded") {
        return {
          eligible: false,
          reason: "이미 환불된 결제입니다.",
        };
      }

      if (!isRefundWithinAllowedPeriod(payment.createdAt)) {
        return {
          eligible: false,
          reason: "환불 기간이 만료되었습니다. (결제 후 180일)",
        };
      }

      const alreadyRefunded = payment.refundedAmount || 0;
      const maxRefundAmount = payment.amount - alreadyRefunded;

      return {
        eligible: true,
        maxRefundAmount,
        createdAt: payment.createdAt,
      };
    }),

  /**
   * 환불 내역 조회
   */
  getRefundHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;
      const userId = ctx.user.id;

      const payments = await getUserPayments(userId);

      const refundedPayments = payments
        .filter(
          (p: any) =>
            p.status === "refunded" || p.status === "partial_refunded"
        )
        .slice(offset, offset + limit);

      return {
        refunds: refundedPayments.map((payment: any) => ({
          id: payment.id,
          orderId: payment.kiwoompayOrderNo,
          originalAmount: payment.amount,
          refundedAmount: payment.refundedAmount || 0,
          refundedAt: payment.refundedAt,
          reason: payment.refundReason,
        })),
        total: payments.filter(
          (p: any) =>
            p.status === "refunded" || p.status === "partial_refunded"
        ).length,
      };
    }),
});
