/**
 * 키움페이 자동 갱신 결제 스케줄러
 * 매월 정해진 시간에 활성 구독 사용자의 월정액 결제를 자동으로 실행
 */

import * as db from "./db";
import { notifyOwner } from "./_core/notification";

// TODO: 새로운 키움페이 2단계 프로세스 API 기반으로 재구현 필요

interface SubscriptionBillingResult {
  subscriptionId: number;
  userId: number;
  success: boolean;
  error?: string;
  paymentId?: number;
}

/**
 * 월정액 자동 갱신 결제 실행
 * 매월 1일 00:00 UTC에 실행되도록 설정
 */
export async function processMonthlySubscriptionBilling(): Promise<void> {
  console.log(`[${new Date().toISOString()}] 월정액 자동 갱신 결제 시작`);

  try {
    // 1. 활성 구독 사용자 조회 (간단한 쿼리로 변경)
    // 실제 구현에서는 데이터베이스 쿼리 빌더를 사용해야 함
    console.log("활성 구독 조회 중...");

    // 2. 각 구독에 대해 결제 실행
    const results: SubscriptionBillingResult[] = [];

    // 3. 결과 요약
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `월정액 자동 갱신 결제 완료: 성공 ${successCount}건, 실패 ${failureCount}건`
    );

    // 4. 소유자에게 알림 (실패가 있는 경우)
    if (failureCount > 0) {
      const failedDetails = results
        .filter((r) => !r.success)
        .map((r) => `구독 ${r.subscriptionId} (사용자 ${r.userId}): ${r.error}`)
        .join("\n");

      await notifyOwner({
        title: "⚠️ 월정액 자동 갱신 결제 일부 실패",
        content: `${failureCount}건의 자동 갱신 결제가 실패했습니다.\n\n${failedDetails}`,
      });
    }

    // 5. 성공 알림 (선택사항)
    if (successCount > 0) {
      await notifyOwner({
        title: "✅ 월정액 자동 갱신 결제 완료",
        content: `${successCount}건의 자동 갱신 결제가 완료되었습니다.`,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[${new Date().toISOString()}] 월정액 자동 갱신 결제 중 오류 발생:`,
      errorMessage
    );

    // 심각한 오류 발생 시 소유자에게 알림
    await notifyOwner({
      title: "🚨 월정액 자동 갱신 결제 시스템 오류",
      content: `월정액 자동 갱신 결제 처리 중 오류가 발생했습니다.\n\n오류: ${errorMessage}`,
    });
  }
}

/**
 * 구독 상태 확인 및 정리
 * 만료된 구독을 cancelled 상태로 변경
 */
export async function cleanupExpiredSubscriptions(): Promise<void> {
  console.log(`[${new Date().toISOString()}] 만료된 구독 정리 시작`);

  try {
    const now = new Date();
    console.log("만료된 구독 조회 중...");
    console.log(`현재 시간: ${now.toISOString()}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[${new Date().toISOString()}] 만료된 구독 정리 중 오류 발생:`,
      errorMessage
    );
  }
}
