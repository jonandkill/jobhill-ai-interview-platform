import { notifyOwner } from "./_core/notification";
import * as db from "./db";

// 이메일 알림 유형
export type EmailType = 
  | "payment_success"
  | "payment_failed"
  | "subscription_expiring"
  | "subscription_expired"
  | "welcome";

interface EmailPayload {
  userId: number;
  type: EmailType;
  data?: Record<string, unknown>;
}

// 이메일 템플릿
const emailTemplates: Record<EmailType, { title: string; content: (data: Record<string, unknown>) => string }> = {
  payment_success: {
    title: "💳 결제가 완료되었습니다",
    content: (data) => `
안녕하세요, ${data.userName || "고객"}님!

결제가 성공적으로 완료되었습니다.

📦 상품: ${data.productName || "면접 연습"}
💰 결제 금액: ${Number(data.amount || 0).toLocaleString()}원
🔢 주문 번호: ${data.orderNo || "-"}
📅 결제 일시: ${data.paymentDate || new Date().toLocaleDateString("ko-KR")}

감사합니다!
JOB KILL 팀 드림
    `.trim(),
  },
  payment_failed: {
    title: "❌ 결제에 실패했습니다",
    content: (data) => `
안녕하세요, ${data.userName || "고객"}님!

결제 처리 중 문제가 발생했습니다.

📦 상품: ${data.productName || "면접 연습"}
💰 결제 시도 금액: ${Number(data.amount || 0).toLocaleString()}원
❌ 실패 사유: ${data.failReason || "결제 처리 중 오류가 발생했습니다."}

다시 시도해 주시거나, 문제가 지속되면 고객센터로 문의해 주세요.

JOB KILL 팀 드림
    `.trim(),
  },
  subscription_expiring: {
    title: "⏰ 구독이 3일 후 만료됩니다",
    content: (data) => `
안녕하세요, ${data.userName || "고객"}님!

현재 이용 중인 ${data.planName || "구독"} 플랜이 3일 후 만료됩니다.

📅 만료 예정일: ${data.expiryDate || "-"}
📦 현재 플랜: ${data.planName || "-"}

자동 갱신이 설정되어 있지 않다면, 서비스 이용이 중단될 수 있습니다.
계속해서 서비스를 이용하시려면 구독을 갱신해 주세요.

👉 구독 관리 페이지에서 갱신하기

감사합니다!
JOB KILL 팀 드림
    `.trim(),
  },
  subscription_expired: {
    title: "📢 구독이 만료되었습니다",
    content: (data) => `
안녕하세요, ${data.userName || "고객"}님!

${data.planName || "구독"} 플랜이 만료되었습니다.

📅 만료일: ${data.expiryDate || "-"}

서비스를 계속 이용하시려면 새로운 구독을 시작해 주세요.
지금 구독하시면 특별 할인 혜택을 받으실 수 있습니다!

👉 요금제 페이지에서 구독하기

감사합니다!
JOB KILL 팀 드림
    `.trim(),
  },
  welcome: {
    title: "🎉 JOB KILL에 오신 것을 환영합니다!",
    content: (data) => `
안녕하세요, ${data.userName || "고객"}님!

JOB KILL에 가입해 주셔서 감사합니다.

AI 면접 코치와 함께 면접 준비를 시작해 보세요:
✅ 맞춤형 면접 질문 생성
✅ 실시간 AI 피드백
✅ 답변 분석 및 개선 제안

지금 바로 첫 면접 연습을 시작해 보세요!

감사합니다!
JOB KILL 팀 드림
    `.trim(),
  },
};

// 사용자에게 이메일 알림 발송 (현재는 관리자에게 알림으로 대체)
export async function sendEmailNotification(payload: EmailPayload): Promise<boolean> {
  const { userId, type, data = {} } = payload;
  
  try {
    // 사용자 정보 조회
    const user = await db.getUserById(userId);
    if (!user) {
      console.warn(`[Email] User not found: ${userId}`);
      return false;
    }
    
    const template = emailTemplates[type];
    if (!template) {
      console.warn(`[Email] Unknown email type: ${type}`);
      return false;
    }
    
    const emailData = {
      ...data,
      userName: user.name || "고객",
      userEmail: user.email || "",
    };
    
    const title = template.title;
    const content = template.content(emailData);
    
    // 현재는 관리자에게 알림으로 발송 (실제 이메일 서비스 연동 시 교체)
    const result = await notifyOwner({
      title: `[사용자 알림] ${title}`,
      content: `수신자: ${user.name} (${user.email || "이메일 없음"})\n\n${content}`,
    });
    
    // 알림 로그 저장
    await db.createNotificationLog({
      userId,
      type,
      title,
      content,
      status: result ? "sent" : "failed",
    });
    
    return result;
  } catch (error) {
    console.error("[Email] Error sending notification:", error);
    return false;
  }
}

// 결제 성공 알림
export async function notifyPaymentSuccess(
  userId: number,
  productName: string,
  amount: number,
  orderNo: string
): Promise<boolean> {
  return sendEmailNotification({
    userId,
    type: "payment_success",
    data: {
      productName,
      amount,
      orderNo,
      paymentDate: new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  });
}

// 결제 실패 알림
export async function notifyPaymentFailed(
  userId: number,
  productName: string,
  amount: number,
  failReason: string
): Promise<boolean> {
  return sendEmailNotification({
    userId,
    type: "payment_failed",
    data: {
      productName,
      amount,
      failReason,
    },
  });
}

// 구독 만료 3일 전 알림
export async function notifySubscriptionExpiring(
  userId: number,
  planName: string,
  expiryDate: Date
): Promise<boolean> {
  return sendEmailNotification({
    userId,
    type: "subscription_expiring",
    data: {
      planName,
      expiryDate: expiryDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  });
}

// 구독 만료 알림
export async function notifySubscriptionExpired(
  userId: number,
  planName: string,
  expiryDate: Date
): Promise<boolean> {
  return sendEmailNotification({
    userId,
    type: "subscription_expired",
    data: {
      planName,
      expiryDate: expiryDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  });
}

// 만료 예정 구독 확인 및 알림 발송 (스케줄러에서 호출)
export async function checkAndNotifyExpiringSubscriptions(): Promise<void> {
  try {
    // 3일 후 만료되는 구독 조회
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(threeDaysFromNow);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const expiringSubscriptions = await db.getExpiringSubscriptions(
      threeDaysFromNow.getTime(),
      nextDay.getTime()
    );
    
    console.log(`[Scheduler] Found ${expiringSubscriptions.length} expiring subscriptions`);
    
    for (const subscription of expiringSubscriptions) {
      // 자동 갱신이 켜져 있으면 알림 스킵
      if (subscription.autoRenew) {
        continue;
      }
      
      // 이미 알림을 보냈는지 확인
      const alreadyNotified = await db.hasNotificationLog(
        subscription.userId,
        "subscription_expiring",
        new Date().toISOString().split("T")[0]
      );
      
      if (alreadyNotified) {
        continue;
      }
      
      if (subscription.endDate) {
        await notifySubscriptionExpiring(
          subscription.userId,
          subscription.planType,
          new Date(subscription.endDate)
        );
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error checking expiring subscriptions:", error);
  }
}
