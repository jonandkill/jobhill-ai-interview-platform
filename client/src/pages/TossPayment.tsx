import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft,
  Brain,
  CheckCircle2, 
  Loader2,
  CreditCard,
  Mic,
  Crown,
  Zap
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { PAYMENT_PRODUCTS, isPaymentProductType, type PaymentProductType } from "@shared/products";

// 토스페이먼츠 클라이언트 키 (환경변수에서 로드)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;

export default function TossPayment() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const requestedProduct = searchParams.get("product") || "single";
  const productType: PaymentProductType = isPaymentProductType(requestedProduct) ? requestedProduct : "single";
  const product = PAYMENT_PRODUCTS[productType];
  
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<ReturnType<PaymentWidgetInstance["renderPaymentMethods"]> | null>(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPopupBlockedDialog, setShowPopupBlockedDialog] = useState(false);

  // 팝업 차단 감지 및 안내
  const checkPopupBlocked = () => {
    const testPopup = window.open('', '_blank', 'width=1,height=1');
    if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
      setShowPopupBlockedDialog(true);
      return true;
    }
    testPopup.close();
    return false;
  };

  // 토스페이먼츠 결제 준비 mutation
  const preparePayment = trpc.tossPayment.prepare.useMutation();

  // 결제위젯 초기화
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initWidget = async () => {
      if (!TOSS_CLIENT_KEY) {
        toast.error("결제 공개키 설정이 필요합니다.");
        return;
      }
      try {
        const customerKey = `user_${user.id}`;
        const paymentWidget = await loadPaymentWidget(TOSS_CLIENT_KEY, customerKey);
        paymentWidgetRef.current = paymentWidget;

        // 결제 UI 렌더링
        const paymentMethods = paymentWidget.renderPaymentMethods(
          "#payment-method",
          { value: product.price },
          { variantKey: "DEFAULT" }
        );
        paymentMethodsWidgetRef.current = paymentMethods;

        // 이용약관 UI 렌더링
        paymentWidget.renderAgreement("#agreement", { variantKey: "AGREEMENT" });

        setIsWidgetReady(true);
      } catch (error) {
        console.error("결제위젯 초기화 실패:", error);
        toast.error("결제 시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.");
      }
    };

    initWidget();
  }, [isAuthenticated, user, product.price]);

  // 결제 요청
  const handlePayment = async () => {
    if (!paymentWidgetRef.current || !isAuthenticated || !user) {
      toast.error("결제를 진행할 수 없습니다. 다시 시도해주세요.");
      return;
    }

    // 팝업 차단 확인
    if (checkPopupBlocked()) {
      return;
    }

    setIsProcessing(true);

    try {
      // 서버에서 주문 정보 생성
      const orderInfo = await preparePayment.mutateAsync({
        productType,
      });

      // 토스페이먼츠 결제 요청
      await paymentWidgetRef.current.requestPayment({
        orderId: orderInfo.orderId,
        orderName: orderInfo.orderName,
        customerName: user.name || "고객",
        customerEmail: user.email || undefined,
        successUrl: `${window.location.origin}/payment/toss/success`,
        failUrl: `${window.location.origin}/payment/toss/fail`,
      });
    } catch (error: any) {
      console.error("결제 요청 실패:", error);
      if (error.code === "USER_CANCEL") {
        toast.info("결제가 취소되었습니다.");
      } else {
        toast.error(error.message || "결제 요청에 실패했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 로그인 필요
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>로그인이 필요합니다</CardTitle>
            <CardDescription>결제를 진행하려면 먼저 로그인해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>
              로그인하기
            </Button>
            <Link href="/pricing">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                요금제 페이지로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          
          <Link href="/pricing">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">요금제로 돌아가기</span>
            </Button>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-4">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 상품 정보 */}
            <div>
              <h1 className="text-2xl font-bold mb-6">결제하기</h1>
              
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {productType === "single_voice" && <Mic className="w-5 h-5 text-primary" />}
                      {productType === "single" && <Zap className="w-5 h-5 text-gold" />}
                      {(productType === "premium" || productType === "premium_plus") && <Crown className="w-5 h-5 text-gold" />}
                      {product.name}
                    </CardTitle>
                    {product.originalPrice > product.price && (
                      <Badge variant="destructive">
                        {Math.round((1 - product.price / product.originalPrice) * 100)}% 할인
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold">{product.price.toLocaleString()}</span>
                    <span className="text-muted-foreground">원</span>
                    {product.originalPrice > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.originalPrice.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      안전한 토스페이먼츠 결제
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      카드, 간편결제, 계좌이체 지원
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      결제 즉시 이용 가능
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 다른 상품 선택 */}
              <div className="text-sm text-muted-foreground">
                다른 상품을 원하시나요?{" "}
                <Link href="/pricing" className="text-primary hover:underline">
                  요금제 페이지 보기
                </Link>
              </div>
            </div>

            {/* 결제 위젯 */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    결제 수단 선택
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 토스페이먼츠 결제 UI */}
                  <div id="payment-method" className="min-h-[300px]">
                    {!isWidgetReady && (
                      <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* 이용약관 */}
                  <div id="agreement" />
                  
                  {/* 결제 버튼 */}
                  <Button 
                    className="w-full h-12 text-lg"
                    onClick={handlePayment}
                    disabled={!isWidgetReady || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        결제 처리 중...
                      </>
                    ) : (
                      <>
                        {product.price.toLocaleString()}원 결제하기
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    결제 시 <Link href="/terms" className="underline">이용약관</Link> 및{" "}
                    <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하게 됩니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 팝업 차단 안내 다이얼로그 */}
      <Dialog open={showPopupBlockedDialog} onOpenChange={setShowPopupBlockedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle>팝업 차단 감지</DialogTitle>
            </div>
            <DialogDescription>
              결제 창이 차단되어 있습니다. 팝업 차단을 해제해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">팝업 차단 해제 방법</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <p>브라우저 주소창 오른쪽의 <strong>팝업 차단 아이콘</strong>을 클릭하세요.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <p><strong>"이 사이트의 팝업 허용"</strong> 또는 <strong>"항상 허용"</strong>을 선택하세요.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <p>설정 후 <strong>"결제하기"</strong> 버튼을 다시 클릭해주세요.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>크롬/엣지:</strong> 주소창 오른쪽 팝업 차단 아이콘 클릭<br />
                <strong>사파리:</strong> 설정 &gt; 웹사이트 &gt; 팝업 차단 해제<br />
                <strong>파이어폭스:</strong> 주소창 왼쪽 방패 아이콘 클릭
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPopupBlockedDialog(false)}>
              닫기
            </Button>
            <Button onClick={() => {
              setShowPopupBlockedDialog(false);
              handlePayment();
            }}>
              다시 시도
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
