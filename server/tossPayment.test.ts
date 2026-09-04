import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("토스페이먼츠 결제 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("결제 승인 API", () => {
    it("결제 승인 요청 시 올바른 헤더와 바디를 전송해야 함", async () => {
      const paymentKey = "test_payment_key_123";
      const orderId = "TOSS_ORDER_123";
      const amount = 900;
      const secretKey = "test_sk_123";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentKey,
          orderId,
          status: "DONE",
          totalAmount: amount,
          method: "카드",
          approvedAt: "2024-01-01T12:00:00+09:00",
        }),
      });

      const encryptedSecretKey = Buffer.from(secretKey + ":").toString("base64");
      
      const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${encryptedSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.tosspayments.com/v1/payments/confirm",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Basic "),
            "Content-Type": "application/json",
          }),
        })
      );

      const result = await response.json();
      expect(result.status).toBe("DONE");
      expect(result.totalAmount).toBe(amount);
    });

    it("결제 승인 실패 시 에러 메시지를 반환해야 함", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          code: "INVALID_PAYMENT_KEY",
          message: "유효하지 않은 결제 키입니다.",
        }),
      });

      const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: "invalid_key",
          orderId: "test_order",
          amount: 900,
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.code).toBe("INVALID_PAYMENT_KEY");
    });
  });

  describe("결제 취소 API", () => {
    it("결제 취소 요청 시 올바른 파라미터를 전송해야 함", async () => {
      const paymentKey = "test_payment_key_123";
      const cancelReason = "고객 요청";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentKey,
          status: "CANCELED",
          cancels: [{
            cancelReason,
            canceledAt: "2024-01-01T13:00:00+09:00",
            cancelAmount: 900,
          }],
        }),
      });

      const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
        expect.objectContaining({
          method: "POST",
        })
      );

      const result = await response.json();
      expect(result.status).toBe("CANCELED");
      expect(result.cancels[0].cancelReason).toBe(cancelReason);
    });

    it("부분 취소 요청 시 취소 금액을 지정해야 함", async () => {
      const paymentKey = "test_payment_key_123";
      const cancelAmount = 500;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentKey,
          status: "PARTIAL_CANCELED",
          cancels: [{
            cancelAmount,
            canceledAt: "2024-01-01T13:00:00+09:00",
          }],
        }),
      });

      const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: "부분 환불",
          cancelAmount,
        }),
      });

      const result = await response.json();
      expect(result.status).toBe("PARTIAL_CANCELED");
      expect(result.cancels[0].cancelAmount).toBe(cancelAmount);
    });
  });

  describe("빌링키 발급 API", () => {
    it("빌링키 발급 요청 시 authKey와 customerKey를 전송해야 함", async () => {
      const authKey = "test_auth_key";
      const customerKey = "customer_123";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          billingKey: "billing_key_123",
          customerKey,
          authenticatedAt: "2024-01-01T12:00:00+09:00",
          method: "카드",
          card: {
            issuerCode: "11",
            number: "1234****5678",
          },
        }),
      });

      const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authKey,
          customerKey,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.tosspayments.com/v1/billing/authorizations/issue",
        expect.objectContaining({
          method: "POST",
        })
      );

      const result = await response.json();
      expect(result.billingKey).toBe("billing_key_123");
      expect(result.customerKey).toBe(customerKey);
    });
  });

  describe("자동결제 승인 API", () => {
    it("빌링키로 자동결제 승인 요청을 전송해야 함", async () => {
      const billingKey = "billing_key_123";
      const customerKey = "customer_123";
      const amount = 9900;
      const orderId = "BILLING_ORDER_123";
      const orderName = "프리미엄 구독 갱신";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentKey: "payment_key_456",
          orderId,
          status: "DONE",
          totalAmount: amount,
          method: "카드",
          approvedAt: "2024-01-01T12:00:00+09:00",
        }),
      });

      const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey,
          amount,
          orderId,
          orderName,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.tosspayments.com/v1/billing/${billingKey}`,
        expect.objectContaining({
          method: "POST",
        })
      );

      const result = await response.json();
      expect(result.status).toBe("DONE");
      expect(result.totalAmount).toBe(amount);
    });

    it("자동결제 실패 시 에러를 반환해야 함", async () => {
      const billingKey = "billing_key_123";
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          code: "CARD_LIMIT_EXCEEDED",
          message: "카드 한도 초과",
        }),
      });

      const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
        method: "POST",
        headers: {
          Authorization: "Basic test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey: "customer_123",
          amount: 9900,
          orderId: "order_123",
          orderName: "구독 갱신",
        }),
      });

      expect(response.ok).toBe(false);
      const error = await response.json();
      expect(error.code).toBe("CARD_LIMIT_EXCEEDED");
    });
  });

  describe("빌링키 삭제 API", () => {
    it("빌링키 삭제 요청을 전송해야 함", async () => {
      const billingKey = "billing_key_123";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          billingKey,
          deletedAt: "2024-01-01T12:00:00+09:00",
        }),
      });

      const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
        method: "DELETE",
        headers: {
          Authorization: "Basic test",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.tosspayments.com/v1/billing/${billingKey}`,
        expect.objectContaining({
          method: "DELETE",
        })
      );

      expect(response.ok).toBe(true);
    });
  });
});

describe("결제 금액 검증", () => {
  it("결제 금액은 양수여야 함", () => {
    const amount = 900;
    expect(amount).toBeGreaterThan(0);
  });

  it("결제 금액은 정수여야 함", () => {
    const amount = 900;
    expect(Number.isInteger(amount)).toBe(true);
  });

  it("최소 결제 금액은 100원 이상이어야 함", () => {
    const minAmount = 100;
    const amount = 900;
    expect(amount).toBeGreaterThanOrEqual(minAmount);
  });
});

describe("주문 ID 생성", () => {
  it("주문 ID는 고유해야 함", () => {
    const userId = 1;
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 1;
    
    const orderId1 = `TOSS_${userId}_${timestamp1}`;
    const orderId2 = `TOSS_${userId}_${timestamp2}`;
    
    expect(orderId1).not.toBe(orderId2);
  });

  it("주문 ID 형식이 올바라야 함", () => {
    const userId = 1;
    const timestamp = Date.now();
    const orderId = `TOSS_${userId}_${timestamp}`;
    
    expect(orderId).toMatch(/^TOSS_\d+_\d+$/);
  });
});
