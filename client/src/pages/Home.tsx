import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SocialShare from "@/components/SocialShare";
import InterviewDemo from "@/components/InterviewDemo";
import ReviewsSection from "@/components/ReviewsSection";
import CouponInputModal from "@/components/CouponInputModal";
import SignupPromptModal from "@/components/SignupPromptModal";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";
import { 
  ArrowRight, 
  Brain, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Star,
  Target,
  TrendingUp,
  Zap,
  Clock,
  Mic,
  Users,
  Award,
  Shield
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [showSignupModal, setShowSignupModal] = useState(false);

  // 비회원 첨 방문 시 회원가입 유도 모달 표시 (5초 후)
  useEffect(() => {
    if (!isAuthenticated) {
      const hasSeenModal = sessionStorage.getItem('hasSeenSignupModal');
      if (!hasSeenModal) {
        const timer = setTimeout(() => {
          setShowSignupModal(true);
          sessionStorage.setItem('hasSeenSignupModal', 'true');
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="잡앤킬 로고" className="h-10 w-auto" />
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {(loading || isAuthenticated) ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">대시보드</Button>
                </Link>
                <Link href="/interview">
                  <Button size="sm">면접 시작</Button>
                </Link>
              </>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm">로그인</Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button size="sm">무료 시작</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Bruvi Style */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 relative overflow-hidden px-4 hero-gradient">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
            `
          }} />
        </div>
        
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* 좌측: 텍스트 콘텐츠 */}
            <div className="text-left space-y-8">
              {/* 신뢰 지표 */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="stats-badge">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">근거 기반 답변 피드백</span>
                </div>
                <div className="stats-badge">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">답변별 개선 가이드</span>
                </div>
                <div className="stats-badge">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">만족도 4.9</span>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI 기반 맞춤형 면접 코칭</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="gradient-text text-glow">AI 면접 코치</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                이력서와 자기소개서를 분석하여 맞춤형 면접 질문을 생성하고, AI가 상세한 피드백을 제공합니다.
              </p>
            
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  /* 로그인 상태: 면접 시작 CTA */
                  <>
                    <Link href="/interview">
                      <Button size="lg" className="btn-neon gap-2 px-8 py-6 text-lg font-bold">
                        <Sparkles className="w-5 h-5" />
                        면접 시작하기
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline" size="lg" className="px-8 py-6 text-lg glass-effect border-primary/30">
                        대시보드
                      </Button>
                    </Link>
                  </>
                ) : (
                  /* 비로그인 상태: 가입/로그인 CTA */
                  <>
                    <a href={getLoginUrl()}>
                      <Button size="lg" className="btn-neon gap-2 px-8 py-6 text-lg font-bold">
                        <Sparkles className="w-5 h-5" />
                        무료로 시작하기
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </a>
                    <Link href="/pricing">
                      <Button variant="outline" size="lg" className="px-8 py-6 text-lg glass-effect border-primary/30">
                        요금제 보기
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>신용카드 불필요</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>언제든지 취소 가능</span>
                </div>
              </div>
            </div>
            
            {/* 우측: AI 홀로그램 이미지 */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 float-animation">
                <img 
                  src="/ai-interviewer-hero.png" 
                  alt="AI 면접관" 
                  className="w-full h-auto rounded-2xl neon-glow"
                />
              </div>
              {/* 배경 장식 */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
            </div>
          </div>
        </div>
      </section>
      
      {/* 나머지 섹션들 */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">주요 기능</h2>
            <p className="text-muted-foreground text-lg">완벽한 면접 준비를 위한 모든 것</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="feature-card">
              <div className="feature-icon">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI 맞춤형 질문</h3>
              <p className="text-muted-foreground">이력서와 자소서를 분석하여 맞춤형 면접 질문을 생성합니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">상세한 피드백</h3>
              <p className="text-muted-foreground">답변을 분석하고 구체적인 개선 방향을 제시합니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">실전 연습</h3>
              <p className="text-muted-foreground">실제 면접과 동일한 환경에서 반복 연습할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 왜 지금 시작해야 하는가 */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-primary/5 to-gold/5 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-8">
              🔥 지금 시작해야 하는 이유
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="text-center p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">40%</div>
                <p className="text-sm text-muted-foreground">특별 할인</p>
              </Card>
              <Card className="text-center p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">29,900원</div>
                <p className="text-sm text-muted-foreground">월 구독료</p>
              </Card>
              <Card className="text-center p-4 sm:p-6">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">무제한</div>
                <p className="text-sm text-muted-foreground">면접 연습</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-secondary/30 px-4">
        <div className="container">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              왜 다음 면접 코치인가요?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              단순한 질문 연습이 아닌, 실제 면접관처럼 분석하고 피드백합니다
            </p>
          </div>
          
          {/* 기능 소개 지도 - 한국인 실제 사진 */}
          <div className="mb-12 flex justify-center">
            <img 
              src="/feature-korean-practice.png" 
              alt="면접 연습" 
              className="w-full max-w-xl rounded-xl shadow-lg object-cover"
            />
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Link href="/profile">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">맞춤형 질문 생성</CardTitle>
                  <CardDescription>
                    이력서와 자기소개서를 분석하여 지원 직무에 맞는 질문을 생성합니다
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/interview">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Mic className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">음성 면접 모드</CardTitle>
                  <CardDescription>
                    실제 면접처럼 음성으로 연습하고 발음/억양까지 피드백 받으세요
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/interview">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">답변 준비도 점검</CardTitle>
                  <CardDescription>
                    답변에 실제로 포함된 근거와 구조를 분석해 다음 연습의 개선점을 제시합니다
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/interview">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">답변 밸런스 분석</CardTitle>
                  <CardDescription>
                    인성/경험/기술 등 유형별 점수를 분석하여 약점을 파악합니다
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/company-analysis">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">기업 분석 리포트</CardTitle>
                  <CardDescription>
                    기업의 성장 단계와 직무별 업무를 분석하여 면접 준비를 돕습니다
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            
            <Link href="/difficult-questions">
              <Card className="elegant-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">어려운 질문 관리</CardTitle>
                  <CardDescription>
                    어려웠던 질문을 저장하고 반복 연습하여 완벽하게 대비하세요
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* 실제 면접 예시 데모 */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-elegant">
        <div className="container">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <MessageSquare className="w-3 h-3 mr-1" />
              지원 정보 기반 맞춤 연습
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold korean-title mb-4">
              실제로 이렇게 진행됩니다
            </h2>
            <p className="text-muted-foreground korean-body">
              이력서·자기소개서와 직무 정보를 바탕으로 답변 구성을 도와드립니다
            </p>
          </div>
          <InterviewDemo onStartInterview={() => window.location.href = isAuthenticated ? '/interview' : getLoginUrl()} />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              어떻게 진행되나요?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              간단한 3단계로 면접을 준비하세요
            </p>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">정보 입력</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                이력서, 자기소개서, 지원 회사와 직무 정보를 입력합니다
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">모의 면접</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                AI 면접관이 맞춤형 질문을 하고 답변을 기다립니다
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">피드백 확인</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                상세한 피드백과 답변 준비도를 확인하고 개선합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 sm:py-20 bg-secondary/30 px-4">
        <div className="container">
          <div className="text-center mb-12 sm:mb-16">
            <Badge variant="secondary" className="mb-4">요금 안내</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              합리적인 요금제
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              모든 기능을 포함한 단일 구독제로 간편하게 시작하세요!
            </p>
          </div>
          
          <div className="flex justify-center">
            <Card className="elegant-card border-primary/50 relative shadow-2xl max-w-md w-full">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-gold text-white text-sm rounded-full whitespace-nowrap">
                🔥 단일 구독제
              </div>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                  <Star className="w-6 h-6 text-gold" />
                  프리미엄 구독
                </CardTitle>
                <CardDescription>무제한 면접 연습 + AI 피드백</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 text-center">
                  <div className="mb-2">
                    <span className="text-5xl font-bold gradient-text">29,900</span>
                    <span className="text-xl text-muted-foreground">원/월</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">결제 전 제공 범위와 갱신·해지 조건을 확인하세요.</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="font-medium">무제한 텍스트 면접</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="font-medium">무제한 음성 면접</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>AI 실시간 피드백</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>6가지 면접관 아바타</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>기업 맞춤형 질문</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>면접 히스토리 저장</span>
                  </li>
                </ul>
                <Link href="/payment/external">
                  <Button className="w-full bg-gradient-to-r from-primary to-gold text-lg py-6">
                    지금 시작하기
                  </Button>
                </Link>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  실제 결제 화면의 상품명·금액·기간을 최종 확인하세요
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 사용자 후기 섹션 */}
      <ReviewsSection />

      {/* FAQ 섹션 */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                자주 묻는 질문
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                궁금한 점이 있으신가요?
              </h2>
            </div>
            
            <div className="space-y-4">
              {/* FAQ 1 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    실제 면접과 얼마나 비슷한가요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    등록한 지원 정보와 일반적인 구조화 면접 범주를 바탕으로 연습 질문을 생성합니다. 실제 회사의 출제 질문이나 채용 결과를 예측하지는 않습니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 2 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    음성 면접은 어떻게 진행되나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI 면접관이 질문을 음성으로 읽어주고, 사용자는 마이크로 답변합니다. 
                    <strong>실시간 음성 인식</strong>으로 답변이 텍스트로 변환되며, 버벅임 분석과 피드백도 제공됩니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 3 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    단일 구독제는 어떤 혜택이 있나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    월 29,900원으로 <strong>모든 기능을 무제한 이용</strong>할 수 있습니다. 
                    텍스트/음성 면접, AI 피드백, 6가지 면접관 아바타, 기업 맞춤형 질문, 면접 히스토리 저장 등 모든 프리미엄 기능이 포함되어 있습니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 4 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    언제든 해지할 수 있나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    활성 이용권은 마이페이지에서 상태와 종료일을 확인할 수 있습니다. 자동 갱신 상품이라면 결제 전 갱신 주기와 해지 시점을 별도로 표시합니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 5 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    표시된 요금에는 무엇이 포함되나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    화면에 표시된 월 29,900원 플랜의 기능, 이용 기간, 자동 갱신 여부와 해지 조건은 결제 요청 화면에서 다시 확인할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 6 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    어떤 기업 면접을 준비할 수 있나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    삼성, 현대, SK, LG, 네이버, 카카오 등 <strong>대기업부터 스타트업까지</strong> 모든 기업의 면접을 준비할 수 있습니다. 
                    기업 분석 리포트로 해당 기업의 성장 단계와 직무 특성도 파악할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 7 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    개인정보는 안전한가요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    음성은 텍스트 변환을 위해 연결된 AI 서비스에서 처리되며, 앱에는 변환된 답변과 피드백이 저장됩니다. 불필요한 민감정보는 입력하지 마세요. 
                    회원 탈퇴 시 30일 이내 모든 데이터가 완전히 삭제됩니다.
                  </p>
                </CardContent>
              </Card>
              
              {/* FAQ 8 */}
              <Card className="elegant-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">Q.</span>
                    쿠폰은 어떻게 사용하나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    메인 페이지 또는 면접 시작 화면에서 <strong>"무료 쿠폰이 있으신가요?"</strong> 버튼을 클릭하세요. 
                    쿠폰 코드를 입력하면 무료 사용 시간이 자동으로 추가됩니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 구독 서비스 안내 섹션 */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-green-500 text-white mb-4">💳 간편한 구독 서비스</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              월 29,900원으로 모든 기능을 무제한 이용하세요
            </h2>
            <p className="text-muted-foreground mb-6">
              월간 이용 상품의 제공 범위와 종료일을 확인하세요.<br />
              자동 갱신 여부는 실제 결제 화면에 표시된 조건을 기준으로 합니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>월 29,900원 단일 구독</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>결제 전 갱신 조건 확인</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>마이페이지에서 이용 상태 관리</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - 강화된 행동 유도 */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-br from-primary/5 via-gold/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              다음 면접은 <span className="text-gold">더 구체적인 답변</span>으로 준비하세요
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-4">
              지금 시작하면 <strong>월 29,900원으로 모든 기능 무제한 이용!</strong>
            </p>
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8 inline-block">
              <p className="text-foreground text-sm sm:text-base">
                <Clock className="w-4 h-4 inline mr-1" />
                월 29,900원 플랜의 제공 기능과 결제·해지 조건을 확인한 뒤 선택하세요
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {(loading || isAuthenticated) ? (
                <Link href="/interview">
                  <Button size="lg" className="gap-2 px-8 bg-gradient-to-r from-primary to-gold hover:from-primary/90 hover:to-gold/90 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Sparkles className="w-5 h-5" />
                    면접 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="gap-2 px-8 bg-gradient-to-r from-primary to-gold hover:from-primary/90 hover:to-gold/90 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Sparkles className="w-5 h-5" />
                    무료 질문으로 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )}
              <SocialShare />
            </div>
            
            {/* 보증 메시지 */}
            <p className="text-xs text-muted-foreground mt-6">
              ✓ 월 29,900원 플랜 • ✓ 결제 전 기간·갱신 조건 확인 • ✓ 마이페이지에서 상태 관리
            </p>
          </div>
        </div>
      </section>

      {/* 개인정보 보호 안내 섹션 */}
      <section className="py-10 sm:py-12 bg-gradient-to-b from-slate-900 to-slate-950 text-white px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-green-400" />
              <h2 className="text-xl sm:text-2xl font-bold">개인정보 보호 안내</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="font-semibold">데이터 암호화</h3>
                </div>
                <p className="text-sm text-gray-300">
                  이력서·자기소개서·면접 답변은 서비스 제공에 필요한 범위에서 저장·처리되며, 사용자는 기록 화면에서 관리할 수 있습니다.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-semibold">제3자 제공 금지</h3>
                </div>
                <p className="text-sm text-gray-300">
                  귀하의 개인정보는 어떠한 경우에도 제3자에게 제공되지 않습니다.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-semibold">자동 삭제</h3>
                </div>
                <p className="text-sm text-gray-300">
                  회원 탈퇴 시 모든 데이터는 30일 이내 완전히 삭제됩니다.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-400">
                AI 면접 코치는 개인정보보호법을 준수하며, 귀하의 정보를 안전하게 보호합니다.
                <br />
                문의사항이 있으시면 언제든지 연락해 주세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-border/50 px-4 bg-slate-50">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {/* 회사 정보 */}
            <div className="space-y-4">
              <img src="/logo.jpg" alt="잡앤킬 로고" className="h-12 w-auto" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>{PUBLIC_BUSINESS_INFO.name}</strong></p>
                <p>대표: {displayBusinessValue(PUBLIC_BUSINESS_INFO.representative)}</p>
                <p>사업자등록번호: {displayBusinessValue(PUBLIC_BUSINESS_INFO.businessNumber)}</p>
                <p>통신판매업: {displayBusinessValue(PUBLIC_BUSINESS_INFO.salesNumber)}</p>
                <p>직업정보제공사업신고번호: {displayBusinessValue(PUBLIC_BUSINESS_INFO.jobInfoNumber)}</p>
              </div>
            </div>
            
            {/* 연락처 */}
            <div className="space-y-4">
              <h3 className="font-semibold">연락처</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>주소: {displayBusinessValue(PUBLIC_BUSINESS_INFO.address)}</p>
                <p>대표전화: {displayBusinessValue(PUBLIC_BUSINESS_INFO.phone)}</p>
                <p className="text-xs">(상담시간: {PUBLIC_BUSINESS_INFO.supportHours})</p>
                <p>고객지원 및 비즈니스 문의: {displayBusinessValue(PUBLIC_BUSINESS_INFO.supportEmail)}</p>
              </div>
            </div>
            
            {/* 링크 */}
            <div className="space-y-4">
              <h3 className="font-semibold">서비스</h3>
              <div className="flex flex-col gap-2">
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  이용약관
                </Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  개인정보 처리방침
                </Link>
                <Link href="/interview" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  AI 면접 연습
                </Link>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  요금제
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 (주)잡앤킬. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* 회원가입 유도 모달 */}
      <SignupPromptModal
        open={showSignupModal}
        onOpenChange={setShowSignupModal}
        trigger="first_visit"
      />
    </div>
  );
}
