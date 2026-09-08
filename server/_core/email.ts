import { ENV } from "./env";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * 이메일 발송 함수
 * Manus Forge API의 이메일 서비스를 사용합니다.
 * 
 * @param payload 이메일 페이로드 (수신자, 제목, 내용)
 * @returns 발송 성공 여부
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[Email] Forge API 설정이 없어 이메일을 발송할 수 없습니다.");
    return false;
  }

  try {
    const endpoint = `${ENV.forgeApiUrl}/webdevtoken.v1.WebDevService/SendEmail`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.forgeApiKey}`,
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || stripHtml(payload.html),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Email] 발송 실패 (${response.status}): ${detail}`);
      return false;
    }

    console.log(`[Email] 발송 성공: ${payload.to}`);
    return true;
  } catch (error) {
    console.error("[Email] 발송 오류:", error);
    return false;
  }
}

/**
 * HTML 태그 제거하여 텍스트 버전 생성
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 이메일 인증 메일 템플릿 생성
 */
export function createEmailVerificationTemplate(params: {
  userName: string;
  verificationUrl: string;
  appName?: string;
}): string {
  const { userName, verificationUrl, appName = "JOB HILL" } = params;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 인증</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <h1 style="margin: 0; color: #c9a227; font-size: 24px; font-weight: bold;">${appName}</h1>
        <p style="margin: 10px 0 0; color: #ffffff; font-size: 14px;">이메일 인증이 필요합니다</p>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
          안녕하세요, <strong>${userName}</strong>님!
        </p>
        
        <p style="margin: 0 0 30px; color: #555; font-size: 14px; line-height: 1.6;">
          ${appName} 서비스를 이용해 주셔서 감사합니다.<br>
          아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
        </p>
        
        <!-- 인증 버튼 -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);">
                ✅ 이메일 인증하기
              </a>
            </td>
          </tr>
        </table>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
            <strong>⚠️ 주의사항</strong><br>
            • 인증 링크는 24시간 동안 유효합니다<br>
            • 본인이 요청하지 않았다면 이 메일을 무시하세요
          </p>
        </div>
        
        <p style="margin: 20px 0 0; color: #888; font-size: 13px;">
          버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣어 주세요:<br>
          <a href="${verificationUrl}" style="color: #c9a227; word-break: break-all;">${verificationUrl}</a>
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.<br>
          문의: support@jobandkill.com
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 알림 이메일 템플릿 생성
 */
export function createNotificationEmailTemplate(params: {
  userName: string;
  title: string;
  content: string;
  appName?: string;
}): string {
  const { userName, title, content, appName = "JOB HILL" } = params;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <h1 style="margin: 0; color: #c9a227; font-size: 24px; font-weight: bold;">${appName}</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
          안녕하세요, <strong>${userName}</strong>님!
        </p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #c9a227; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 10px; color: #1a1a2e; font-size: 18px;">${title}</h2>
          <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</p>
        </div>
        
        <p style="margin: 30px 0 0; color: #888; font-size: 13px;">
          이 메일은 ${appName}에서 발송되었습니다.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
