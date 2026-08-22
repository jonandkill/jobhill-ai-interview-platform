import { describe, it, expect } from "vitest";

describe("토스페이먼츠 API 키 검증", () => {
  it("VITE_TOSS_CLIENT_KEY 환경변수가 올바른 형식이어야 함", () => {
    const clientKey = process.env.VITE_TOSS_CLIENT_KEY;
    expect(clientKey).toBeDefined();
    expect(clientKey).not.toBe("");
    // 테스트 키는 test_ck_ 또는 test_gck_로 시작, 라이브 키는 live_ck_ 또는 live_gck_로 시작
    expect(clientKey).toMatch(/^(test_|live_)(ck_|gck_)/);
    console.log("VITE_TOSS_CLIENT_KEY 형식 확인:", clientKey?.substring(0, 15) + "...");
  });

  it("TOSS_SECRET_KEY 환경변수가 올바른 형식이어야 함", () => {
    const secretKey = process.env.TOSS_SECRET_KEY;
    expect(secretKey).toBeDefined();
    expect(secretKey).not.toBe("");
    // 테스트 키는 test_sk_ 또는 test_gsk_로 시작, 라이브 키는 live_sk_ 또는 live_gsk_로 시작
    expect(secretKey).toMatch(/^(test_|live_)(sk_|gsk_)/);
    console.log("TOSS_SECRET_KEY 형식 확인:", secretKey?.substring(0, 15) + "...");
  });

  it("토스페이먼츠 API 인증 테스트", async () => {
    const secretKey = process.env.TOSS_SECRET_KEY;
    
    if (!secretKey) {
      console.log("TOSS_SECRET_KEY가 설정되지 않아 테스트를 건너뜁니다.");
      return;
    }

    // Basic 인증 헤더 생성
    const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
    
    // 토스페이먼츠 API에 인증 테스트 (존재하지 않는 결제 조회 - 인증만 확인)
    const response = await fetch("https://api.tosspayments.com/v1/payments/test_invalid_key", {
      method: "GET",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    // 404는 결제가 없다는 의미 (인증은 성공)
    // 401은 인증 실패
    // 403은 권한 없음
    console.log("API 응답 상태:", response.status);
    
    if (response.status === 401) {
      const errorData = await response.json();
      console.error("인증 실패:", errorData);
      throw new Error("토스페이먼츠 API 인증 실패: 시크릿 키가 올바르지 않습니다.");
    }
    
    // 인증이 성공하면 404 (결제 없음) 또는 다른 상태 코드
    expect(response.status).not.toBe(401);
    console.log("토스페이먼츠 API 인증 성공!");
  });
});
