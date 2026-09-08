import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  Sparkles, 
  Lock, 
  Gift,
  ArrowRight,
  Crown,
  Zap,
  Coins
} from "lucide-react";

interface FreeLimitBannerProps {
  variant?: "inline" | "modal" | "card";
  onUpgrade?: () => void;
}

export default function FreeLimitBanner({ 
  variant = "card",
  onUpgrade 
}: FreeLimitBannerProps) {
  const { data: limitStatus, isLoading } = trpc.freeLimit.check.useQuery();

  if (isLoading || !limitStatus) return null;

  const { 
    questionCredits, 
    totalPurchasedCredits,
    freeLimit, 
    remaining, 
    needsPayment, 
    hasSubscription, 
    hasFreeTrial 
  } = limitStatus;

  // 구독 중이거나 무료 체험 중이면 무제한 표시
  if (hasSubscription) {
    if (variant === "inline") {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/30">
          <Crown className="w-5 h-5 text-gold shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium korean-text">
              프리미엄 구독 중 - 무제한 이용 가능
            </p>
          </div>
          <Badge className="shrink-0 bg-gold/20 text-gold border-gold/30">
            무제한
          </Badge>
        </div>
      );
    }
    return null;
  }

  if (hasFreeTrial) {
    if (variant === "inline") {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <Gift className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 korean-text">
              무료 체험 중 - 모든 기능 이용 가능
            </p>
          </div>
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-300">
            체험 중
          </Badge>
        </div>
      );
    }
    return null;
  }

  // 크레딧이 남아있으면 크레딧 상태 표시
  if (questionCredits > 0 && variant === "inline") {
    const lowCredits = questionCredits <= 3;
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${lowCredits ? 'bg-amber-50 border-amber-200' : 'bg-secondary/50 border-border/50'} border`}>
        <Coins className={`w-5 h-5 ${lowCredits ? 'text-amber-600' : 'text-primary'} shrink-0`} />
        <div className="flex-1">
          <p className="text-sm font-medium korean-text">
            질문 크레딧: {questionCredits}개 남음
          </p>
          {lowCredits && (
            <p className="text-xs text-amber-600 korean-body">
              크레딧이 얼마 남지 않았습니다
            </p>
          )}
        </div>
        <Link href="/pricing">
          <Button size="sm" variant={lowCredits ? "default" : "outline"} className="gap-1">
            <Zap className="w-3 h-3" />
            충전
          </Button>
        </Link>
      </div>
    );
  }

  // 크레딧이 없으면 결제 유도 배너 표시
  if (needsPayment || questionCredits <= 0) {
    if (variant === "inline") {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 korean-text">
              크레딧이 모두 소진되었습니다
            </p>
            <p className="text-xs text-amber-600 korean-body">
              크레딧을 충전하거나 프리미엄으로 업그레이드하세요
            </p>
          </div>
          <Link href="/pricing">
            <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600">
              <Coins className="w-3 h-3" />
              충전하기
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <Card className="elegant-card border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-amber-600" />
          </div>
          
          <h3 className="text-xl font-bold korean-title mb-2">
            크레딧이 모두 소진되었습니다
          </h3>
          <p className="text-muted-foreground korean-body mb-4">
            {totalPurchasedCredits > 0 
              ? `총 ${totalPurchasedCredits}개의 질문을 연습하셨습니다.`
              : '무료 크레딧 3개를 모두 사용하셨습니다.'
            }<br />
            크레딧을 충전하고 계속 연습하세요!
          </p>

          {/* 크레딧 패키지 안내 */}
          <div className="grid grid-cols-2 gap-2 mb-6 text-left">
            {[
              { name: "5질문", price: "900원", perQ: "180원/질문" },
              { name: "15질문", price: "2,400원", perQ: "160원/질문" },
              { name: "30질문", price: "4,500원", perQ: "150원/질문" },
              { name: "100질문", price: "12,000원", perQ: "120원/질문" },
            ].map((pack, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white/50 rounded-lg">
                <span className="font-medium">{pack.name}</span>
                <span className="text-muted-foreground">{pack.price}</span>
              </div>
            ))}
          </div>

          {/* CTA 버튼 */}
          <div className="space-y-2">
            <Link href="/pricing">
              <Button className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Coins className="w-4 h-4" />
                크레딧 충전하기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="w-full gap-2">
                <Crown className="w-4 h-4" />
                프리미엄 구독 (무제한)
              </Button>
            </Link>
          </div>

          {/* 긴급성 메시지 */}
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-sm text-green-700 korean-emphasis">
              🎁 첫 결제 시 보너스 크레딧 증정!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 기본 크레딧 상태 카드
  return (
    <Card className="elegant-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <span className="font-medium korean-text">질문 크레딧</span>
          </div>
          <Badge variant="secondary">
            {questionCredits}개 남음
          </Badge>
        </div>
        <Progress value={Math.min((questionCredits / 10) * 100, 100)} className="h-2 mb-3" />
        <p className="text-xs text-muted-foreground korean-body">
          {questionCredits}개의 크레딧이 남았습니다. 질문 1개당 1크레딧이 차감됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
