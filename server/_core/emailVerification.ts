import { notifyOwner } from './notification';
import crypto from 'crypto';

/**
 * 이메일 인증 토큰 생성
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 이메일 인증 링크 생성
 * @param token 인증 토큰
 * @param baseUrl 프론트엔드 베이스 URL
 */
export function generateVerificationLink(token: string, baseUrl: string): string {
  return `${baseUrl}/verify-email?token=${token}`;
}

/**
 * 이메일 인증 메일 발송
 * @param email 수신자 이메일
 * @param name 수신자 이름
 * @param verificationLink 인증 링크
 */
export async function sendVerificationEmail(params: {
  email: string;
  name: string;
  verificationLink: string;
}): Promise<boolean> {
  const { email, name, verificationLink } = params;
  const { sendEmail, createEmailVerificationTemplate } = await import('./email');

  try {
    // 이메일 템플릿 생성
    const html = createEmailVerificationTemplate({
      userName: name,
      verificationUrl: verificationLink,
      appName: 'JOB HILL',
    });
    
    // 실제 이메일 발송
    const sent = await sendEmail({
      to: email,
      subject: '[JOB HILL] 이메일 인증을 완료해주세요',
      html,
    });
    
    if (sent) {
      console.log('[EmailVerification] 인증 이메일 발송 성공:', email);
      
      // 관리자에게 알림
      await notifyOwner({ 
        title: `신규 가입: ${email}`, 
        content: `${name}님이 가입했습니다. 인증 메일을 발송했습니다.` 
      });
    } else {
      console.error('[EmailVerification] 이메일 발송 실패:', email);
    }
    
    return sent;
  } catch (error) {
    console.error('[EmailVerification] 이메일 발송 오류:', error);
    return false;
  }
}

/**
 * 인증 토큰 유효성 검증
 * @param expiresAt 만료 시간
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}
