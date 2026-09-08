import { useAuth } from "@/_core/hooks/useAuth";
import { hasInterviewContext } from "@shared/interviewContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Check,
  Circle,
  Coins,
  FileSearch,
  FileText,
  History,
  MessageSquare,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const profileQuery = trpc.profile.get.useQuery();
  const sessionsQuery = trpc.interview.list.useQuery();
  const { data: subscription } = trpc.subscription.current.useQuery();
  const { data: creditStatus } = trpc.freeLimit.check.useQuery();

  const profile = profileQuery.data;
  const sessions = sessionsQuery.data ?? [];
  const completedSessions = sessions.filter(session => session.status === "completed");
  const scoredSessions = completedSessions
    .filter(session => typeof session.overallScore === "number")
    .slice()
    .reverse();
  const inProgressSession = sessions.find(session => session.status === "in_progress");
  const profileReady = hasInterviewContext(profile);

  const lifecycle = [
    { title: "지원 정보 준비", description: "이력서·자소서 또는 회사·직무", complete: profileReady, icon: FileText },
    { title: "첫 모의면접", description: "카메라·마이크 점검 후 실제처럼 답변", complete: sessions.length > 0, icon: Mic },
    { title: "근거 기반 피드백", description: "답변별 강점과 다음 수정 포인트 확인", complete: completedSessions.length > 0, icon: FileSearch },
    { title: "수정 후 재연습", description: "같은 직무로 다시 답해 변화 확인", complete: completedSessions.length > 1, icon: RotateCcw },
  ];
  const lifecycleDone = lifecycle.filter(step => step.complete).length;

  const nextAction = inProgressSession
    ? { eyebrow: "이어서 하기", title: "진행 중인 면접을 마무리하세요", description: "기존 답변과 설정을 유지한 채 다음 질문부터 이어갑니다.", href: `/interview/${inProgressSession.id}`, label: "면접 이어가기", icon: ArrowRight }
    : !profileReady
      ? { eyebrow: "1단계", title: "맞춤 질문의 기준부터 만들어볼까요?", description: "이력서·자소서를 등록하거나 회사와 직무를 입력하면 맞춤 질문을 시작할 수 있습니다.", href: "/profile", label: "지원 정보 등록", icon: FileText }
      : completedSessions.length === 0
        ? { eyebrow: "2단계", title: "첫 모의면접을 시작할 준비가 됐어요", description: "카메라는 셀프뷰에만 사용하고, 시작 전에 카메라와 마이크를 직접 점검합니다.", href: "/interview", label: "첫 면접 시작", icon: Mic }
        : completedSessions.length === 1
          ? { eyebrow: "4단계", title: "피드백 한 가지를 고쳐 다시 답해보세요", description: "한 번에 모든 것을 바꾸기보다 가장 낮은 평가 기준부터 수정하면 변화를 비교하기 쉽습니다.", href: "/interview", label: "재연습 시작", icon: RotateCcw }
          : { eyebrow: "다음 연습", title: "최근 피드백에서 반복되는 패턴을 확인하세요", description: "점수보다 답변 근거·구조·직무 연관성의 변화에 집중해 다음 연습 목표를 정하세요.", href: "/history", label: "피드백 검토", icon: FileSearch };
  const NextIcon = nextAction.icon;

  if (profileQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-6" aria-busy="true" aria-label="대시보드 불러오는 중">
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="h-52 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">오늘의 면접 준비</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{user?.name || "사용자"}님의 다음 한 단계</h1>
            <p className="mt-2 text-sm text-muted-foreground">준비 → 실전 연습 → 피드백 → 재연습 순서로 이어집니다.</p>
          </div>
          <Link href="/interview"><Button className="min-h-11 gap-2"><Sparkles className="h-4 w-4" /> 새 면접 시작</Button></Link>
        </header>

        <section aria-labelledby="next-action-heading">
          <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
            <CardContent className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold tracking-widest text-primary uppercase">{nextAction.eyebrow}</p>
                <h2 id="next-action-heading" className="mt-2 text-xl font-bold sm:text-2xl">{nextAction.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{nextAction.description}</p>
              </div>
              <Link href={nextAction.href}><Button size="lg" className="min-h-12 w-full gap-2 md:w-auto"><NextIcon className="h-4 w-4" /> {nextAction.label}</Button></Link>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="journey-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="journey-heading" className="text-lg font-bold">면접 준비 여정</h2>
              <p className="mt-1 text-sm text-muted-foreground">완료한 단계와 다음 행동을 한눈에 확인하세요.</p>
            </div>
            <p className="text-sm font-medium">{lifecycleDone}/{lifecycle.length} 단계</p>
          </div>
          <Progress value={(lifecycleDone / lifecycle.length) * 100} className="mb-4 h-2" aria-label={`면접 준비 여정 ${lifecycleDone}/${lifecycle.length} 단계 완료`} />
          <ol className="grid gap-3 md:grid-cols-4">
            {lifecycle.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <li key={step.title} className={`rounded-xl border p-4 ${step.complete ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : index === lifecycleDone ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-sm"><StepIcon className="h-4 w-4 text-primary" /></span>
                    {step.complete ? <Check className="h-5 w-5 text-emerald-600" aria-label="완료" /> : <Circle className="h-4 w-4 text-muted-foreground" aria-label="미완료" />}
                  </div>
                  <p className="mt-4 text-xs font-semibold text-muted-foreground">STEP {index + 1}</p>
                  <h3 className="mt-1 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="면접 현황">
          <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><History className="h-4 w-4" /> 완료한 면접</p><p className="mt-2 text-3xl font-bold">{completedSessions.length}<span className="ml-1 text-base font-medium">회</span></p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> 최근 답변 준비 점수</p><p className="mt-2 text-3xl font-bold">{scoredSessions.at(-1)?.overallScore ?? "—"}<span className="ml-1 text-base font-medium">{scoredSessions.length ? "점" : ""}</span></p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Coins className="h-4 w-4" /> 질문 이용 가능</p><p className="mt-2 text-3xl font-bold">{creditStatus?.hasSubscription ? "무제한" : creditStatus?.hasFreeTrial ? "체험 중" : `${creditStatus?.questionCredits ?? 0}개`}</p></CardContent></Card>
        </section>

        {scoredSessions.length >= 2 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> 답변 준비 점수 변화</CardTitle><CardDescription>실제 합격 확률이 아니라, 제출한 답변을 동일한 평가 기준으로 검토한 연습 지표입니다.</CardDescription></CardHeader>
            <CardContent>
              <div className="h-64" role="img" aria-label="최근 면접 답변 준비 점수 선 그래프">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoredSessions.slice(-10).map((session, index) => ({ 회차: `${index + 1}회`, 점수: session.overallScore ?? 0, 날짜: new Date(session.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) }))} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="날짜" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="점수" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>최근 면접</CardTitle><CardDescription>연습과 피드백으로 바로 돌아갈 수 있습니다.</CardDescription></div><Link href="/history"><Button variant="ghost" className="min-h-11">전체 보기</Button></Link></CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center"><MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-medium">아직 면접 기록이 없습니다</p><p className="mt-1 text-sm text-muted-foreground">지원 정보를 등록하고 첫 질문부터 시작해보세요.</p><Link href="/interview"><Button variant="outline" className="mt-4 min-h-11">첫 면접 시작</Button></Link></div>
            ) : (
              <ul className="divide-y">
                {sessions.slice(0, 5).map(session => (
                  <li key={session.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"><MessageSquare className="h-5 w-5 text-primary" /></span><div><p className="font-medium">{session.sessionType === "voice_interview" ? "음성 모의면접" : "모의면접"}</p><p className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleDateString("ko-KR")} · {session.status === "completed" ? "완료" : session.status === "in_progress" ? "진행 중" : "준비 중"}</p></div></div>
                    <div className="flex items-center justify-between gap-3 sm:pl-0">{typeof session.overallScore === "number" && <span className="text-sm font-semibold">준비 점수 {session.overallScore}점</span>}<Link href={`/interview/${session.id}`}><Button variant="outline" size="sm" className="min-h-10 gap-1">열기 <ArrowRight className="h-4 w-4" /></Button></Link></div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {!subscription?.status && (
          <Card className="border-primary/20 bg-primary/5"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">연습을 더 이어가고 싶나요?</h2><p className="mt-1 text-sm text-muted-foreground">요금과 제공 크레딧을 확인한 뒤 필요한 만큼만 선택하세요.</p></div><Link href="/pricing"><Button variant="outline" className="min-h-11 gap-2"><Target className="h-4 w-4" /> 요금제 확인</Button></Link></CardContent></Card>
        )}
      </main>
    </DashboardLayout>
  );
}
