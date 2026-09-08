import { notifyOwner } from './notification';

/**
 * 크레딧 환불 시 사용자에게 알림을 전송합니다
 * @param userName 사용자 이름
 * @param userEmail 사용자 이메일
 * @param amount 환불 크레딧 수량
 * @param reason 환불 사유
 * @param sessionId 관련 세션 ID (선택)
 */
export async function sendRefundNotification(params: {
  userName: string;
  userEmail?: string;
  amount: number;
  reason: string;
  sessionId?: number;
}): Promise<boolean> {
  const { userName, userEmail, amount, reason, sessionId } = params;

  const title = `크레딧 환불 알림 - ${userName}님`;
  const content = `
안녕하세요, ${userName}님

면접 중 오류가 발생하여 크레딧이 자동으로 환불되었습니다.

**환불 내역:**
- 환불 크레딧: ${amount}개
- 환불 사유: ${reason}
${sessionId ? `- 세션 ID: #${sessionId}` : ''}
${userEmail ? `- 이메일: ${userEmail}` : ''}

환불된 크레딧은 즉시 계정에 반영되었으며, 언제든지 다시 사용하실 수 있습니다.

불편을 드려 죄송합니다. 더 나은 서비스를 제공하기 위해 노력하겠습니다.

감사합니다.
AI 면접 코치 팀
  `.trim();

  try {
    // 관리자에게 알림 전송 (사용자 이메일 발송 기능 추가 시 여기에 구현)
    await notifyOwner({ title, content });
    
    // TODO: 사용자에게 직접 이메일 발송 (이메일 서비스 통합 필요)
    // if (userEmail) {
    //   await sendEmail({
    //     to: userEmail,
    //     subject: title,
    //     body: content,
    //   });
    // }
    
    return true;
  } catch (error) {
    console.error('[RefundNotification] 알림 전송 실패:', error);
    return false;
  }
}
