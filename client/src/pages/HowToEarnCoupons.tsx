import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Star, Trophy, Clock, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function HowToEarnCoupons() {
  const methods = [
    {
      icon: <MessageSquare className="w-8 h-8 text-primary" />,
      title: "후기 작성하기",
      reward: "1시간 무료 사용권",
      description: "면접 연습 후 솔직한 후기를 작성하면 1시간 쿠폰을 드립니다.",
      steps: [
        "면접 연습 완료",
        "후기 작성 페이지로 이동",
        "별점과 후기 작성",
        "자동으로 1시간 쿠폰 발급",
      ],
      badge: "가장 쉬운 방법",
      badgeColor: "bg-green-500",
    },
    {
      icon: <Trophy className="w-8 h-8 text-gold" />,
      title: "마일스톤 달성하기",
      reward: "최대 10시간 무료 사용권",
      description: "면접 연습 횟수에 따라 보너스 쿠폰을 드립니다.",
      steps: [
        "5회 완료 → 30분 쿠폰",
        "10회 완료 → 1시간 쿠폰",
        "20회 완료 → 2시간 쿠폰",
        "50회 완료 → 3시간 쿠폰",
        "100회 완료 → 5시간 쿠폰",
      ],
      badge: "장기 사용자 혜택",
      badgeColor: "bg-gold",
    },
    {
      icon: <Gift className="w-8 h-8 text-accent" />,
      title: "프로모션 쿠폰",
      reward: "다양한 혜택",
      description: "특별 이벤트나 프로모션 기간에 쿠폰 코드를 받으세요.",
      steps: [
        "공식 SNS 채널 팔로우",
        "이벤트 참여",
        "쿠폰 코드 받기",
        "쿠폰 입력하여 사용",
      ],
      badge: "이벤트",
      badgeColor: "bg-accent",
    },
  ];

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-8">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-primary/30 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">무료로 더 많이 사용하세요</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">쿠폰 획득 방법</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            다양한 방법으로 무료 사용 시간을 늘릴 수 있습니다. 
            쿠폰을 모아 구독 없이도 AI 면접 코치를 이용하세요!
          </p>
        </div>

        {/* 쿠폰 획득 방법 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {methods.map((method, idx) => (
            <Card key={idx} className="relative hover:shadow-lg transition-all glass-effect">
              {/* 배지 */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className={`${method.badgeColor} text-white px-3 py-1 text-xs font-bold`}>
                  {method.badge}
                </Badge>
              </div>
              
              <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {method.icon}
                  </div>
                </div>
                <CardTitle className="text-xl mb-2">{method.title}</CardTitle>
                <div className="text-2xl font-bold text-primary mb-2">
                  {method.reward}
                </div>
                <CardDescription>{method.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  {method.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold">{stepIdx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 쿠폰 사용 안내 */}
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              쿠폰 사용 방법
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <h3 className="font-semibold mb-2">✅ 자동 사용</h3>
                <p className="text-sm text-muted-foreground">
                  쿠폰이 있으면 면접 시작 시 자동으로 차감됩니다. 
                  별도의 설정이 필요 없습니다.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/50">
                <h3 className="font-semibold mb-2">⏱️ 시간 단위</h3>
                <p className="text-sm text-muted-foreground">
                  쿠폰은 분 단위로 사용됩니다. 
                  10분 면접을 하면 10분만 차감됩니다.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/50">
                <h3 className="font-semibold mb-2">📊 잔액 확인</h3>
                <p className="text-sm text-muted-foreground">
                  헤더의 쿠폰 배지에서 남은 시간을 실시간으로 확인할 수 있습니다.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/50">
                <h3 className="font-semibold mb-2">🔄 누적 가능</h3>
                <p className="text-sm text-muted-foreground">
                  여러 쿠폰을 모아서 사용할 수 있습니다. 
                  유효기간은 없습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            쿠폰으로 충분하지 않다면 구독을 고려해보세요
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/interview">
              <Button size="lg" className="btn-neon">
                <Sparkles className="w-4 h-4 mr-2" />
                면접 시작하기
              </Button>
            </Link>
            <Link href="/payment/external">
              <Button size="lg" variant="outline" className="glass-effect border-primary/30">
                구독 신청하기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
