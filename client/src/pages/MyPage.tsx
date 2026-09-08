import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { 
  Calendar,
  CreditCard,
  Loader2,
  LogOut,
  Star,
  User,
  XCircle,
  Share2,
  MessageCircle
} from "lucide-react";
import SocialShare from "@/components/SocialShare";
import CouponReviewSection from "@/components/CouponReviewSection";
// import { PaymentHistory } from "@/components/PaymentHistory";
import { toast } from "sonner";
import { Link } from "wouter";

// 임시: PaymentHistory 컴포넌트 비활성화 (결제 기능 미구현)
const PaymentHistory = () => null;

export default function MyPage() {
  const { user, logout } = useAuth();
  const { data: subscription, isLoading: subLoading } = trpc.subscription.current.useQuery();
  const { data: payments, isLoading: payLoading } = trpc.payment.list.useQuery();
  const utils = trpc.useUtils();

  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      toast.success("구독이 해지되었습니다");
      utils.subscription.current.invalidate();
    },
    onError: (error) => {
      toast.error("해지 실패: " + error.message);
    },
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">마이페이지</h1>
          <p className="text-muted-foreground">
            계정 정보와 결제 내역을 관리하세요
          </p>
        </div>

        {/* 사용자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              계정 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user?.name || "사용자"}</p>
                <p className="text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/profile">
                <Button variant="outline">프로필 수정</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout} className="gap-2 text-destructive">
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 구독 상태 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              구독 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : subscription?.status === "active" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Star className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">월정액 구독 활성</p>
                      <p className="text-sm text-green-600">
                        무제한 면접 이용 가능
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">다음 결제일</p>
                    <p className="font-semibold">
                      {subscription.endDate 
                        ? formatDate(subscription.endDate)
                        : "-"}
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive border-destructive/30">
                      <XCircle className="w-4 h-4" />
                      구독 해지
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>구독을 해지하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        구독을 해지하면 현재 결제 기간이 끝난 후 서비스 이용이 제한됩니다.
                        해지 후에도 기간 만료 전까지는 서비스를 이용할 수 있습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        해지하기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  현재 활성 구독이 없습니다
                </p>
                <Link href="/pricing">
                  <Button>구독 시작하기</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결제 내역 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              결제 내역
            </CardTitle>
            <CardDescription>
              최근 결제 내역을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.paymentType === "single" ? "1회 이용권" : "월정액 구독"}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(payment.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === "completed" 
                          ? "bg-green-100 text-green-700"
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {payment.status === "completed" ? "완료" 
                          : payment.status === "pending" ? "대기중"
                          : "실패"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>결제 내역이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 쿠폰 및 후기 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              쿠폰 & 후기
            </CardTitle>
            <CardDescription>
              쿠폰을 등록하거나 후기를 작성하여 무료 시간을 받으세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CouponReviewSection />
          </CardContent>
        </Card>

        {/* 결제 내역 및 영수증 */}
        <PaymentHistory />

        {/* SNS 공유 및 연동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              공유 및 연동
            </CardTitle>
            <CardDescription>
              친구에게 추천하고 소셜 로그인을 연동하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="font-medium mb-2">친구 추천하기</p>
              <p className="text-sm text-muted-foreground mb-3">
                친구에게 다음 면접 코치를 추천하세요!
              </p>
              <SocialShare 
                title="AI 면접 코치로 면접 준비하세요!"
                description="실전처럼 연습하고 근거 기반 피드백으로 답변을 개선하세요"
              />
            </div>

            <div className="p-4 rounded-lg border border-dashed">
              <p className="font-medium mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                소셜 로그인 안내
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                카카오톡, 네이버 등 소셜 계정으로 간편하게 로그인할 수 있습니다.
                현재 Manus OAuth를 통해 로그인이 지원됩니다.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.123.49.18.483.38.352.156-.103 2.5-1.683 3.51-2.36.52.077 1.058.114 1.62.114 4.97 0 9-3.185 9-7.115C21 6.185 16.97 3 12 3z"/>
                  </svg>
                  카카오톡 (예정)
                </Button>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                  </svg>
                  네이버 (예정)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
