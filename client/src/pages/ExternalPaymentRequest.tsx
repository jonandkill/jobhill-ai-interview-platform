import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ExternalPaymentRequest() {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "basic" | "premium" | "premium_plus" | null>(null);
  const [externalPaymentId, setExternalPaymentId] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const { data: paymentLink } = trpc.paymentLink.getByPlan.useQuery(
    { planType: selectedPlan! },
    { enabled: !!selectedPlan }
  );

  const { data: myRequests, refetch } = trpc.paymentLink.myRequests.useQuery();

  const createRequestMutation = trpc.paymentLink.createRequest.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRequestDialog(false);
      setExternalPaymentId("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "결제 신청에 실패했습니다.");
    },
  });

  const cancelRequestMutation = trpc.paymentLink.cancelRequest.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "취소에 실패했습니다.");
    },
  });

  const plans = [
    {
      type: "monthly" as const,
      name: "AI 면접 코치 프로",
      price: 29900,
      originalPrice: 49900,
      description: "무제한 면접 연습 + AI 피드백",
      features: [
        "✅ 무제한 면접 연습",
        "✅ AI 맞춤형 질문 생성",
        "✅ 상세한 피드백 제공",
        "✅ 음성 면접 지원",
        "✅ 면접 통계 분석",
        "✅ 기업별 맞춤 준비",
        "✅ 언제든지 취소 가능",
      ],
      badge: "한정 특가",
    },
  ];

  const handlePlanSelect = (planType: typeof plans[0]["type"]) => {
    setSelectedPlan(planType);
    setShowRequestDialog(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedPlan) return;
    
    createRequestMutation.mutate({
      planType: selectedPlan,
      externalPaymentId: externalPaymentId || undefined,
    });
  };

  const handleOpenPaymentLink = () => {
    if (paymentLink?.externalUrl) {
      window.open(paymentLink.externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />승인 대기</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />승인 완료</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />거부됨</Badge>;
      case "cancelled":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />취소됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanName = (planType: string) => {
    const plan = plans.find(p => p.type === planType);
    return plan?.name || planType;
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">구독 신청</h1>
          <p className="text-muted-foreground">
            원하는 요금제를 선택하고 외부 결제를 완료한 후 신청해주세요.
          </p>
        </div>

        {/* 요금제 선택 */}
        <div className="flex justify-center mb-12">
          {plans.map((plan) => (
            <Card key={plan.type} className="relative hover:shadow-2xl transition-all max-w-lg w-full border-2 border-primary/50 glass-effect">
              {/* 배지 */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-gold to-orange-500 text-white px-4 py-1 text-sm font-bold">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                
                {/* 가격 */}
                <div className="mt-6">
                  {plan.originalPrice && (
                    <div className="text-lg text-muted-foreground line-through mb-1">
                      {plan.originalPrice.toLocaleString()}원
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold gradient-text">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-xl text-muted-foreground">원/월</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="mt-2 text-sm text-green-600 font-medium">
                      한달에 {(plan.originalPrice - plan.price).toLocaleString()}원 절감!
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <span className="mr-2 mt-0.5">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handlePlanSelect(plan.type)}
                  className="w-full btn-neon text-lg py-6"
                  size="lg"
                >
                  지금 시작하기
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  매월 자동 결제 • 언제든지 해지 가능
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 신청 내역 */}
        {myRequests && myRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>신청 내역</CardTitle>
              <CardDescription>결제 신청 및 승인 상태를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{getPlanName(request.planType)}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>금액: {request.amount.toLocaleString()}원</div>
                        <div>신청일: {new Date(request.createdAt).toLocaleDateString("ko-KR")}</div>
                        {request.approvedAt && (
                          <div>승인일: {new Date(request.approvedAt).toLocaleDateString("ko-KR")}</div>
                        )}
                        {request.rejectedReason && (
                          <div className="text-red-500 mt-1">거부 사유: {request.rejectedReason}</div>
                        )}
                      </div>
                    </div>
                    {request.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRequestMutation.mutate({ requestId: request.id })}
                        disabled={cancelRequestMutation.isPending}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 결제 신청 다이얼로그 */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>결제 신청</DialogTitle>
              <DialogDescription>
                외부 결제창에서 결제를 완료한 후 신청해주세요.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {paymentLink && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">결제 링크</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPaymentLink}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      결제창 열기
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    위 버튼을 클릭하여 외부 결제를 완료해주세요.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="externalPaymentId">결제 ID (선택사항)</Label>
                <Input
                  id="externalPaymentId"
                  placeholder="외부 결제 시스템의 결제 ID를 입력하세요"
                  value={externalPaymentId}
                  onChange={(e) => setExternalPaymentId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  결제 ID를 입력하면 승인이 더 빠르게 처리됩니다.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-800 mb-1">안내사항</p>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• 외부 결제 완료 후 신청해주세요</li>
                      <li>• 관리자 승인 후 이용 가능합니다</li>
                      <li>• 승인은 1-2일 소요됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                취소
              </Button>
              <Button 
                onClick={handleSubmitRequest}
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? "신청 중..." : "신청하기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
