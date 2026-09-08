/**
 * 스케줄러 초기화
 * node-cron을 사용하여 정기적인 작업 실행
 */

import cron from "node-cron";
import {
  processMonthlySubscriptionBilling,
  cleanupExpiredSubscriptions,
} from "../scheduler-kiwoompay";

let schedulerInitialized = false;

/**
 * 스케줄러 초기화
 * - 매월 1일 00:00 UTC: 월정액 자동 갱신 결제 실행
 * - 매일 01:00 UTC: 만료된 구독 정리
 */
export function initializeScheduler(): void {
  if (schedulerInitialized) {
    console.log("[Scheduler] 스케줄러가 이미 초기화되었습니다.");
    return;
  }

  try {
    // 매월 1일 00:00 UTC에 월정액 자동 갱신 결제 실행
    // cron 형식: 초 분 시 일 월 요일
    const monthlyBillingTask = cron.schedule("0 0 0 1 * *", async () => {
      console.log(
        `[${new Date().toISOString()}] 월정액 자동 갱신 결제 스케줄 실행`
      );
      try {
        await processMonthlySubscriptionBilling();
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] 월정액 자동 갱신 결제 중 오류:`,
          error
        );
      }
    });

    // 매일 01:00 UTC에 만료된 구독 정리
    const cleanupTask = cron.schedule("0 0 1 * * *", async () => {
      console.log(
        `[${new Date().toISOString()}] 만료된 구독 정리 스케줄 실행`
      );
      try {
        await cleanupExpiredSubscriptions();
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] 만료된 구독 정리 중 오류:`,
          error
        );
      }
    });

    schedulerInitialized = true;
    console.log("[Scheduler] 스케줄러 초기화 완료");
    console.log("[Scheduler] 월정액 자동 갱신 결제: 매월 1일 00:00 UTC");
    console.log("[Scheduler] 만료된 구독 정리: 매일 01:00 UTC");

    // 스케줄러 종료 시 정리
    process.on("SIGTERM", () => {
      console.log("[Scheduler] SIGTERM 신호 수신, 스케줄러 종료");
      monthlyBillingTask.stop();
      cleanupTask.stop();
    });

    process.on("SIGINT", () => {
      console.log("[Scheduler] SIGINT 신호 수신, 스케줄러 종료");
      monthlyBillingTask.stop();
      cleanupTask.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("[Scheduler] 스케줄러 초기화 실패:", error);
    throw error;
  }
}

/**
 * 스케줄러 상태 확인
 */
export function isSchedulerInitialized(): boolean {
  return schedulerInitialized;
}
