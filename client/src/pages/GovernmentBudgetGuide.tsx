import { useState } from "react";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";
import {
  CheckCircle2,
  FileText,
  TrendingUp,
  Users,
  Mail,
  Phone,
  Download,
  Share2,
  Building2,
  Briefcase,
  Calculator,
} from "lucide-react";

export default function GovernmentBudgetGuide() {
  const [copied, setCopied] = useState(false);
  const contactEmail = PUBLIC_BUSINESS_INFO.supportEmail || PUBLIC_BUSINESS_INFO.email;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-primary/20 text-primary hover:bg-primary/30">
              정부 지원 사업 예산 활용 가이드
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              정부 예산으로
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                JOB HILL 도입하기
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              교육부 대학혁신지원사업 & 고용노동부 취업지원 프로그램 예산 활용 방안
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="gap-2">
                <a href="#faq">
                  <FileText className="h-5 w-5" />
                  FAQ 바로가기
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <a href="#contact">
                  <Mail className="h-5 w-5" />
                  상담 신청
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              정부 예산 활용의 3가지 핵심 혜택
            </h2>
            <p className="text-lg text-muted-foreground">
              대학 자체 예산 부담 없이 JOB HILL을 도입하세요
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>예산 부담 감소</CardTitle>
                <CardDescription>
                  정부 예산을 활용하여 대학 자체 예산 부담 최소화
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>교육부 대학혁신지원사업: 전액 정부 예산</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>고용노동부: 정부 보조율 57.1~66.7%</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>정산 간편</CardTitle>
                <CardDescription>
                  자동화된 실적 보고서로 정산 과정 간소화
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>모든 증빙 자료 자동 생성</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>전담 매니저 배정 및 실시간 지원</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>취업률 향상</CardTitle>
                <CardDescription>
                  학생 1명당 월 2.99만원으로 무제한 면접 연습
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>취업률 5-10% 향상 (실제 도입 대학 평균)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>학생 만족도 90% 이상</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Budget Simulation Section */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                예산 활용 시뮬레이션
              </h2>
              <p className="text-lg text-muted-foreground">
                실제 도입 시 예상되는 예산 규모와 성과를 확인하세요
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Case 1 */}
              <Card>
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <Badge variant="outline">교육부 대학혁신지원사업</Badge>
                  </div>
                  <CardTitle>사례 1: A대학교</CardTitle>
                  <CardDescription>
                    취업 준비 학생 100명 대상 AI 면접 코칭 서비스 도입
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">예산 계획</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">16,146,000원</p>
                    <p className="text-sm text-muted-foreground">
                      학생 100명 × 월 26,910원 × 6개월
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">예상 성과</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        취업률 5-10% 향상
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        학생 만족도 90% 이상
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        면접 연습 횟수 평균 10회 이상
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Case 2 */}
              <Card>
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <Badge variant="outline">고용노동부 대학일자리플러스센터</Badge>
                  </div>
                  <CardTitle>사례 2: B대학교</CardTitle>
                  <CardDescription>
                    재학생 및 졸업생 50명 대상 AI 면접 코칭 서비스 도입
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">예산 계획</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">17,043,000원</p>
                    <p className="text-sm text-muted-foreground">
                      학생 50명 × 월 28,405원 × 12개월
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      대학일자리플러스센터 예산 3억원 중 약 5.7% 활용
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">예상 성과</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        재학생 및 졸업생 취업률 향상
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        프로그램 만족도 증가
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        고용노동부 사업 평가 긍정적 실적
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              자주 묻는 질문 (FAQ)
            </h2>
            <p className="text-lg text-muted-foreground">
              정부 예산 활용에 대해 궁금하신 점을 확인하세요
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {/* Q1 */}
            <AccordionItem value="q1" className="rounded-lg border bg-card px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-semibold">
                  Q1. 교육부 대학혁신지원사업 예산으로 JOB HILL을 도입할 수 있나요?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 text-muted-foreground">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-semibold text-primary">✅ 답변: 네, 가능합니다.</p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">대학혁신지원사업 예산 활용 근거:</p>
                  <p>
                    교육부 대학혁신지원사업은 대학의 자율적 혁신을 지원하여 미래사회 인재 양성을 목적으로 합니다.
                    취업지원 프로그램은 사업비 집행 가능 항목에 포함됩니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">활용 가능한 예산 항목:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>학생 역량 강화 프로그램:</strong> AI 면접 코칭 서비스는 학생의 취업 역량을 강화하는 프로그램으로 분류됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>취업지원 인프라 구축:</strong> 디지털 기반 취업지원 시스템 도입 비용으로 활용 가능합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>교육 프로그램 운영비:</strong> 학생 대상 면접 교육 프로그램 운영비로 집행 가능합니다.</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">실제 사례:</p>
                  <p>
                    수원대·대구대는 대학일자리플러스센터 예산으로 하이잡 플랫폼(JOB HILL 유사 서비스)을 도입하여
                    AI 자소서·면접 캠프를 운영했습니다. 참가자 전원이 자소서를 완성하는 성과를 거두었습니다.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Q2 */}
            <AccordionItem value="q2" className="rounded-lg border bg-card px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-semibold">
                  Q2. 고용노동부 취업지원 프로그램 예산으로 도입할 수 있나요?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 text-muted-foreground">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-semibold text-primary">
                    ✅ 답변: 네, 대학일자리플러스센터 예산으로 도입 가능합니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">대학일자리플러스센터란?</p>
                  <p>
                    고용노동부가 대학 내 취업지원 인프라로 운영하는 청년 취업지원 서비스입니다.
                    재학생, 졸업생, 인근 지역 청년을 대상으로 맞춤형 고용서비스를 제공합니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">예산 규모 (2025년 기준):</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>거점형:</strong> 7억원 (정부 지원 4억원, 보조율 57.1%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>일반형:</strong> 3억원 (정부 지원 2억원, 보조율 66.7%)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">JOB HILL 도입 가능 항목:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>재학생 맞춤형 고용서비스:</strong> AI 면접 코칭 서비스는 재학생 대상 취업 준비 프로그램으로 분류됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>졸업생 특화 프로그램:</strong> 졸업 예정자 및 졸업생 대상 면접 준비 프로그램으로 활용 가능합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>디지털 취업지원 인프라:</strong> AI 기반 취업지원 시스템 도입 비용으로 집행 가능합니다.</span>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Q3 */}
            <AccordionItem value="q3" className="rounded-lg border bg-card px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-semibold">
                  Q3. 예산 집행 시 필요한 서류는 무엇인가요?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 text-muted-foreground">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-semibold text-primary">
                    ✅ 답변: JOB HILL이 모든 증빙 자료를 제공합니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">1. 계약 단계</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>사업 계약서: JOB HILL과 대학 간 서비스 이용 계약서</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>사업자등록증 사본: JOB HILL 사업자등록증</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>통장 사본: JOB HILL 계좌 정보</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">2. 집행 단계</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>세금계산서: 매월 또는 분기별 발행 (전자세금계산서 가능)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>거래명세서: 서비스 이용 내역 상세 명세서</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>입금 증빙: 계좌이체 확인증 또는 법인카드 결제 내역</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">3. 정산 단계</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>사용 실적 보고서: 학생 이용 현황, 이용 횟수, 만족도 조사 결과</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>성과 보고서: 취업률 변화, 학생 피드백, 프로그램 운영 성과</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>활용 증빙 자료: 학생 면접 연습 기록, 피드백 리포트 (개인정보 제거)</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
                  <p className="font-medium text-foreground">JOB HILL이 제공하는 서류:</p>
                  <p className="mt-2">
                    모든 계약서 및 증빙 서류는 <strong>JOB HILL이 직접 작성하여 제공</strong>합니다.
                    정산 시 필요한 사용 실적 보고서는 자동 생성되어 다운로드 가능합니다.
                    대학 담당자는 <strong>서류를 받아서 제출만</strong> 하면 됩니다.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Q4 */}
            <AccordionItem value="q4" className="rounded-lg border bg-card px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-semibold">
                  Q4. 예산 집행 후 정산 과정이 복잡하지 않나요?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 text-muted-foreground">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-semibold text-primary">
                    ✅ 답변: 아니요, JOB HILL이 정산 과정을 전폭 지원합니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">정산 과정 간소화 방안:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">자동화된 실적 보고서 생성</p>
                        <p className="text-sm">
                          JOB HILL 관리자 대시보드에서 월간/분기별 실적 보고서 자동 생성.
                          학생 이용 현황, 이용 횟수, 만족도 조사 결과가 자동으로 집계됩니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">증빙 자료 일괄 제공</p>
                        <p className="text-sm">
                          세금계산서, 거래명세서, 계약서 등 모든 증빙 자료를 한 번에 제공.
                          정산 시점에 맞춰 이메일로 일괄 발송합니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">전담 매니저 배정</p>
                        <p className="text-sm">
                          정부 지원 사업 예산 집행 경험이 있는 전담 매니저가 배정됩니다.
                          정산 과정에서 발생하는 모든 문의사항에 대해 실시간 지원합니다.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
                  <p className="font-medium text-foreground">실제 사례:</p>
                  <p className="mt-2">
                    수원대·대구대는 대학일자리플러스센터 예산으로 하이잡 플랫폼을 도입했습니다.
                    정산 과정에서 별도의 문제 없이 순조롭게 진행되었습니다.
                  </p>
                  <p className="mt-2 italic">
                    담당자 피드백: "서류가 자동으로 생성되어 정산이 매우 간편했습니다."
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Q5 */}
            <AccordionItem value="q5" className="rounded-lg border bg-card px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-semibold">
                  Q5. 정부 지원 사업 예산으로 도입 시 제약사항이 있나요?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4 text-muted-foreground">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-semibold text-primary">
                    ✅ 답변: 제약사항은 거의 없으며, 오히려 혜택이 더 많습니다.
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">정부 지원 사업 예산 활용 시 고려사항:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">예산 집행 기한</p>
                        <p className="text-sm">
                          정부 지원 사업 예산은 회계연도 내 전액 집행이 원칙입니다.
                          JOB HILL은 월 단위 자동 결제로 운영되므로 예산 집행 기한 준수가 용이합니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">사업 목적 외 사용 금지</p>
                        <p className="text-sm">
                          정부 지원 사업 예산은 사업 목적에 맞게 사용해야 합니다.
                          JOB HILL은 취업지원 프로그램으로 명확히 분류되므로 문제없습니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">증빙 자료 보관</p>
                        <p className="text-sm">
                          정부 지원 사업 예산 집행 시 증빙 자료를 5년간 보관해야 합니다.
                          JOB HILL은 모든 증빙 자료를 전자 문서로 제공하므로 보관이 용이합니다.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">정부 지원 사업 예산 활용 시 혜택:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">대학 자체 예산 부담 감소</p>
                        <p className="text-sm">
                          정부 지원 사업 예산을 활용하면 대학 자체 예산 부담이 크게 감소합니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">정부 지원 사업 실적 인정</p>
                        <p className="text-sm">
                          JOB HILL 도입은 정부 지원 사업 실적으로 인정됩니다.
                          취업률 향상, 학생 만족도 증가 등의 성과가 사업 평가에 긍정적으로 작용합니다.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">지속 가능한 운영</p>
                        <p className="text-sm">
                          정부 지원 사업 예산으로 도입 후, 효과가 검증되면 대학 자체 예산으로 전환 가능합니다.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="border-t bg-gradient-to-b from-muted/30 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                상담 신청 및 문의
              </h2>
              <p className="text-lg text-muted-foreground">
                정부 예산 활용 관련 상세 상담을 받아보세요
              </p>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>JOB HILL 사업개발팀</CardTitle>
                <CardDescription>정부 지원 사업 전담 매니저가 24시간 이내 회신드립니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">이메일</p>
                      <p className="font-medium">{displayBusinessValue(contactEmail)}</p>
                      {PUBLIC_BUSINESS_INFO.email &&
                      PUBLIC_BUSINESS_INFO.email !== contactEmail ? (
                        <p className="font-medium">{PUBLIC_BUSINESS_INFO.email}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">답변 시간</p>
                      <p className="font-medium">24시간 이내 회신</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-2 text-sm font-medium">상담 내용:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 교육부 대학혁신지원사업 예산 활용 방안</li>
                    <li>• 고용노동부 대학일자리플러스센터 예산 활용 방안</li>
                    <li>• 사업계획서 작성 지원</li>
                    <li>• 예산 집행 및 정산 절차 안내</li>
                    <li>• 실제 도입 사례 공유</li>
                  </ul>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-2 text-sm font-medium">무료 제공 자료:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 사업계획서 작성 템플릿</li>
                    <li>• 예산 집행 가이드</li>
                    <li>• 정산 체크리스트</li>
                    <li>• 실제 도입 대학 사례집</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1 gap-2" asChild>
                    <a href={contactEmail ? `mailto:${contactEmail}` : "/privacy"}>
                      <Mail className="h-4 w-4" />
                      이메일로 상담 신청
                    </a>
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleCopyUrl}>
                    <Share2 className="h-4 w-4" />
                    {copied ? "복사됨!" : "URL 공유"}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handlePrint}>
                    <Download className="h-4 w-4" />
                    PDF 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <Button variant="ghost" asChild>
            <Link href="/">← JOB HILL 메인으로 돌아가기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
