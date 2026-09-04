/**
 * 키움페이 결제 웹훅 처리
 * 결제 완료, 실패, 자동 갱신 등의 이벤트 처리
 */

import crypto from "crypto";
import { ENV } from "./env";

export interface KiwoompayWebhookPayload {
  RESULTCODE: string;
  ERRORMESSAGE?: string;
  ORDERNO: string;
  DAOUTRX?: string; // 거래번호
  AMOUNT?: string;
  PAYMETHOD?: string;
  AUTHDATE?: string;
  AUTHNO?: string;
  CARDCODE?: string;
  AUTOKEY?: string; // 월자동결제 키
  GENDATE?: string; // 월 자동 키 발행 일시
  USERID?: string;
  PRODUCTNAME?: string;
  SIGNATURE?: string; // 웹훅 서명
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  orderId: string;
  resultCode: string;
}

/**
 * 웹훅 서명 검증
 * 키움페이에서 전송한 웹훅의 무결성을 확인
 */
export function verifyWebhookSignature(
  payload: KiwoompayWebhookPayload
): WebhookVerificationResult {
  try {
    const webhookKey = ENV.kiwoompayWebhookKey;
    if (!webhookKey) {
      return {
        isValid: false,
        error: "웹훅 키가 설정되지 않았습니다.",
      };
    }

    const signature = payload.SIGNATURE;
    if (!signature) {
      return {
        isValid: false,
        error: "웹훅 서명이 없습니다.",
      };
    }

    // 서명 생성 (ORDERNO + DAOUTRX + AMOUNT + RESULTCODE + 웹훅키)
    const signatureData = `${payload.ORDERNO}${payload.DAOUTRX || ""}${payload.AMOUNT || ""}${payload.RESULTCODE}${webhookKey}`;
    const expectedSignature = crypto
      .createHash("sha256")
      .update(signatureData)
      .digest("hex");

    if (signature !== expectedSignature) {
      return {
        isValid: false,
        error: "웹훅 서명이 일치하지 않습니다.",
      };
    }

    return { isValid: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      error: `서명 검증 중 오류: ${errorMessage}`,
    };
  }
}

/**
 * 웹훅 이벤트 타입 판단
 */
export function getWebhookEventType(
  payload: KiwoompayWebhookPayload
): "payment_success" | "payment_failed" | "auto_renewal" | "unknown" {
  if (payload.RESULTCODE !== "0000") {
    return "payment_failed";
  }

  // 월자동결제 키가 있으면 자동 갱신
  if (payload.AUTOKEY) {
    return "auto_renewal";
  }

  return "payment_success";
}

/**
 * 웹훅 페이로드 검증
 */
export function validateWebhookPayload(
  payload: KiwoompayWebhookPayload
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.ORDERNO) {
    errors.push("주문번호(ORDERNO)가 없습니다.");
  }

  if (!payload.RESULTCODE) {
    errors.push("결과코드(RESULTCODE)가 없습니다.");
  }

  if (payload.RESULTCODE === "0000") {
    if (!payload.DAOUTRX) {
      errors.push("거래번호(DAOUTRX)가 없습니다.");
    }
    if (!payload.AMOUNT) {
      errors.push("금액(AMOUNT)이 없습니다.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 웹훅 처리 (결제 완료)
 */
export async function processPaymentSuccessWebhook(
  payload: KiwoompayWebhookPayload
): Promise<WebhookProcessResult> {
  try {
    console.log(
      `[Kiwoompay Webhook] 결제 완료: 주문번호=${payload.ORDERNO}, 거래번호=${payload.DAOUTRX}`
    );

    // 1. 데이터베이스에서 결제 정보 조회
    // 2. 결제 상태 업데이트 (pending -> completed)
    // 3. 이용권 추가 또는 구독 생성
    // 4. 사용자에게 알림 전송

    return {
      success: true,
      message: "결제 완료 처리됨",
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Kiwoompay Webhook] 결제 완료 처리 실패: ${errorMessage}`
    );
    return {
      success: false,
      message: `결제 완료 처리 실패: ${errorMessage}`,
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  }
}

/**
 * 웹훅 처리 (결제 실패)
 */
export async function processPaymentFailedWebhook(
  payload: KiwoompayWebhookPayload
): Promise<WebhookProcessResult> {
  try {
    console.log(
      `[Kiwoompay Webhook] 결제 실패: 주문번호=${payload.ORDERNO}, 오류=${payload.ERRORMESSAGE}`
    );

    // 1. 데이터베이스에서 결제 정보 조회
    // 2. 결제 상태 업데이트 (pending -> failed)
    // 3. 사용자에게 실패 알림 전송
    // 4. 재시도 옵션 제공

    return {
      success: true,
      message: "결제 실패 처리됨",
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Kiwoompay Webhook] 결제 실패 처리 실패: ${errorMessage}`
    );
    return {
      success: false,
      message: `결제 실패 처리 실패: ${errorMessage}`,
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  }
}

/**
 * 웹훅 처리 (자동 갱신)
 */
export async function processAutoRenewalWebhook(
  payload: KiwoompayWebhookPayload
): Promise<WebhookProcessResult> {
  try {
    console.log(
      `[Kiwoompay Webhook] 자동 갱신: 주문번호=${payload.ORDERNO}, 자동키=${payload.AUTOKEY}`
    );

    // 1. 데이터베이스에서 구독 정보 조회
    // 2. 결제 기록 생성
    // 3. 구독 갱신 날짜 업데이트
    // 4. 사용자에게 갱신 완료 알림 전송

    return {
      success: true,
      message: "자동 갱신 처리됨",
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Kiwoompay Webhook] 자동 갱신 처리 실패: ${errorMessage}`
    );
    return {
      success: false,
      message: `자동 갱신 처리 실패: ${errorMessage}`,
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  }
}

/**
 * 웹훅 처리 (통합)
 */
export async function processWebhook(
  payload: KiwoompayWebhookPayload
): Promise<WebhookProcessResult> {
  // 1. 페이로드 검증
  const validation = validateWebhookPayload(payload);
  if (!validation.isValid) {
    return {
      success: false,
      message: `페이로드 검증 실패: ${validation.errors.join(", ")}`,
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  }

  // 2. 서명 검증
  const signatureVerification = verifyWebhookSignature(payload);
  if (!signatureVerification.isValid) {
    return {
      success: false,
      message: signatureVerification.error || "서명 검증 실패",
      orderId: payload.ORDERNO,
      resultCode: payload.RESULTCODE,
    };
  }

  // 3. 이벤트 타입 판단
  const eventType = getWebhookEventType(payload);

  // 4. 이벤트 처리
  switch (eventType) {
    case "payment_success":
      return await processPaymentSuccessWebhook(payload);
    case "payment_failed":
      return await processPaymentFailedWebhook(payload);
    case "auto_renewal":
      return await processAutoRenewalWebhook(payload);
    default:
      return {
        success: false,
        message: "알 수 없는 이벤트 타입",
        orderId: payload.ORDERNO,
        resultCode: payload.RESULTCODE,
      };
  }
}
