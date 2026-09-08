import { afterEach, describe, expect, it } from "vitest";

import { ENV } from "./_core/env";
import {
  generateReceiptDownloadData,
  generateReceiptHtml,
  type ReceiptData,
} from "./_core/receipt";

const originalBusinessIdentity = {
  businessName: ENV.businessName,
  businessRepresentative: ENV.businessRepresentative,
  businessRegistrationNumber: ENV.businessRegistrationNumber,
  businessAddress: ENV.businessAddress,
  businessPhone: ENV.businessPhone,
  businessEmail: ENV.businessEmail,
};

const receipt: ReceiptData = {
  paymentId: 1,
  orderId: "order-1",
  productName: "면접 이용권",
  amount: 10_000,
  paymentMethod: "CARD",
  cardName: "테스트 카드",
  cardNo: "1234 5678 9012 3456",
  installment: 0,
  authDate: "20260823120000",
  buyerName: "테스트 사용자",
  buyerEmail: "user@example.com",
  transactionId: "transaction-1",
};

afterEach(() => {
  Object.assign(ENV, originalBusinessIdentity);
});

describe("payment receipt hardening", () => {
  it("escapes untrusted receipt and business identity fields", () => {
    ENV.businessName = '<img src=x onerror="alert(1)">';
    ENV.businessEmail = 'support@example.com"><script>alert(1)</script>';

    const html = generateReceiptHtml({
      ...receipt,
      orderId: '<script>alert("order")</script>',
      productName: '<img src=x onerror="alert(2)">',
      buyerName: "<b>buyer</b>",
      buyerEmail: 'buyer@example.com"><svg onload="alert(3)">',
      transactionId: "<iframe src=evil>",
    });

    expect(html).not.toContain('<script>alert("order")</script>');
    expect(html).not.toContain('<img src=x onerror="alert(2)">');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("default-src 'none'");
  });

  it("never renders a full card number", () => {
    const html = generateReceiptHtml(receipt);

    expect(html).not.toContain(receipt.cardNo);
    expect(html).toContain("•••• 3456");
  });

  it("creates a traversal-safe download filename", () => {
    const download = generateReceiptDownloadData({
      ...receipt,
      orderId: "../../ 거래/123",
    });

    expect(download.filename).toBe("receipt_거래_123.html");
    expect(download.filename).not.toContain("..");
    expect(download.contentType).toBe("text/html; charset=utf-8");
  });
});
