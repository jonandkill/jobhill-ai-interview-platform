import * as db from '../db';

/**
 * 마일스톤 보상 설정
 */
const MILESTONES = [
  { count: 5, hours: 0.5, description: '5회 완료 축하 보상' },
  { count: 10, hours: 1, description: '10회 완료 축하 보상' },
  { count: 20, hours: 2, description: '20회 완료 축하 보상' },
  { count: 50, hours: 3, description: '50회 완료 축하 보상' },
  { count: 100, hours: 5, description: '100회 완료 축하 보상' },
];

/**
 * 마일스톤 달성 체크 및 쿠폰 발급
 * @param userId 사용자 ID
 * @param completedInterviews 완료한 면접 횟수
 * @returns 발급된 쿠폰 정보 (없으면 null)
 */
export async function checkAndRewardMilestone(userId: number, completedInterviews: number): Promise<{
  milestone: number;
  hours: number;
  couponCode: string;
} | null> {
  // 사용자 정보 조회
  const user = await db.getUserById(userId);
  if (!user) return null;
  
  const lastMilestone = user.lastMilestoneReached || 0;
  
  // 달성한 마일스톤 찾기 (마지막 달성 이후)
  const achievedMilestone = MILESTONES.find(
    m => completedInterviews >= m.count && m.count > lastMilestone
  );
  
  if (!achievedMilestone) return null;
  
  // 쿠폰 생성
  const couponCode = `MILESTONE-${achievedMilestone.count}-${userId}-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료
  
  const coupon = await db.createCoupon({
    code: couponCode,
    description: `${achievedMilestone.description} (${user.name || user.openId})`,
    freeHours: achievedMilestone.hours,
    maxUses: 1,
    expiresAt,
    createdBy: userId,
  });
  
  // 쿠폰 자동 적용
  const couponExpiresAt = new Date();
  couponExpiresAt.setHours(couponExpiresAt.getHours() + achievedMilestone.hours);
  
  await db.createCouponUsage({
    couponId: coupon.id,
    userId,
    expiresAt: couponExpiresAt,
  });
  
  await db.incrementCouponUsage(coupon.id);
  await db.addUserFreeTime(userId, achievedMilestone.hours * 60);
  
  // 마일스톤 업데이트
  await db.updateUser(userId, {
    lastMilestoneReached: achievedMilestone.count,
  });
  
  console.log(`[Milestone] User ${userId} reached milestone ${achievedMilestone.count}, rewarded ${achievedMilestone.hours}h`);
  
  return {
    milestone: achievedMilestone.count,
    hours: achievedMilestone.hours,
    couponCode,
  };
}

/**
 * 다음 마일스톤까지 남은 횟수 조회
 */
export function getNextMilestone(completedInterviews: number): {
  nextMilestone: number;
  remaining: number;
  reward: number;
} | null {
  const nextMilestone = MILESTONES.find(m => completedInterviews < m.count);
  
  if (!nextMilestone) return null;
  
  return {
    nextMilestone: nextMilestone.count,
    remaining: nextMilestone.count - completedInterviews,
    reward: nextMilestone.hours,
  };
}
