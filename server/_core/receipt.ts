import { ENV } from "./env";
import { notifyOwner } from "./notification";

// 영수증 데이터 인터페이스
export interface ReceiptData {
  paymentId: number;
  orderId: string;
  productName: string;
  amount: number;
  paymentMethod: string;
  cardName?: string;
  cardNo?: string;
  installment?: number;
  authDate: string;
  buyerName: string;
  buyerEmail: string;
  transactionId: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizePlainText(value: unknown, maxLength = 240): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function maskCardNumber(value: unknown): string {
  const digits = String(value ?? "").match(/\d/g) ?? [];
  const lastFour = digits.slice(-4).join("");
  return lastFour ? `•••• ${lastFour}` : "마스킹됨";
}

function renderBusinessFooter(): string {
  const identity = [
    ENV.businessRepresentative && `대표: ${escapeHtml(ENV.businessRepresentative)}`,
    ENV.businessRegistrationNumber &&
      `사업자등록번호: ${escapeHtml(ENV.businessRegistrationNumber)}`,
  ].filter(Boolean);
  const contact = [
    ENV.businessAddress && escapeHtml(ENV.businessAddress),
    ENV.businessPhone && `전화: ${escapeHtml(ENV.businessPhone)}`,
    ENV.businessEmail && `이메일: ${escapeHtml(ENV.businessEmail)}`,
  ].filter(Boolean);

  return [
    ENV.businessName && `<p><strong>${escapeHtml(ENV.businessName)}</strong></p>`,
    identity.length > 0 && `<p>${identity.join(" | ")}</p>`,
    contact.length > 0 && `<p>${contact.join(" | ")}</p>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function sanitizeFilenamePart(value: unknown): string {
  const sanitized = String(value ?? "")
    .replace(/[^A-Za-z0-9가-힣_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return sanitized || "payment";
}

// 영수증 HTML 템플릿 생성
export function generateReceiptHtml(data: ReceiptData): string {
  const formattedAmount = new Intl.NumberFormat("ko-KR").format(data.amount);
  const formattedDate = formatAuthDate(data.authDate);
  const paymentMethodText = getPaymentMethodText(data.paymentMethod);
  const installment = Number.isFinite(data.installment)
    ? Math.max(0, Math.trunc(data.installment ?? 0))
    : 0;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <title>결제 영수증 - ${escapeHtml(data.orderId)}</title>
  <style>
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .receipt-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .receipt-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .receipt-header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: 600;
    }
    .receipt-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .receipt-body {
      padding: 30px;
    }
    .receipt-section {
      margin-bottom: 25px;
    }
    .receipt-section h3 {
      font-size: 14px;
      color: #666;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .receipt-row:last-child {
      border-bottom: none;
    }
    .receipt-label {
      color: #666;
      font-size: 14px;
    }
    .receipt-value {
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    .receipt-total {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .receipt-total .receipt-row {
      border-bottom: none;
    }
    .receipt-total .receipt-label {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .receipt-total .receipt-value {
      font-size: 24px;
      font-weight: 700;
      color: #c9a227;
    }
    .receipt-footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .receipt-footer p {
      margin: 5px 0;
    }
    .success-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>결제 완료</h1>
      <p>AI 면접 코치 서비스</p>
      <span class="success-badge">✓ 결제 성공</span>
    </div>
    
    <div class="receipt-body">
      <div class="receipt-section">
        <h3>주문 정보</h3>
        <div class="receipt-row">
          <span class="receipt-label">주문번호</span>
          <span class="receipt-value">${escapeHtml(data.orderId)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">거래번호</span>
          <span class="receipt-value">${escapeHtml(data.transactionId)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">결제일시</span>
          <span class="receipt-value">${escapeHtml(formattedDate)}</span>
        </div>
      </div>
      
      <div class="receipt-section">
        <h3>상품 정보</h3>
        <div class="receipt-row">
          <span class="receipt-label">상품명</span>
          <span class="receipt-value">${escapeHtml(data.productName)}</span>
        </div>
      </div>
      
      <div class="receipt-section">
        <h3>결제 정보</h3>
        <div class="receipt-row">
          <span class="receipt-label">결제수단</span>
          <span class="receipt-value">${escapeHtml(paymentMethodText)}</span>
        </div>
        ${data.cardName ? `
        <div class="receipt-row">
          <span class="receipt-label">카드사</span>
          <span class="receipt-value">${escapeHtml(data.cardName)}</span>
        </div>
        ` : ''}
        ${data.cardNo ? `
        <div class="receipt-row">
          <span class="receipt-label">카드번호</span>
          <span class="receipt-value">${escapeHtml(maskCardNumber(data.cardNo))}</span>
        </div>
        ` : ''}
        ${installment > 0 ? `
        <div class="receipt-row">
          <span class="receipt-label">할부</span>
          <span class="receipt-value">${installment}개월</span>
        </div>
        ` : ''}
      </div>
      
      <div class="receipt-section">
        <h3>구매자 정보</h3>
        <div class="receipt-row">
          <span class="receipt-label">이름</span>
          <span class="receipt-value">${escapeHtml(data.buyerName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">이메일</span>
          <span class="receipt-value">${escapeHtml(data.buyerEmail)}</span>
        </div>
      </div>
      
      <div class="receipt-total">
        <div class="receipt-row">
          <span class="receipt-label">결제 금액</span>
          <span class="receipt-value">₩${escapeHtml(formattedAmount)}</span>
        </div>
      </div>
    </div>
    
    <div class="receipt-footer">
      ${renderBusinessFooter()}
      <p style="margin-top: 15px; color: #999;">
        본 영수증은 전자상거래법에 따른 전자영수증입니다.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// 결제 수단 텍스트 변환
function getPaymentMethodText(method: string): string {
  const methodMap: Record<string, string> = {
    "CARD": "신용카드",
    "KAKAOPAY": "카카오페이",
    "MOBILE": "휴대폰 결제",
    "VACCOUNT": "가상계좌",
  };
  return methodMap[method] || method;
}

// 승인일시 포맷팅 (YYYYMMDDHHMMSS -> YYYY-MM-DD HH:MM:SS)
function formatAuthDate(authDate: string): string {
  if (!authDate || authDate.length < 14) return authDate;
  
  const year = authDate.substring(0, 4);
  const month = authDate.substring(4, 6);
  const day = authDate.substring(6, 8);
  const hour = authDate.substring(8, 10);
  const minute = authDate.substring(10, 12);
  const second = authDate.substring(12, 14);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 영수증 이메일 발송 (관리자에게 알림)
export async function sendReceiptNotification(data: ReceiptData): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat("ko-KR").format(data.amount);
  const productName = sanitizePlainText(data.productName);
  
  const content = `
새로운 결제가 완료되었습니다.

📋 주문 정보
- 주문번호: ${sanitizePlainText(data.orderId)}
- 거래번호: ${sanitizePlainText(data.transactionId)}
- 상품명: ${productName}
- 결제금액: ₩${formattedAmount}
- 결제수단: ${sanitizePlainText(getPaymentMethodText(data.paymentMethod))}
${data.cardName ? `- 카드사: ${sanitizePlainText(data.cardName)}` : ''}

👤 구매자 정보
- 이름: ${sanitizePlainText(data.buyerName)}
- 이메일: ${sanitizePlainText(data.buyerEmail)}

결제일시: ${sanitizePlainText(formatAuthDate(data.authDate))}
`;

  return await notifyOwner({
    title: `💳 새 결제 완료: ${productName}`,
    content,
  });
}

// 영수증 다운로드용 데이터 생성
export function generateReceiptDownloadData(data: ReceiptData): {
  filename: string;
  content: string;
  contentType: string;
} {
  return {
    filename: `receipt_${sanitizeFilenamePart(data.orderId)}.html`,
    content: generateReceiptHtml(data),
    contentType: "text/html; charset=utf-8",
  };
}
