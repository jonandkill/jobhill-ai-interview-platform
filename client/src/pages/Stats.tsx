import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Clock, 
  MessageSquare,
  ArrowLeft,
  Loader2,
  Award,
  AlertTriangle,
  Zap,
  FileText
} from "lucide-react";

export default function Stats() {
  const { user, loading: authLoading } = useAuth();
  const { data: stats, isLoading } = trpc.interview.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">로그인이 필요합니다.</p>
            <Link href="/">
              <Button>홈으로</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getSpeedStatus = (wpm: number) => {
    if (wpm < 80) return { label: "느림", color: "bg-yellow-100 text-yellow-800", advice: "답변을 더 상세하게 구성해보세요" };
    if (wpm <= 150) return { label: "적정", color: "bg-green-100 text-green-800", advice: "적절한 답변 속도입니다" };
    return { label: "빠름", color: "bg-orange-100 text-orange-800", advice: "핵심 내용에 집중해보세요" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 헤더 */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                대시보드
              </Button>
            </Link>
            <h1 className="text-xl font-bold">면접 통계</h1>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 면접</p>
                  <p className="text-2xl font-bold">{stats?.totalSessions || 0}회</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">완료</p>
                  <p className="text-2xl font-bold">{stats?.completedSessions || 0}회</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">평균 점수</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats?.averageScore || 0)}`}>
                    {stats?.averageScore || 0}점
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">평균 속도</p>
                  <p className="text-2xl font-bold">
                    {stats?.speakingSpeedData && stats.speakingSpeedData.length > 0
                      ? Math.round(stats.speakingSpeedData.reduce((sum, d) => sum + d.estimatedWPM, 0) / stats.speakingSpeedData.length)
                      : 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">단어/분</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 점수 추이 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                점수 추이
              </CardTitle>
              <CardDescription>최근 면접 점수 변화</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.scoreHistory && stats.scoreHistory.length > 0 ? (
                <div className="space-y-3">
                  {stats.scoreHistory.slice(-10).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24">{item.date}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            item.score >= 90 ? 'bg-green-500' :
                            item.score >= 70 ? 'bg-blue-500' :
                            item.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className={`font-semibold w-12 text-right ${getScoreColor(item.score)}`}>
                        {item.score}점
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>아직 완료된 면접이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 답변 길이 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                답변 길이 분석
              </CardTitle>
              <CardDescription>면접별 평균 답변 길이</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.answerLengthData && stats.answerLengthData.length > 0 ? (
                <div className="space-y-3">
                  {stats.answerLengthData.slice(-10).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-20">면접 #{item.sessionId}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.avgLength}자</Badge>
                          <Badge variant="secondary">{item.avgWordCount}단어</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>권장 답변 길이:</strong> 150-300자 (30-60단어)가 적절합니다.
                      너무 짧으면 구체성이 부족하고, 너무 길면 핵심이 흐려질 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>아직 분석할 답변이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 말하기 속도 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                말하기 속도 분석
              </CardTitle>
              <CardDescription>면접별 추정 말하기 속도 (단어/분)</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.speakingSpeedData && stats.speakingSpeedData.length > 0 ? (
                <div className="space-y-3">
                  {stats.speakingSpeedData.slice(-10).map((item, idx) => {
                    const status = getSpeedStatus(item.estimatedWPM);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">면접 #{item.sessionId}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-sm">{item.estimatedWPM} 단어/분</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      💡 <strong>적정 말하기 속도:</strong> 분당 80-150단어가 이상적입니다.
                      면접에서는 명확하고 차분하게 말하는 것이 중요합니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>아직 분석할 데이터가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 강점/약점 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                강점 / 개선점 분석
              </CardTitle>
              <CardDescription>자주 언급된 피드백 키워드</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    강점 TOP 5
                  </h4>
                  {stats?.topStrengths && stats.topStrengths.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topStrengths.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {item.name.substring(0, 20)}...
                          </Badge>
                          <span className="text-xs text-muted-foreground">({item.count}회)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">데이터 없음</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-orange-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    개선점 TOP 5
                  </h4>
                  {stats?.topImprovements && stats.topImprovements.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topImprovements.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {item.name.substring(0, 20)}...
                          </Badge>
                          <span className="text-xs text-muted-foreground">({item.count}회)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">데이터 없음</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 월별 면접 횟수 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                월별 면접 현황
              </CardTitle>
              <CardDescription>월별 면접 연습 횟수</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.monthlyStats && stats.monthlyStats.length > 0 ? (
                <div className="flex items-end gap-2 h-40">
                  {stats.monthlyStats.slice(-12).map((item, idx) => {
                    const maxCount = Math.max(...stats.monthlyStats.map(s => s.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{item.count}</span>
                        <div 
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{item.month.split('-')[1]}월</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>아직 면접 기록이 없습니다</p>
                  <Link href="/interview">
                    <Button className="mt-4">첫 면접 시작하기</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
