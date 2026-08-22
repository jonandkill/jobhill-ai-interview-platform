/**
 * 키움페이 통합결제 API 헬퍼 (공식 명세 기반 재구현)
 * 
 * 2단계 프로세스:
 * 1. Step 1: POST /pay/ready → RETURNURL + TOKEN 획득
 * 2. Step 2: POST RETURNURL → 실제 결제 요청
 */

import { ENV } from "./env";

// API URL
const API_URL = {
  production: "https://api.kiwoompay.co.kr/pay/ready",
  test: "https://apitest.kiwoompay.co.kr/pay/ready",
};

// 결제수단 타입
export type PayMethod = 
  | "CARD-SUGI"        // 신용카드(수기결제)
  | "CARD-KEYGEN"      // 신용카드(월 자동 키 발행)
  | "CARD-BATCH"       // 신용카드(월 자동 연장결제)
  | "CARDK-SUGI"       // 신용카드K(수기결제)
  | "CARDK-KEYGEN"     // 신용카드K(월 자동 키 발행)
  | "CARDK-BATCH"      // 신용카드K(월 자동 연장결제)
  | "MOBILE-BATCH"     // 휴대폰(월 자동 연장결제)
  | "KT-BATCH"         // 폰빌(월 자동 연장결제)
  | "KAKAOPAY"         // 카카오페이
  | "VACCOUNT-ISSUE";  // 가상계좌 발행

// 과금 유형
export type BillType = "1" | "2";
// 1: 일반, 2: 월자동

// Step 1 요청 (Ready)
export interface KiwoompayReadyRequest {
  CPID: string;
  PAYMETHOD: PayMethod;
}

// Step 1 응답 (Ready)
export interface KiwoompayReadyResponse {
  RETURNURL?: string;
  TOKEN?: string;
  RESULTCODE?: string;
  ERRORMESSAGE?: string;
}

// Step 2 요청 (Payment)
export interface KiwoompayPaymentRequest {
  CPID: string;
  PAYMETHOD: PayMethod;
  TOKEN: string;
  ORDERNO: string;
  PRODUCTTYPE: string;
  BILLTYPE: BillType;
  AMOUNT: string;
  PRODUCTNAME: string;
  IPADDRESS: string;
  USERID: string;
  EMAIL?: string;
  USERNAME?: string;
  PRODUCTCODE?: string;
}

// Step 2 응답 (Payment)
export interface KiwoompayPaymentResponse {
  TOKEN?: string;
  PAYMETHOD?: string;
  RESULTCODE: string;
  ERRORMESSAGE?: string;
  DAOUTRX?: string;
  AMOUNT?: string;
  ORDERNO?: string;
  AUTHDATE?: string;
  AUTHNO?: string;
  CARDCODE?: string;
  AUTOKEY?: string;
}

// 결제 API URL 반환
export function getPaymentApiUrl(): string {
  const mode = ENV.kiwoompayMode || "test";
  return mode === "production" ? API_URL.production : API_URL.test;
}

// 가맹점 ID 반환
export function getMerchantId(): string {
  return ENV.kiwoompayMerchantId;
}

// 운영/테스트 모드 확인
export function isProductionMode(): boolean {
  return ENV.kiwoompayMode === "production";
}

/**
 * Step 1: 결제 준비 요청 (Ready)
 * 키움페이로부터 RETURNURL과 TOKEN을 획득합니다.
 */
export async function createPaymentReady(
  payMethod: PayMethod
): Promise<KiwoompayReadyResponse> {
  const apiUrl = getPaymentApiUrl();
  const authKey = ENV.kiwoompayAuthKey || "";
  const cpid = ENV.kiwoompayMerchantId;

  if (!authKey) {
    throw new Error("KIWOOMPAY_AUTH_KEY is not configured");
  }

  if (!cpid) {
    throw new Error("KIWOOMPAY_MERCHANT_ID is not configured");
  }

  try {
    const requestBody: KiwoompayReadyRequest = {
      CPID: cpid,
      PAYMETHOD: payMethod,
    };

    console.log("[Kiwoompay] Step 1 Ready Request:", {
      url: apiUrl,
      body: requestBody,
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=EUC-KR",
        "Authorization": authKey,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    console.log("[Kiwoompay] Step 1 Ready Response:", result);

    if (result.RESULTCODE !== "0000") {
      throw new Error(
        `Kiwoompay Ready API failed: ${result.ERRORMESSAGE || "Unknown error"}`
      );
    }

    return result as KiwoompayReadyResponse;
  } catch (error) {
    console.error("[Kiwoompay] Step 1 Ready Request Failed:", error);
    throw error;
  }
}

/**
 * Step 2: 실제 결제 요청
 * Step 1에서 받은 RETURNURL로 결제 요청을 보냅니다.
 */
export async function submitPayment(
  returnUrl: string,
  token: string,
  paymentData: Omit<KiwoompayPaymentRequest, "CPID" | "PAYMETHOD" | "TOKEN">
): Promise<KiwoompayPaymentResponse> {
  const authKey = ENV.kiwoompayAuthKey || "";
  const cpid = ENV.kiwoompayMerchantId;
  const payMethod = paymentData.PRODUCTTYPE === "1" ? "CARD-SUGI" : "CARD-KEYGEN";

  if (!authKey) {
    throw new Error("KIWOOMPAY_AUTH_KEY is not configured");
  }

  try {
    const requestBody: KiwoompayPaymentRequest = {
      CPID: cpid,
      PAYMETHOD: payMethod as PayMethod,
      TOKEN: token,
      ...paymentData,
    };

    console.log("[Kiwoompay] Step 2 Payment Request:", {
      url: returnUrl,
      body: requestBody,
    });

    const response = await fetch(returnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=EUC-KR",
        "Authorization": authKey,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    console.log("[Kiwoompay] Step 2 Payment Response:", result);

    return result as KiwoompayPaymentResponse;
  } catch (error) {
    console.error("[Kiwoompay] Step 2 Payment Request Failed:", error);
    throw error;
  }
}

// 결제 결과 검증
export function isPaymentSuccess(result: KiwoompayPaymentResponse): boolean {
  return result.RESULTCODE === "0000";
}

// 결제 결과 코드 매핑
export const RESULT_CODES: Record<string, string> = {
  "0000": "결제 성공",
  "0001": "결제 실패",
  "0002": "사용자 취소",
  "0003": "시스템 오류",
  "0004": "인증 실패",
  "0005": "한도 초과",
  "9011": "파이프라인 문자 사용 오류",
};

export function getResultMessage(code: string): string {
  return RESULT_CODES[code] || `알 수 없는 오류 (코드: ${code})`;
}

// 주문번호 생성
export function generateOrderNo(prefix: string = "ORD"): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 결제 완료 데이터 파싱
export interface KiwoompayWebhookData {
  RESULTCODE: string;
  ERRORMESSAGE?: string;
  DAOUTRX: string;
  AMOUNT: string;
  ORDERNO: string;
  AUTHDATE: string;
  PAYMETHOD: string;
  CARDNAME?: string;
  CARDNO?: string;
  QUOTA?: string;
  CPID: string;
  BUYERNAME?: string;
  BUYEREMAIL?: string;
  AUTOKEY?: string;
}
