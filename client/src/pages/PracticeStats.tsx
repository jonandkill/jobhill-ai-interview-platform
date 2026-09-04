import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Lightbulb,
  ArrowRight,
  Calendar,
  Award,
  AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import React from "react";

export default function PracticeStats() {
  const { data: stats, isLoading } = trpc.interview.getStats.useQuery();
  
  // AI 기반 추천 데이터 생성
  const recommendations = React.useMemo(() => {
    if (!stats || !stats.topImprovements || stats.topImprovements.length === 0) {
      return [
        { title: "인성 면접 연습", description: "가치관 및 성격 관련 질문 연습", link: "/interview", priority: "high" },
        { title: "경험 면접 연습", description: "경력 기반 질문 연습", link: "/interview", priority: "medium" },
        { title: "직무 역량 면접", description: "직무 지식 및 기술 질문 연습", link: "/interview", priority: "medium" },
        { title: "상황 대처 면접", description: "문제 해결 능력 평가 연습", link: "/interview", priority: "low" },
      ];
    }

    // 개선 필요 영역 기반 추천
    const improvementBased = stats.topImprovements.slice(0, 2).map((imp: any) => ({
      title: `${imp.name} 집중 연습`,
      description: `${imp.name} 영역의 답변 품질을 향상시키세요`,
      link: "/interview",
      priority: "high"
    }));

    // 일반 추천
    const generalRecs = [
      { title: "꼬리 질문 대응 연습", description: "압박 면접 상황 대비 훈련", link: "/interview", priority: "medium" },
      { title: "게임형 평가 체험", description: "인터랙티브 평가로 실전 감각 향상", link: "/game-assessment", priority: "low" },
    ];

    return [...improvementBased, ...generalRecs];
  }, [stats]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">연습 통계</h1>
          <p className="text-muted-foreground">
            면접 연습 기록을 분석하고 개선 방향을 확인하세요
          </p>
        </div>

        {/* 전체 통계 요약 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardDescription>총 연습 횟수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedSessions || 0}회 완료
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardDescription>평균 점수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{stats?.averageScore || 0}점</div>
              <div className="flex items-center gap-1 mt-1">
                {stats?.scoreHistory && stats.scoreHistory.length >= 2 ? (
                  (() => {
                    const improvement = stats.scoreHistory[stats.scoreHistory.length - 1].score - stats.scoreHistory[0].score;
                    return improvement > 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-500">+{improvement}점</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500">{improvement}점</span>
                      </>
                    );
                  })()
                ) : (
                  <span className="text-xs text-muted-foreground">데이터 부족</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardDescription>최고 점수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {stats?.scoreHistory && stats.scoreHistory.length > 0
                  ? Math.max(...stats.scoreHistory.map(s => s.score))
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                최고 기록
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="pb-2">
              <CardDescription>최근 점수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {stats?.scoreHistory && stats.scoreHistory.length > 0
                  ? stats.scoreHistory[stats.scoreHistory.length - 1].score
                  : 0}
              </div>
              <Progress value={stats?.scoreHistory && stats.scoreHistory.length > 0 ? stats.scoreHistory[stats.scoreHistory.length - 1].score : 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* AI 피드백 및 개선 방향 */}
        <Card className="glass-effect border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI 분석 피드백
            </CardTitle>
            <CardDescription>
              연습 데이터를 분석한 결과입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 강점 영역 */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-green-500">강점 영역</h3>
              </div>
              <div className="space-y-2">
                {stats?.topStrengths?.slice(0, 3).map((strength: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{strength.name}</span>
                    <Badge variant="outline">{strength.count}회</Badge>
                  </div>
                )) || <p className="text-sm text-muted-foreground">데이터가 충분하지 않습니다.</p>}
              </div>
            </div>

            {/* 개선 필요 영역 */}
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-orange-500">개선 필요 영역</h3>
              </div>
              <div className="space-y-2">
                {stats?.topImprovements?.slice(0, 3).map((improvement: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{improvement.name}</span>
                    <Badge variant="outline">{improvement.count}회</Badge>
                  </div>
                )) || <p className="text-sm text-muted-foreground">데이터가 충분하지 않습니다.</p>}
              </div>
            </div>

            {/* 추천 학습 방향 */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-blue-500">추천 학습 방향</h3>
              </div>
              <ul className="space-y-2">
                {recommendations.slice(0, 3).map((rec: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{rec.title}: {rec.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 질문 유형별 통계 */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              질문 유형별 통계
            </CardTitle>
            <CardDescription>
              각 질문 유형별 답변 횟수와 평균 점수를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.questionTypeStats && stats.questionTypeStats.length > 0 ? (
                stats.questionTypeStats.map((type: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{type.type}</p>
                      <p className="text-xs text-muted-foreground">{type.count}회 답변</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{type.avgScore}점</p>
                        <p className="text-xs text-muted-foreground">평균</p>
                      </div>
                      <Progress value={type.avgScore} className="w-20" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  아직 데이터가 충분하지 않습니다. 더 많은 면접을 연습해보세요!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 추천 연습 */}
        <Card className="glass-effect border-primary/30">
          <CardHeader>
            <CardTitle>다음 연습 추천</CardTitle>
            <CardDescription>
              부족한 영역을 보완하기 위한 맞춤 연습을 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.slice(0, 4).map((rec: any, index: number) => (
                <Link key={index} href={rec.link}>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <div className="text-left">
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
