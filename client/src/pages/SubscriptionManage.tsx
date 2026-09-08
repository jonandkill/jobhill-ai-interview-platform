import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Calendar, RefreshCw, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function SubscriptionManage() {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: subscription, isLoading, refetch } = trpc.tossPayment.getSubscription.useQuery();

  const toggleAutoRenewMutation = trpc.tossPayment.toggleAutoRenew.useMutation({
    onSuccess: (data) => {
      toast.success(data.autoRenew ? "자동 갱신이 활성화되었습니다." : "자동 갱신이 비활성화되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "설정 변경에 실패했습니다.");
    },
  });

  const deleteBillingKeyMutation = trpc.tossPayment.deleteBillingKey.useMutation({
    onSuccess: () => {
      toast.success("구독이 해지되었습니다.");
      setShowCancelDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "구독 해지에 실패했습니다.");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />활성</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" />체험중</Badge>;
      case "cancelled":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />해지됨</Badge>;
      case "past_due":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />결제 실패</Badge>;
      case "expired":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />만료됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case "basic":
        return "베이직";
      case "premium":
        return "프리미엄";
      case "premium_plus":
        return "프리미엄+";
      default:
        return planType;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="container max-w-2xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">활성 구독이 없습니다</h2>
              <p className="text-muted-foreground mb-6">
                구독을 시작하고 무제한 면접 연습을 즐겨보세요.
              </p>
              <Link href="/pricing">
                <Button>요금제 보기</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            구독 관리
          </h1>
          <p className="text-muted-foreground mt-2">
            구독 상태를 확인하고 관리할 수 있습니다.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {getPlanName(subscription.planType)} 플랜
                </CardTitle>
                <CardDescription>
                  월 {subscription.amount.toLocaleString()}원
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">시작일</span>
                </div>
                <p className="font-semibold">{formatDate(subscription.startDate)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">종료일</span>
                </div>
                <p className="font-semibold">{formatDate(subscription.endDate)}</p>
              </div>
            </div>

            {subscription.nextBillingDate && subscription.status === "active" && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">다음 결제일</span>
                </div>
                <p className="font-semibold">{formatDate(subscription.nextBillingDate)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.amount.toLocaleString()}원이 자동 결제됩니다.
                </p>
              </div>
            )}

            {subscription.tossBillingKey && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">자동 갱신</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.autoRenew 
                      ? "다음 결제일에 자동으로 결제됩니다." 
                      : "자동 갱신이 비활성화되었습니다."}
                  </p>
                </div>
                <Switch
                  checked={subscription.autoRenew ?? true}
                  onCheckedChange={(checked) => {
                    toggleAutoRenewMutation.mutate({
                      subscriptionId: subscription.id,
                      autoRenew: checked,
                    });
                  }}
                  disabled={toggleAutoRenewMutation.isPending}
                />
              </div>
            )}

            {subscription.status === "active" && subscription.tossBillingKey && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  구독 해지
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link href="/payment-history">
            <Button variant="outline">결제 내역 보기</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline">플랜 변경</Button>
          </Link>
        </div>

        {/* 구독 해지 다이얼로그 */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>구독 해지</DialogTitle>
              <DialogDescription>
                정말 구독을 해지하시겠습니까?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">주의사항</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                      <li>• 구독 해지 시 등록된 결제 수단이 삭제됩니다.</li>
                      <li>• 현재 구독 기간({formatDate(subscription.endDate)})까지는 서비스를 이용할 수 있습니다.</li>
                      <li>• 해지 후에도 언제든 다시 구독할 수 있습니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteBillingKeyMutation.mutate({
                    subscriptionId: subscription.id,
                  });
                }}
                disabled={deleteBillingKeyMutation.isPending}
              >
                {deleteBillingKeyMutation.isPending ? "처리 중..." : "구독 해지"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
