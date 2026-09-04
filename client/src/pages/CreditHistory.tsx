import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  RefreshCw,
  ShoppingCart,
  MessageSquare,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function CreditHistory() {
  const { user } = useAuth();
  const { data: creditData, isLoading: creditLoading } = trpc.freeLimit.check.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: historyData, isLoading: historyLoading } = trpc.freeLimit.history.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case "use":
        return <MessageSquare className="h-4 w-4 text-red-500" />;
      case "bonus":
        return <Gift className="h-4 w-4 text-purple-500" />;
      case "refund":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "expire":
        return <Calendar className="h-4 w-4 text-gray-500" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">구매</Badge>;
      case "use":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">사용</Badge>;
      case "bonus":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">보너스</Badge>;
      case "refund":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">환불</Badge>;
      case "expire":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">만료</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">크레딧 내역</h1>
          <p className="text-muted-foreground">크레딧 충전 및 사용 내역을 확인하세요.</p>
        </div>

        {/* 크레딧 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-200">현재 크레딧</CardDescription>
            </CardHeader>
            <CardContent>
              {creditLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <Coins className="h-6 w-6 text-amber-400" />
                  <span className="text-3xl font-bold text-amber-400">
                    {creditData?.remaining ?? 0}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-200">총 구매</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                  <span className="text-3xl font-bold text-green-400">
                    {historyData?.stats.totalPurchased ?? 0}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-200">총 사용</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-6 w-6 text-red-400" />
                  <span className="text-3xl font-bold text-red-400">
                    {historyData?.stats.totalUsed ?? 0}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-200">보너스 크레딧</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <Gift className="h-6 w-6 text-purple-400" />
                  <span className="text-3xl font-bold text-purple-400">
                    {historyData?.stats.totalBonus ?? 0}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 크레딧 충전 안내 */}
        {(creditData?.remaining ?? 0) < 5 && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Coins className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">크레딧이 부족합니다</p>
                  <p className="text-sm text-muted-foreground">
                    첫 결제 시 20% 보너스 크레딧을 드립니다!
                  </p>
                </div>
              </div>
              <Link href="/pricing">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                  크레딧 충전하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 내역 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>상세 내역</CardTitle>
            <CardDescription>최근 50건의 크레딧 변동 내역입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : historyData?.history.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">아직 크레딧 내역이 없습니다.</p>
                <Link href="/pricing">
                  <Button variant="outline" className="mt-4">
                    크레딧 충전하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {historyData?.history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getTypeIcon(record.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(record.type)}
                          <span className="font-medium">
                            {record.description || "크레딧 변동"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          record.amount > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {record.amount > 0 ? "+" : ""}
                        {record.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        잔액: {record.balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
