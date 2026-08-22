import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Ticket, 
  TrendingUp, 
  Clock, 
  Users, 
  BarChart3,
  Gift,
  Calendar,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function AdminCouponStats() {
  const { data: stats, isLoading: statsLoading } = trpc.coupon.stats.useQuery();
  const { data: usageHistory, isLoading: historyLoading } = trpc.coupon.usageHistory.useQuery();
  
  if (statsLoading || historyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            쿠폰 통계 대시보드
          </h1>
          <p className="text-muted-foreground mt-1">
            쿠폰 사용 현황과 통계를 한눈에 확인하세요
          </p>
        </div>
        
        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 쿠폰</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCoupons || 0}개</div>
              <p className="text-xs text-muted-foreground">
                활성: {stats?.activeCoupons || 0}개
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 사용 횟수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsages || 0}회</div>
              <p className="text-xs text-muted-foreground">
                누적 사용자 수
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지급된 무료 시간</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFreeHoursGiven || 0}시간</div>
              <p className="text-xs text-muted-foreground">
                총 지급 시간
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 사용률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.couponUsageRates && stats.couponUsageRates.length > 0
                  ? Math.round(stats.couponUsageRates.reduce((sum, c) => sum + c.usageRate, 0) / stats.couponUsageRates.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                쿠폰 소진율
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* 월별 사용 추이 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              월별 쿠폰 사용 추이
            </CardTitle>
            <CardDescription>최근 6개월간 쿠폰 사용 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.usageByMonth && stats.usageByMonth.length > 0 ? (
              <div className="space-y-4">
                {stats.usageByMonth.map((item) => {
                  const maxCount = Math.max(...stats.usageByMonth.map(m => m.count), 1);
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.month}</span>
                        <span className="text-muted-foreground">{item.count}회</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                아직 사용 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 쿠폰별 사용률 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              쿠폰별 사용률
            </CardTitle>
            <CardDescription>각 쿠폰의 사용 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.couponUsageRates && stats.couponUsageRates.length > 0 ? (
              <div className="space-y-4">
                {stats.couponUsageRates.map((coupon) => (
                  <div key={coupon.code} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {coupon.code}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {coupon.description || "설명 없음"}
                        </span>
                      </div>
                      <Badge variant={coupon.usageRate >= 80 ? "destructive" : coupon.usageRate >= 50 ? "secondary" : "default"}>
                        {coupon.usageRate}% 사용
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress value={coupon.usageRate} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{coupon.currentUses} / {coupon.maxUses || "∞"} 사용</span>
                        <span>{coupon.freeHours}시간 지급</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                등록된 쿠폰이 없습니다
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 최근 사용 내역 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              최근 쿠폰 사용 내역
            </CardTitle>
            <CardDescription>최근 100건의 쿠폰 사용 기록</CardDescription>
          </CardHeader>
          <CardContent>
            {usageHistory && usageHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">쿠폰 코드</th>
                      <th className="text-left py-3 px-2">사용자 ID</th>
                      <th className="text-left py-3 px-2">지급 시간</th>
                      <th className="text-left py-3 px-2">사용일시</th>
                      <th className="text-left py-3 px-2">만료일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageHistory.map((usage) => (
                      <tr key={usage.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="font-mono">
                            {usage.couponCode}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          #{usage.userId}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary">{usage.freeHours}시간</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {formatDate(usage.usedAt)}
                        </td>
                        <td className="py-3 px-2">
                          {usage.expiresAt && new Date(usage.expiresAt) > new Date() ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {formatDate(usage.expiresAt)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-3 h-3" />
                              만료됨
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                아직 사용 내역이 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
