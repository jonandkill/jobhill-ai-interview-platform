import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Receipt, RefreshCw, XCircle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PaymentHistory() {
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: payments, isLoading, refetch } = trpc.tossPayment.list.useQuery();
  const { data: canRefundData } = trpc.tossPayment.canRefund.useQuery(
    { paymentId: selectedPayment! },
    { enabled: !!selectedPayment }
  );

  const cancelMutation = trpc.tossPayment.cancel.useMutation({
    onSuccess: () => {
      toast.success("결제가 취소되었습니다.");
      setShowCancelDialog(false);
      setCancelReason("");
      setSelectedPayment(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "결제 취소에 실패했습니다.");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />결제 완료</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />실패</Badge>;
      case "refunded":
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />환불 완료</Badge>;
      case "partial_refunded":
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />부분 환불</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProductName = (productType: string | null) => {
    switch (productType) {
      case "single":
        return "텍스트 면접 1회";
      case "voice":
        return "음성 면접 1회";
      case "basic":
        return "베이직 구독";
      case "premium":
        return "프리미엄 구독";
      case "premium_plus":
        return "프리미엄+ 구독";
      default:
        return productType || "상품";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelClick = (paymentId: number) => {
    setSelectedPayment(paymentId);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = () => {
    if (!selectedPayment || !cancelReason.trim()) {
      toast.error("취소 사유를 입력해주세요.");
      return;
    }
    cancelMutation.mutate({
      paymentId: selectedPayment,
      cancelReason: cancelReason.trim(),
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

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            결제 내역
          </h1>
          <p className="text-muted-foreground mt-2">
            결제 내역을 확인하고 환불을 요청할 수 있습니다.
          </p>
        </div>

        {!payments || payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">결제 내역이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {getProductName(payment.productType)}
                      </CardTitle>
                      <CardDescription>
                        주문번호: {payment.kiwoompayOrderNo || "-"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">결제 금액</p>
                      <p className="font-semibold">{payment.amount.toLocaleString()}원</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">결제 방법</p>
                      <p className="font-semibold">{payment.paymentMethod || "카드"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">결제일</p>
                      <p className="font-semibold">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">결제 유형</p>
                      <p className="font-semibold">
                        {payment.paymentType === "subscription" ? "구독" : "건당 결제"}
                      </p>
                    </div>
                  </div>

                  {payment.cancelReason && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">취소 사유</p>
                      <p className="text-sm">{payment.cancelReason}</p>
                      {payment.canceledAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          취소일: {formatDate(payment.canceledAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {payment.status === "completed" && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClick(payment.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        환불 요청
                      </Button>
                      {payment.receiptUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(payment.receiptUrl!, "_blank")}
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          영수증 보기
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 환불 요청 다이얼로그 */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>환불 요청</DialogTitle>
              <DialogDescription>
                결제를 취소하고 환불을 요청합니다. 취소 사유를 입력해주세요.
              </DialogDescription>
            </DialogHeader>

            {canRefundData && !canRefundData.canRefund && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <p className="text-sm">{canRefundData.reason}</p>
              </div>
            )}

            {canRefundData?.canRefund && (
              <>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">환불 예정 금액</p>
                  <p className="text-lg font-semibold">
                    {canRefundData.refundableAmount?.toLocaleString()}원
                  </p>
                </div>

                <Textarea
                  placeholder="취소 사유를 입력해주세요 (예: 단순 변심, 중복 결제 등)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={!canRefundData?.canRefund || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "처리 중..." : "환불 요청"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
