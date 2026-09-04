/**
 * 키움페이 환불 API 헬퍼
 * 결제 취소 및 환불 처리
 */

import { ENV } from "./env";

// API URL
const API_URL = {
  production: "https://api.kiwoompay.co.kr/pay/cancel",
  test: "https://apitest.kiwoompay.co.kr/pay/cancel",
};

export interface KiwoompayRefundRequest {
  orderId: string; // 원거래 주문번호
  trxId: string; // 키움페이 거래번호 (DAOUTRX)
  amount?: number; // 환불 금액 (부분 환불 시)
  reason?: string; // 환불 사유
}

export interface KiwoompayRefundResponse {
  RESULTCODE: string;
  ERRORMESSAGE?: string;
  ORDERNO?: string;
  DAOUTRX?: string; // 원거래 거래번호
  CANCELTRX?: string; // 취소 거래번호
  CANCELAMOUNT?: string; // 취소 금액
  CANCELDATE?: string; // 취소 일시
}

/**
 * 환불 API URL 반환
 */
export function getRefundApiUrl(): string {
  const mode = ENV.kiwoompayMode || "test";
  return mode === "production" ? API_URL.production : API_URL.test;
}

/**
 * 키움페이 환불 요청 데이터 생성
 */
export function createRefundData(
  request: KiwoompayRefundRequest
): Record<string, string> {
  return {
    CPID: ENV.kiwoompayMerchantId,
    ORDERNO: request.orderId,
    DAOUTRX: request.trxId,
    CANCELAMOUNT: request.amount ? String(request.amount) : "",
    REASON: request.reason || "고객 요청",
    AUTHKEY: ENV.kiwoompayAuthKey,
  };
}

/**
 * 키움페이 환불 API 호출
 */
export async function requestRefund(
  request: KiwoompayRefundRequest
): Promise<KiwoompayRefundResponse> {
  const apiUrl = getRefundApiUrl();
  const refundData = createRefundData(request);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(refundData).toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as KiwoompayRefundResponse;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[Kiwoompay Refund] API 호출 실패:", errorMessage);
    throw new Error(`키움페이 환불 API 호출 실패: ${errorMessage}`);
  }
}

/**
 * 환불 결과 검증
 */
export function isRefundSuccess(result: KiwoompayRefundResponse): boolean {
  return result.RESULTCODE === "0000";
}

/**
 * 환불 결과 코드 매핑
 */
export const REFUND_RESULT_CODES: Record<string, string> = {
  "0000": "환불 성공",
  "0001": "환불 실패",
  "0002": "거래 없음",
  "0003": "이미 취소됨",
  "0004": "취소 불가능한 상태",
  "0005": "환불 금액 초과",
  "0006": "부분 환불 불가",
  "0007": "시스템 오류",
  "0008": "인증 실패",
  "0009": "한도 초과",
  "0010": "거래 기간 만료",
};

/**
 * 환불 결과 메시지 반환
 */
export function getRefundResultMessage(resultCode: string): string {
  return REFUND_RESULT_CODES[resultCode] || `알 수 없는 오류 (${resultCode})`;
}

/**
 * 부분 환불 가능 여부 확인
 */
export function isPartialRefundAllowed(): boolean {
  // 키움페이는 부분 환불을 지원하지만, 설정에 따라 제한될 수 있음
  return true;
}

/**
 * 환불 가능 기간 확인 (일반적으로 결제 후 180일)
 */
export function isRefundWithinAllowedPeriod(
  paymentDate: Date,
  maxDaysAfterPayment: number = 180
): boolean {
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysDiff <= maxDaysAfterPayment;
}
