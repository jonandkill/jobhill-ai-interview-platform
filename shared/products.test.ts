import { describe, expect, it } from "vitest";
import { isPaymentProductType, PAYMENT_PRODUCTS } from "./products";

describe("payment product catalog", () => {
  it("uses one authoritative positive integer price per product", () => {
    for (const product of Object.values(PAYMENT_PRODUCTS)) {
      expect(Number.isInteger(product.price)).toBe(true);
      expect(product.price).toBeGreaterThan(0);
    }
  });

  it("rejects inherited and unknown product names", () => {
    expect(isPaymentProductType("premium")).toBe(true);
    expect(isPaymentProductType("toString")).toBe(false);
    expect(isPaymentProductType("enterprise" as string)).toBe(false);
  });
});
