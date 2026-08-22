export const PAYMENT_PRODUCTS = {
  single: {
    name: "텍스트 면접 1회",
    description: "AI 면접 1회(5문항)와 구조화 피드백",
    price: 900,
    originalPrice: 1200,
    paymentType: "single",
  },
  single_voice: {
    name: "음성·카메라 면접 1회",
    description: "음성 답변과 카메라 셀프뷰, 구조화 피드백",
    price: 1530,
    originalPrice: 2000,
    paymentType: "single",
  },
  basic: {
    name: "베이직 플랜 (월간)",
    description: "월 10회 면접과 기본 피드백",
    price: 9900,
    originalPrice: 12000,
    paymentType: "subscription",
  },
  premium: {
    name: "프리미엄 플랜 (월간)",
    description: "무제한 면접과 상세 피드백, 음성·카메라 면접",
    price: 19900,
    originalPrice: 25000,
    paymentType: "subscription",
  },
  premium_plus: {
    name: "프리미엄 플러스 (월간)",
    description: "무제한 면접과 1:1 컨설팅, 전체 기능",
    price: 29900,
    originalPrice: 39000,
    paymentType: "subscription",
  },
} as const;

export type PaymentProductType = keyof typeof PAYMENT_PRODUCTS;

export function isPaymentProductType(value: string): value is PaymentProductType {
  return Object.prototype.hasOwnProperty.call(PAYMENT_PRODUCTS, value);
}
