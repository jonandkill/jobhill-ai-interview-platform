/**
 * 결제 라우터 (임시 비활성화)
 * 
 * 쿠폰 시스템 구현 후 활성화될 예정입니다.
 * 현재는 기본 결제 목록 조회만 제공합니다.
 */

import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const paymentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getPaymentsByUserId(ctx.user.id);
  }),

  // 결제 상태 변경은 공급자 서버 검증과 멱등 처리가 적용된 tossPayment 라우터에서만 수행합니다.
});
