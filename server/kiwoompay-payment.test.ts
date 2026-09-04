import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaymentData,
  createSubscriptionPaymentData,
  createBatchPaymentData,
  isPaymentSuccess,
  getResultMessage,
  generateOrderNo,
} from "./_core/kiwoompay";

describe("키움페이 결제 시스템", () => {
  describe("결제 데이터 생성", () => {
    it("건당 결제 데이터를 올바르게 생성해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_123",
          amount: 3900,
          productName: "AI 모의면접 1회",
          userId: "1",
          userEmail: "test@example.com",
          userName: "테스트사용자",
          payMethod: "CARD",
        },
        "http://localhost:3000"
      );

      expect(paymentData.ORDERNO).toBe("ORDER_123");
      expect(paymentData.AMOUNT).toBe("3900");
      expect(paymentData.BILLTYPE).toBe("1"); // 일반 결제
      expect(paymentData.PAYMETHOD).toBe("CARD-SUGI"); // 신용카드 수기결제
      expect(paymentData.PRODUCTNAME).toBe("AI 모의면접 1회");
      expect(paymentData.USERID).toBe("1");
      expect(paymentData.EMAIL).toBe("test@example.com");
      expect(paymentData.USERNAME).toBe("테스트사용자");
    });

    it("구독 결제 데이터를 올바르게 생성해야 함", () => {
      const paymentData = createSubscriptionPaymentData(
        {
          orderId: "SUB_123",
          amount: 19900,
          productName: "프리미엄 구독 (1개월)",
          userId: "2",
          userEmail: "premium@example.com",
          userName: "프리미엄사용자",
        },
        "http://localhost:3000"
      );

      expect(paymentData.ORDERNO).toBe("SUB_123");
      expect(paymentData.AMOUNT).toBe("19900");
      expect(paymentData.BILLTYPE).toBe("2"); // 월자동
      expect(paymentData.PAYMETHOD).toBe("CARD-KEYGEN"); // 신용카드 월 자동 키 발행
      expect(paymentData.DIRECT_YN).toBe("Y"); // 키 발행 후 바로 결제
      expect(paymentData.PRODUCTNAME).toBe("프리미엄 구독 (1개월)");
    });

    it("자동 갱신 결제 데이터를 올바르게 생성해야 함", () => {
      const autoKey = "AUTO_KEY_12345";
      const paymentData = createBatchPaymentData(
        autoKey,
        {
          orderId: "BATCH_123",
          amount: 19900,
          productName: "프리미엄 구독 (자동 갱신)",
          userId: "2",
        }
      );

      expect(paymentData.AUTOKEY).toBe(autoKey);
      expect(paymentData.ORDERNO).toBe("BATCH_123");
      expect(paymentData.AMOUNT).toBe("19900");
      expect(paymentData.BILLTYPE).toBe("2"); // 월자동
      expect(paymentData.PAYMETHOD).toBe("CARD-BATCH"); // 신용카드 월 자동 연장결제
    });

    it("다양한 결제 수단을 지원해야 함", () => {
      const cardPayment = createPaymentData(
        {
          orderId: "ORDER_CARD",
          amount: 5900,
          productName: "음성면접",
          userId: "1",
          payMethod: "CARD",
        },
        "http://localhost:3000"
      );
      expect(cardPayment.PAYMETHOD).toBe("CARD-SUGI");

      const kakaoPayment = createPaymentData(
        {
          orderId: "ORDER_KAKAO",
          amount: 5900,
          productName: "음성면접",
          userId: "1",
          payMethod: "KAKAOPAY",
        },
        "http://localhost:3000"
      );
      expect(kakaoPayment.PAYMETHOD).toBe("KAKAOPAY");

      const mobilePayment = createPaymentData(
        {
          orderId: "ORDER_MOBILE",
          amount: 5900,
          productName: "음성면접",
          userId: "1",
          payMethod: "MOBILE",
        },
        "http://localhost:3000"
      );
      expect(mobilePayment.PAYMETHOD).toBe("MOBILE-BATCH");

      const vacountPayment = createPaymentData(
        {
          orderId: "ORDER_VACC",
          amount: 5900,
          productName: "음성면접",
          userId: "1",
          payMethod: "VACCOUNT",
        },
        "http://localhost:3000"
      );
      expect(vacountPayment.PAYMETHOD).toBe("VACCOUNT-ISSUE");
    });
  });

  describe("결제 결과 검증", () => {
    it("성공 결과 코드를 올바르게 인식해야 함", () => {
      const successResult = {
        RESULTCODE: "0000",
        DAOUTRX: "12345",
        AMOUNT: "3900",
      };
      expect(isPaymentSuccess(successResult)).toBe(true);
    });

    it("실패 결과 코드를 올바르게 인식해야 함", () => {
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

    it("결과 메시지를 올바르게 반환해야 함", () => {
      expect(getResultMessage("0000")).toBe("결제 성공");
      expect(getResultMessage("0001")).toBe("결제 실패");
      expect(getResultMessage("0002")).toBe("사용자 취소");
      expect(getResultMessage("0003")).toBe("시스템 오류");
      expect(getResultMessage("0004")).toBe("인증 실패");
      expect(getResultMessage("0005")).toBe("한도 초과");
      expect(getResultMessage("9999")).toContain("알 수 없는 오류");
    });
  });

  describe("주문번호 생성", () => {
    it("고유한 주문번호를 생성해야 함", () => {
      const orderNo1 = generateOrderNo("ORD");
      const orderNo2 = generateOrderNo("ORD");

      expect(orderNo1).toMatch(/^ORD\d{14}[A-Z0-9]{6}$/);
      expect(orderNo2).toMatch(/^ORD\d{14}[A-Z0-9]{6}$/);
      expect(orderNo1).not.toBe(orderNo2); // 서로 다른 주문번호
    });

    it("커스텀 접두사를 지원해야 함", () => {
      const subOrderNo = generateOrderNo("SUB");
      const batchOrderNo = generateOrderNo("BATCH");

      expect(subOrderNo).toMatch(/^SUB\d{14}[A-Z0-9]{6}$/);
      expect(batchOrderNo).toMatch(/^BATCH\d{14}[A-Z0-9]{6}$/);
    });

    it("기본 접두사 'ORD'를 사용해야 함", () => {
      const orderNo = generateOrderNo();
      expect(orderNo).toMatch(/^ORD\d{14}[A-Z0-9]{6}$/);
    });
  });

  describe("결제 금액 검증", () => {
    it("건당 결제 금액이 올바르게 설정되어야 함", () => {
      const singlePayment = createPaymentData(
        {
          orderId: "ORDER_SINGLE",
          amount: 3900,
          productName: "AI 모의면접 1회",
          userId: "1",
        },
        "http://localhost:3000"
      );
      expect(singlePayment.AMOUNT).toBe("3900");

      const voicePayment = createPaymentData(
        {
          orderId: "ORDER_VOICE",
          amount: 5900,
          productName: "AI 음성면접 1회",
          userId: "1",
        },
        "http://localhost:3000"
      );
      expect(voicePayment.AMOUNT).toBe("5900");
    });

    it("구독 결제 금액이 올바르게 설정되어야 함", () => {
      const basicSub = createSubscriptionPaymentData(
        {
          orderId: "SUB_BASIC",
          amount: 9900,
          productName: "베이직 구독",
          userId: "1",
        },
        "http://localhost:3000"
      );
      expect(basicSub.AMOUNT).toBe("9900");

      const premiumSub = createSubscriptionPaymentData(
        {
          orderId: "SUB_PREMIUM",
          amount: 19900,
          productName: "프리미엄 구독",
          userId: "1",
        },
        "http://localhost:3000"
      );
      expect(premiumSub.AMOUNT).toBe("19900");

      const premiumPlusSub = createSubscriptionPaymentData(
        {
          orderId: "SUB_PREMIUM_PLUS",
          amount: 29900,
          productName: "프리미엄 플러스 구독",
          userId: "1",
        },
        "http://localhost:3000"
      );
      expect(premiumPlusSub.AMOUNT).toBe("29900");
    });
  });

  describe("메타데이터 설정", () => {
    it("사용자 정보를 올바르게 저장해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_123",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "42",
          userEmail: "user@example.com",
          userName: "홍길동",
        },
        "http://localhost:3000"
      );

      expect(paymentData.USERID).toBe("42");
      expect(paymentData.EMAIL).toBe("user@example.com");
      expect(paymentData.USERNAME).toBe("홍길동");
    });

    it("디지털 상품 타입을 설정해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_123",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "1",
        },
        "http://localhost:3000"
      );

      expect(paymentData.PRODUCTTYPE).toBe("1"); // 디지털 상품
    });

    it("비과세 상품으로 설정해야 함", () => {
      const paymentData = createPaymentData(
        {
          orderId: "ORDER_123",
          amount: 3900,
          productName: "AI 모의면접",
          userId: "1",
        },
        "http://localhost:3000"
      );

      expect(paymentData.TAXFREECD).toBe("00"); // 과세
    });
  });
});
