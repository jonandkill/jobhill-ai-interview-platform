import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaymentData,
  createSubscriptionPaymentData,
  createBatchPaymentData,
  createPaymentReady,
  isPaymentSuccess,
} from "./_core/kiwoompay";

/**
 * 키움페이 결제 통합 테스트
 * 실제 결제 플로우를 시뮬레이션하고 검증합니다.
 */
describe("키움페이 결제 통합 테스트", () => {
  describe("건당 결제 플로우 (텍스트 모드)", () => {
    it("텍스트 모의면접 결제 데이터를 생성해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_TEXT_001",
          amount: 3900,
          productName: "AI 모의면접 1회",
          userId: "user_123",
          userEmail: "user@example.com",
          userName: "테스트사용자",
          payMethod: "CARD",
        },
        "http://localhost:3000"
      );

      expect(paymentData).toMatchObject({
        ORDERNO: "ORDER_TEXT_001",
        AMOUNT: "3900",
        BILLTYPE: "1", // 일반 결제
        PAYMETHOD: "CARD-SUGI",
        PRODUCTNAME: "AI 모의면접 1회",
        USERID: "user_123",
        EMAIL: "user@example.com",
        USERNAME: "테스트사용자",
      });

      // 필수 필드 확인
      expect(paymentData.CPID).toBeDefined();
      // RETURNURL, CANCELURL은 createPaymentReady() 호출 시 추가됨
    });

    it("다양한 텍스트 결제 패키지를 지원해야 함", () => {
      const packages = [
        { amount: 3900, name: "AI 모의면접 1회" },
        { amount: 9900, name: "AI 모의면접 3회" },
        { amount: 19900, name: "AI 모의면접 10회" },
      ];

      packages.forEach(({ amount, name }) => {
        const paymentData = createPaymentData(
          {
            orderId: `ORDER_${Date.now()}`,
            amount,
            productName: name,
            userId: "user_123",
          },
          "http://localhost:3000"
        );

        expect(paymentData.AMOUNT).toBe(String(amount));
        expect(paymentData.PRODUCTNAME).toBe(name);
      });
    });
  });

  describe("건당 결제 플로우 (음성 모드)", () => {
    it("음성 모의면접 결제 데이터를 생성해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_VOICE_001",
          amount: 5900,
          productName: "AI 음성면접 1회",
          userId: "user_456",
          userEmail: "voice@example.com",
          userName: "음성사용자",
          payMethod: "CARD",
        },
        "http://localhost:3000"
      );

      expect(paymentData).toMatchObject({
        ORDERNO: "ORDER_VOICE_001",
        AMOUNT: "5900",
        BILLTYPE: "1",
        PAYMETHOD: "CARD-SUGI",
        PRODUCTNAME: "AI 음성면접 1회",
      });
    });

    it("다양한 음성 결제 패키지를 지원해야 함", () => {
      const voicePackages = [
        { amount: 5900, name: "AI 음성면접 1회" },
        { amount: 14900, name: "AI 음성면접 3회" },
        { amount: 29900, name: "AI 음성면접 10회" },
      ];

      voicePackages.forEach(({ amount, name }) => {
        const paymentData = createPaymentData(
          {
            orderId: `ORDER_VOICE_${Date.now()}`,
            amount,
            productName: name,
            userId: "user_456",
            payMethod: "CARD",
          },
          "http://localhost:3000"
        );

        expect(paymentData.AMOUNT).toBe(String(amount));
        expect(paymentData.PRODUCTNAME).toBe(name);
      });
    });
  });

  describe("구독 결제 플로우", () => {
    it("베이직 구독 결제 데이터를 생성해야 함", () => {
      const paymentData = createSubscriptionPaymentData(
        {
          orderId: "SUB_BASIC_001",
          amount: 9900,
          productName: "베이직 구독 (1개월)",
          userId: "user_789",
          userEmail: "basic@example.com",
          userName: "베이직사용자",
        },
        "http://localhost:3000"
      );

      expect(paymentData).toMatchObject({
        ORDERNO: "SUB_BASIC_001",
        AMOUNT: "9900",
        BILLTYPE: "2", // 월자동
        PAYMETHOD: "CARD-KEYGEN", // 신용카드 월 자동 키 발행
        PRODUCTNAME: "베이직 구독 (1개월)",
        DIRECT_YN: "Y", // 키 발행 후 바로 결제
      });
    });

    it("프리미엄 구독 결제 데이터를 생성해야 함", () => {
      const paymentData = createSubscriptionPaymentData(
        {
          orderId: "SUB_PREMIUM_001",
          amount: 19900,
          productName: "프리미엄 구독 (1개월)",
          userId: "user_789",
          userEmail: "premium@example.com",
          userName: "프리미엄사용자",
        },
        "http://localhost:3000"
      );

      expect(paymentData).toMatchObject({
        ORDERNO: "SUB_PREMIUM_001",
        AMOUNT: "19900",
        BILLTYPE: "2",
        PAYMETHOD: "CARD-KEYGEN",
      });
    });

    it("프리미엄 플러스 구독 결제 데이터를 생성해야 함", () => {
      const paymentData = createSubscriptionPaymentData(
        {
          orderId: "SUB_PREMIUM_PLUS_001",
          amount: 29900,
          productName: "프리미엄 플러스 구독 (1개월)",
          userId: "user_789",
          userEmail: "premium_plus@example.com",
          userName: "프리미엄플러스사용자",
        },
        "http://localhost:3000"
      );

      expect(paymentData).toMatchObject({
        ORDERNO: "SUB_PREMIUM_PLUS_001",
        AMOUNT: "29900",
        BILLTYPE: "2",
        PAYMETHOD: "CARD-KEYGEN",
      });
    });

    it("모든 구독 플랜이 자동 키 발행을 지원해야 함", () => {
      const plans = [
        { amount: 9900, name: "베이직" },
        { amount: 19900, name: "프리미엄" },
        { amount: 29900, name: "프리미엄 플러스" },
      ];

      plans.forEach(({ amount, name }) => {
        const paymentData = createSubscriptionPaymentData(
          {
            orderId: `SUB_${name}_${Date.now()}`,
            amount,
            productName: `${name} 구독 (1개월)`,
            userId: "user_789",
          },
          "http://localhost:3000"
        );

        expect(paymentData.PAYMETHOD).toBe("CARD-KEYGEN");
        expect(paymentData.DIRECT_YN).toBe("Y");
      });
    });
  });

  describe("자동 갱신 결제 플로우", () => {
    it("자동 갱신 결제 데이터를 생성해야 함", () => {
      const autoKey = "AUTO_KEY_BASIC_12345";
      const paymentData = createBatchPaymentData(
        autoKey,
        {
          orderId: "BATCH_BASIC_001",
          amount: 9900,
          productName: "베이직 구독 (자동 갱신)",
          userId: "user_789",
        }
      );

      expect(paymentData).toMatchObject({
        AUTOKEY: autoKey,
        ORDERNO: "BATCH_BASIC_001",
        AMOUNT: "9900",
        BILLTYPE: "2",
        PAYMETHOD: "CARD-BATCH", // 신용카드 월 자동 연장결제
      });
    });

    it("모든 구독 플랜의 자동 갱신을 지원해야 함", () => {
      const plans = [
        { autoKey: "AUTO_KEY_BASIC_001", amount: 9900, name: "베이직" },
        { autoKey: "AUTO_KEY_PREMIUM_001", amount: 19900, name: "프리미엄" },
        {
          autoKey: "AUTO_KEY_PREMIUM_PLUS_001",
          amount: 29900,
          name: "프리미엄 플러스",
        },
      ];

      plans.forEach(({ autoKey, amount, name }) => {
        const paymentData = createBatchPaymentData(
          autoKey,
          {
            orderId: `BATCH_${name}_${Date.now()}`,
            amount,
            productName: `${name} 구독 (자동 갱신)`,
            userId: "user_789",
          }
        );

        expect(paymentData.AUTOKEY).toBe(autoKey);
        expect(paymentData.PAYMETHOD).toBe("CARD-BATCH");
        expect(paymentData.AMOUNT).toBe(String(amount));
      });
    });
  });

  describe("결제 수단 지원", () => {
    it("신용카드 결제를 지원해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_CARD",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "user_123",
          payMethod: "CARD",
        },
        "http://localhost:3000"
      );

      expect(paymentData.PAYMETHOD).toBe("CARD-SUGI");
    });

    it("카카오페이 결제를 지원해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_KAKAO",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "user_123",
          payMethod: "KAKAOPAY",
        },
        "http://localhost:3000"
      );

      expect(paymentData.PAYMETHOD).toBe("KAKAOPAY");
    });

    it("모바일 결제를 지원해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_MOBILE",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "user_123",
          payMethod: "MOBILE",
        },
        "http://localhost:3000"
      );

      expect(paymentData.PAYMETHOD).toBe("MOBILE-BATCH");
    });

    it("가상계좌 결제를 지원해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_VACC",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "user_123",
          payMethod: "VACCOUNT",
        },
        "http://localhost:3000"
      );

      expect(paymentData.PAYMETHOD).toBe("VACCOUNT-ISSUE");
    });
  });

  describe("결제 결과 처리", () => {
    it("성공 결과를 올바르게 인식해야 함", () => {
      const successResults = [
        { RESULTCODE: "0000", DAOUTRX: "12345", AMOUNT: "3900" },
        { RESULTCODE: "0000", DAOUTRX: "67890", AMOUNT: "9900" },
      ];

      successResults.forEach((result) => {
        expect(isPaymentSuccess(result)).toBe(true);
      });
    });

    it("실패 결과를 올바르게 인식해야 함", () => {
      const failureResults = [
        { RESULTCODE: "0001" }, // 결제 실패
        { RESULTCODE: "0002" }, // 사용자 취소
        { RESULTCODE: "0003" }, // 시스템 오류
        { RESULTCODE: "0004" }, // 인증 실패
        { RESULTCODE: "0005" }, // 한도 초과
      ];

      failureResults.forEach((result) => {
        expect(isPaymentSuccess(result)).toBe(false);
      });
    });
  });

  describe("결제 금액 검증", () => {
    it("텍스트 결제 금액이 올바르게 설정되어야 함", () => {
      const amounts = [3900, 9900, 19900];

      amounts.forEach((amount) => {
        const paymentData = createPaymentData(
          {
            orderId: `ORDER_${amount}`,
            amount,
            productName: "AI 모의면접",
            userId: "user_123",
          },
          "http://localhost:3000"
        );

        expect(paymentData.AMOUNT).toBe(String(amount));
      });
    });

    it("음성 결제 금액이 올바르게 설정되어야 함", () => {
      const amounts = [5900, 14900, 29900];

      amounts.forEach((amount) => {
        const paymentData = createPaymentData(
          {
            orderId: `ORDER_VOICE_${amount}`,
            amount,
            productName: "AI 음성면접",
            userId: "user_456",
          },
          "http://localhost:3000"
        );

        expect(paymentData.AMOUNT).toBe(String(amount));
      });
    });

    it("구독 결제 금액이 올바르게 설정되어야 함", () => {
      const subscriptionAmounts = [9900, 19900, 29900];

      subscriptionAmounts.forEach((amount) => {
        const paymentData = createSubscriptionPaymentData(
          {
            orderId: `SUB_${amount}`,
            amount,
            productName: `구독 (${amount}원)`,
            userId: "user_789",
          },
          "http://localhost:3000"
        );

        expect(paymentData.AMOUNT).toBe(String(amount));
      });
    });
  });
});
