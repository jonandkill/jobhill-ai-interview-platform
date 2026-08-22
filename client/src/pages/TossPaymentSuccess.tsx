import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  Brain,
  PartyPopper
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { useEffect, useState } from "react";
// confetti 효과는 나중에 추가

export default function TossPaymentSuccess() {
  const { isAuthenticated } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 결제 승인 mutation
  const confirmPayment = trpc.tossPayment.confirm.useMutation({
    onSuccess: () => {
      setIsConfirmed(true);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || "결제 승인에 실패했습니다.");
    },
  });

  // 결제 승인 요청
  useEffect(() => {
    if (paymentKey && orderId && amount && isAuthenticated && !isConfirmed && !error) {
      confirmPayment.mutate({
        paymentKey,
        orderId,
        amount: parseInt(amount, 10),
      });
    }
  }, [paymentKey, orderId, amount, isAuthenticated, isConfirmed, error]);

  // 로딩 중
  if (confirmPayment.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">결제 확인 중...</h2>
            <p className="text-muted-foreground">잠시만 기다려주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😢</span>
            </div>
            <CardTitle className="text-red-600">결제 승인 실패</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/pricing">
              <Button className="w-full">다시 시도하기</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">홈으로 돌아가기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 결제 성공
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline">다음 면접 코치</span>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper className="w-6 h-6 text-gold" />
              <CardTitle className="text-2xl">결제 완료!</CardTitle>
              <PartyPopper className="w-6 h-6 text-gold" />
            </div>
            <CardDescription className="text-base">
              결제가 성공적으로 완료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 결제 정보 */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">주문번호</span>
                <span className="font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">결제금액</span>
                <span className="font-semibold">{parseInt(amount || "0", 10).toLocaleString()}원</span>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="text-center text-sm text-muted-foreground">
              <p>이용권이 계정에 추가되었습니다.</p>
              <p>지금 바로 면접 연습을 시작해보세요!</p>
            </div>

            {/* 버튼 */}
            <div className="space-y-3">
              <Link href="/interview">
                <Button className="w-full h-12 text-lg gap-2">
                  면접 연습 시작하기
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  대시보드로 이동
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
