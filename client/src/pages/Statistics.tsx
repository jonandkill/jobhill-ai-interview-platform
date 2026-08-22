import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Award, 
  Calendar,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from "recharts";

export default function Statistics() {
  const { data: stats, isLoading: statsLoading } = trpc.interview.stats.useQuery();
  const { data: scoreTrend, isLoading: trendLoading } = trpc.interview.scoreTrend.useQuery();
  const { data: typePerformance, isLoading: typeLoading } = trpc.interview.typePerformance.useQuery();

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">통계 데이터를 불러오는 중...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">아직 면접 연습 기록이 없습니다</h2>
            <p className="mt-2 text-muted-foreground">
              AI 모의면접을 시작하면 여기에서 통계를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 점수 변화 계산
  const getScoreChange = () => {
    if (!scoreTrend || scoreTrend.length < 2) return null;
    const recent = scoreTrend.slice(-7);
    if (recent.length < 2) return null;
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const firstAvg = firstHalf.reduce((a: number, b: { averageScore: number }) => a + b.averageScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b: { averageScore: number }) => a + b.averageScore, 0) / secondHalf.length;
    return Math.round(secondAvg - firstAvg);
  };

  const scoreChange = getScoreChange();

  // 강점/약점 분석
  const strengths = typePerformance?.filter((t: { strength: boolean }) => t.strength) || [];
  const weaknesses = typePerformance?.filter((t: { strength: boolean }) => !t.strength) || [];

  // 레이더 차트 데이터
  const radarData = typePerformance?.map((t: { label: string; averageScore: number }) => ({
    subject: t.label,
    score: t.averageScore,
    fullMark: 100,
  })) || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            면접 연습 통계
          </h1>
          <p className="mt-2 text-muted-foreground">
            지금까지의 면접 연습 현황과 성과를 확인하세요
          </p>
        </div>

        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">총 면접 횟수</p>
                  <p className="text-3xl font-bold">{stats.totalSessions}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                이번 주 {stats.thisWeekSessions}회 | 이번 달 {stats.thisMonthSessions}회
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">평균 점수</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{stats.averageScore}</p>
                    {scoreChange !== null && (
                      <Badge variant={scoreChange > 0 ? "default" : scoreChange < 0 ? "destructive" : "secondary"} className="text-xs">
                        {scoreChange > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : scoreChange < 0 ? <ArrowDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                        {Math.abs(scoreChange)}점
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <Progress value={stats.averageScore} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">최고 점수</p>
                  <p className="text-3xl font-bold">{stats.highestScore}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                총 {stats.answeredQuestions}개 질문 답변
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">연속 연습</p>
                  <p className="text-3xl font-bold">{stats.streak}일</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.streak > 0 ? "꾸준히 연습하고 있어요! 🔥" : "오늘부터 시작해보세요!"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 점수 추이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              점수 추이 (최근 30일)
            </CardTitle>
            <CardDescription>
              일별 평균 점수 변화를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : scoreTrend && scoreTrend.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      className="text-xs"
                    />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}점`,
                        name === 'averageScore' ? '평균 점수' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="averageScore" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                아직 충분한 데이터가 없습니다. 면접 연습을 더 진행해주세요.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 질문 유형별 성과 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 레이더 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                질문 유형별 성과
              </CardTitle>
              <CardDescription>
                각 유형별 평균 점수를 시각적으로 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {typeLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : radarData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="점수"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      <Tooltip formatter={(value: number) => [`${value}점`, '평균 점수']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  아직 충분한 데이터가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 강점/약점 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                강점 & 개선 영역
              </CardTitle>
              <CardDescription>
                75점 이상은 강점, 미만은 개선이 필요한 영역입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 강점 */}
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  강점 영역
                </h4>
                {strengths.length > 0 ? (
                  <div className="space-y-2">
                    {strengths.map((item: { type: string; label: string; averageScore: number }) => (
                      <div key={item.type} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-800">{item.label}</span>
                        <Badge variant="default" className="bg-green-500">
                          {item.averageScore}점
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    아직 강점 영역이 없습니다. 75점 이상을 목표로 연습해보세요!
                  </p>
                )}
              </div>

              {/* 개선 영역 */}
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  개선 필요 영역
                </h4>
                {weaknesses.length > 0 ? (
                  <div className="space-y-2">
                    {weaknesses.map((item: { type: string; label: string; averageScore: number }) => (
                      <div key={item.type} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                        <span className="text-sm font-medium text-amber-800">{item.label}</span>
                        <Badge variant="outline" className="border-amber-500 text-amber-700">
                          {item.averageScore}점
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    모든 영역에서 좋은 성과를 보이고 있습니다! 🎉
                  </p>
                )}
              </div>

              {/* 개선 추천 */}
              {weaknesses.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">💡 개선 추천</h4>
                  <p className="text-xs text-blue-700">
                    {weaknesses[0]?.label} 영역의 점수가 가장 낮습니다. 
                    해당 유형의 질문에 대한 답변 연습을 더 해보세요. 
                    구체적인 경험과 수치를 포함하면 점수가 올라갑니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 유형별 바 차트 */}
        {typePerformance && typePerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>질문 유형별 답변 횟수 및 점수</CardTitle>
              <CardDescription>
                각 유형별로 얼마나 연습했는지 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typePerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="label" type="category" width={100} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'averageScore' ? `${value}점` : `${value}회`,
                        name === 'averageScore' ? '평균 점수' : '답변 횟수'
                      ]}
                    />
                    <Bar dataKey="averageScore" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
