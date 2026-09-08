// 구독 만료 알림 스케줄러
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * 구독 만료 3일 전 알림 발송
 * 매일 한 번 실행되어야 함 (예: 매일 오전 9시)
 */
export async function sendSubscriptionExpiryReminders() {
  try {
    // 3일 후 만료되는 구독 조회
    const subscriptions = await db.getSubscriptionsNeedingReminder();
    
    const results = {
      total: subscriptions.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const subscription of subscriptions) {
      try {
        // 사용자 정보 조회
        const user = await db.getUserById(subscription.userId);
        if (!user) {
          results.errors.push(`사용자 ID ${subscription.userId}를 찾을 수 없음`);
          results.failed++;
          continue;
        }
        
        // 만료일 계산
        const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
        const formattedEndDate = endDate 
          ? `${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`
          : "알 수 없음";
        
        // 알림 발송 (관리자에게 알림)
        await notifyOwner({
          title: `📅 구독 만료 예정 알림`,
          content: `사용자 ${user.name || user.openId}님의 ${subscription.planType} 구독이 ${formattedEndDate}에 만료됩니다.
          
구독 ID: ${subscription.id}
플랜: ${subscription.planType}
자동 갱신: ${subscription.autoRenew ? "활성화" : "비활성화"}

${subscription.autoRenew ? "자동 갱신이 활성화되어 있어 자동으로 결제됩니다." : "자동 갱신이 비활성화되어 있어 수동 갱신이 필요합니다."}`,
        });
        
        // 알림 발송 완료 표시
        await db.markSubscriptionReminderSent(subscription.id);
        results.sent++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`구독 ID ${subscription.id}: ${errorMessage}`);
        results.failed++;
      }
    }
    
    // 결과 로그
    console.log(`[Scheduler] 구독 만료 알림 발송 완료:`, results);
    
    return results;
    
  } catch (error) {
    console.error("[Scheduler] 구독 만료 알림 발송 실패:", error);
    throw error;
  }
}

/**
 * 만료된 구독 자동 비활성화
 * 매일 한 번 실행되어야 함
 */
export async function deactivateExpiredSubscriptions() {
  try {
    const result = await db.deactivateExpiredSubscriptions();
    console.log(`[Scheduler] 만료된 구독 비활성화 완료:`, result);
    return result;
  } catch (error) {
    console.error("[Scheduler] 만료된 구독 비활성화 실패:", error);
    throw error;
  }
}

/**
 * 자동 갱신 결제 처리
 * 매일 한 번 실행되어야 함 (만료 1일 전 구독 대상)
 */
export async function processAutoRenewals() {
  try {
    // 1일 후 만료되는 자동 갱신 구독 조회
    const subscriptions = await db.getSubscriptionsForAutoRenewal();
    
    const results = {
      total: subscriptions.length,
      renewed: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const subscription of subscriptions) {
      try {
        // 빌링키가 있는 경우에만 자동 갱신
        if (!subscription.tossBillingKey) {
          results.errors.push(`구독 ID ${subscription.id}: 빌링키 없음`);
          results.failed++;
          continue;
        }
        
        // 토스페이먼츠 빌링 결제 실행
        const secretKey = process.env.TOSS_SECRET_KEY;
        if (!secretKey) {
          results.errors.push(`구독 ID ${subscription.id}: 토스페이먼츠 시크릿 키 없음`);
          results.failed++;
          continue;
        }
        
        const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
        const orderId = `AUTO_RENEW_${subscription.id}_${Date.now()}`;
        
        // 플랜별 금액 설정
        const planPrices: Record<string, number> = {
          basic: 9900,
          premium: 19900,
          premium_plus: 29900,
        };
        const amount = planPrices[subscription.planType] || 9900;
        
        const response = await fetch("https://api.tosspayments.com/v1/billing/" + subscription.tossBillingKey, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encryptedSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerKey: `user_${subscription.userId}`,
            amount,
            orderId,
            orderName: `AI 면접 코치 ${subscription.planType} 자동 갱신`,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          results.errors.push(`구독 ID ${subscription.id}: ${errorData.message || "결제 실패"}`);
          results.failed++;
          
          // 결제 실패 알림
          await notifyOwner({
            title: `❌ 자동 갱신 결제 실패`,
            content: `구독 ID ${subscription.id}의 자동 갱신 결제가 실패했습니다.
오류: ${errorData.message || "알 수 없는 오류"}`,
          });
          
          continue;
        }
        
        // 구독 기간 연장
        const newEndDate = new Date(subscription.endDate!);
        newEndDate.setDate(newEndDate.getDate() + 30);
        
        await db.updateSubscription(subscription.id, {
          endDate: newEndDate,
          cancelNotificationSent: false, // 알림 플래그 리셋
        });
        
        // 결제 기록 생성
        await db.createPayment({
          userId: subscription.userId,
          amount,
          currency: "KRW",
          status: "completed",
          paymentType: "subscription",
          productType: subscription.planType,
          description: `${subscription.planType} 자동 갱신`,
          kiwoompayOrderNo: orderId,
          paymentGateway: "kiwoompay", // 토스페이먼츠 결제도 kiwoompay 게이트웨이 사용
        });
        
        results.renewed++;
        
        // 갱신 성공 알림
        await notifyOwner({
          title: `✅ 자동 갱신 결제 완료`,
          content: `구독 ID ${subscription.id}의 자동 갱신 결제가 완료되었습니다.
금액: ${amount.toLocaleString()}원
새 만료일: ${newEndDate.toLocaleDateString("ko-KR")}`,
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`구독 ID ${subscription.id}: ${errorMessage}`);
        results.failed++;
      }
    }
    
    console.log(`[Scheduler] 자동 갱신 처리 완료:`, results);
    return results;
    
  } catch (error) {
    console.error("[Scheduler] 자동 갱신 처리 실패:", error);
    throw error;
  }
}
