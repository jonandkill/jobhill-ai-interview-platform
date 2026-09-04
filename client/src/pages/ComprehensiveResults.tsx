import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, TrendingDown, Target, Award, Calendar, 
  Eye, BarChart3, Sparkles, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, Star, Filter, Trash2
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function ComprehensiveResults() {
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetScore, setTargetScore] = useState(70);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const utils = trpc.useUtils();

  // 면접 이력 조회
  const historyQuery = trpc.interview.list.useQuery();
  const statsQuery = trpc.interview.getStats.useQuery();
  const targetScoreQuery = trpc.user.getTargetScore.useQuery();
  
  const toggleFavoriteMutation = trpc.interview.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
    },
  });
  
  const deleteSessionMutation = trpc.interview.deleteSession.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
    },
  });
  
  const handleDelete = (sessionId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('정말로 이 면접 결과를 삭제하시겠습니까?')) {
      deleteSessionMutation.mutate({ sessionId });
    }
  };
  
  const setTargetScoreMutation = trpc.user.setTargetScore.useMutation({
    onSuccess: () => {
      utils.user.getTargetScore.invalidate();
      setIsEditingTarget(false);
    },
  });
  
  // 목표 점수 초기화
  useState(() => {
    if (targetScoreQuery.data) {
      setTargetScore(targetScoreQuery.data.targetScore);
    }
  });

  const allSessions = historyQuery.data || [];
  const sessions = showFavoritesOnly 
    ? allSessions.filter((s: any) => s.isFavorite) 
    : allSessions;
  const stats = statsQuery.data;

  // 기존 passRate 컬럼은 화면에서 답변 준비도 지표로 해석합니다.
  const averagePassRate = sessions.length > 0
    ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.passRate || 0), 0) / sessions.length)
    : 0;

  // 최근 성장 추이 (최근 5개 vs 이전 5개 평균 점수 비교)
  const recentSessions = sessions.slice(0, 5);
  const previousSessions = sessions.slice(5, 10);
  const recentAvgScore = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((sum: number, s: any) => sum + (s.overallScore || 0), 0) / recentSessions.length)
    : 0;
  const previousAvgScore = previousSessions.length > 0
    ? Math.round(previousSessions.reduce((sum: number, s: any) => sum + (s.overallScore || 0), 0) / previousSessions.length)
    : 0;
  const scoreImprovement = recentAvgScore - previousAvgScore;
  
  // 목표 달성률 계산
  const currentTarget = targetScoreQuery.data?.targetScore || 70;
  const achievementRate = recentAvgScore > 0 ? Math.round((recentAvgScore / currentTarget) * 100) : 0;

  // 카테고리별 평균 점수 계산
  const categoryScores = sessions.reduce((acc: Record<string, number[]>, session: any) => {
    if (session.balanceAnalysis) {
      try {
        const balance = typeof session.balanceAnalysis === 'string' 
          ? JSON.parse(session.balanceAnalysis) 
          : session.balanceAnalysis;
        
        if (balance && typeof balance === 'object') {
          Object.keys(balance).forEach(key => {
            if (!acc[key]) acc[key] = [];
            const value = Number(balance[key]);
            if (!isNaN(value)) {
              acc[key].push(value);
            }
          });
        }
      } catch (error) {
        console.error('[종합평가] balanceAnalysis JSON 파싱 오류:', error, session.balanceAnalysis);
        // JSON 파싱 실패 시 무시하고 계속
      }
    }
    return acc;
  }, {} as Record<string, number[]>);

  const categoryAverages = Object.entries(categoryScores).map(([category, scores]) => ({
    category,
    average: Math.round((scores as number[]).reduce((sum: number, s: number) => sum + s, 0) / (scores as number[]).length),
    label: getCategoryLabel(category),
  })).sort((a, b) => b.average - a.average);

  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      personality: '인성/가치관',
      experience: '경험/성과',
      technical: '직무역량',
      situational: '상황대처',
      company: '조직이해도',
    };
    return labels[category] || category;
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getPassRateColor(rate: number): string {
    if (rate >= 70) return 'bg-green-600';
    if (rate >= 50) return 'bg-blue-600';
    if (rate >= 30) return 'bg-yellow-600';
    return 'bg-red-600';
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 py-6">
        <div>
          <h1 className="text-3xl font-bold">종합 평가 결과</h1>
          <p className="text-muted-foreground mt-1">
            모든 면접 결과를 종합적으로 분석하고 성장 추이를 확인하세요
          </p>
        </div>

        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">아직 완료한 면접이 없습니다</h3>
              <p className="text-muted-foreground mb-6">
                첫 면접을 시작하고 AI 피드백을 받아보세요!
              </p>
              <Button onClick={() => setLocation('/interview')}>
                <Sparkles className="w-4 h-4 mr-2" />
                면접 시작하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 목표 설정 및 달성률 */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    목표 점수 및 달성률
                  </span>
                  {!isEditingTarget ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTarget(true)}
                    >
                      수정
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={targetScore}
                        onChange={(e) => setTargetScore(Number(e.target.value))}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => setTargetScoreMutation.mutate({ targetScore })}
                      >
                        저장
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingTarget(false);
                          setTargetScore(currentTarget);
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="text-center md:text-left">
                      <p className="text-xs md:text-sm text-muted-foreground">목표 점수</p>
                      <p className="text-xl md:text-3xl font-bold">{currentTarget}점</p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-xs md:text-sm text-muted-foreground">현재 평균</p>
                      <p className={`text-xl md:text-3xl font-bold ${getScoreColor(recentAvgScore)}`}>{recentAvgScore}점</p>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-xs md:text-sm text-muted-foreground">달성률</p>
                      <p className={`text-xl md:text-3xl font-bold ${achievementRate >= 100 ? 'text-green-600' : achievementRate >= 80 ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {achievementRate}%
                      </p>
                    </div>
                  </div>
                  <Progress value={Math.min(achievementRate, 100)} className="h-3" />
                  <div className="flex items-center gap-2 text-sm">
                    {achievementRate >= 100 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">목표 달성! 축하합니다! 🎉</span>
                      </>
                    ) : achievementRate >= 80 ? (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">목표에 거의 다 도달했어요! 조금만 더 힘내세요!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 font-medium">목표까지 {currentTarget - recentAvgScore}점 남았습니다. 꿀팁을 참고하세요!</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 종합 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    총 면접 횟수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{sessions.length}회</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    음성 {sessions.filter((s: any) => s.isVoiceMode).length}회 / 텍스트 {sessions.filter((s: any) => !s.isVoiceMode).length}회
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    평균 답변 준비도
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(averagePassRate)}`}>
                    {averagePassRate}점
                  </div>
                  <Progress value={averagePassRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    평균 점수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(stats?.averageScore || 0)}`}>
                    {stats?.averageScore || 0}점
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    최고 {Math.max(...sessions.map((s: any) => s.overallScore || 0), 0)}점
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {scoreImprovement >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    최근 성장 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {scoreImprovement >= 0 ? '+' : ''}{scoreImprovement}점
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    최근 5회 vs 이전 5회
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 카테고리별 점수 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 역량 분석</CardTitle>
                <CardDescription>
                  대기업 채용 평가 기준 5가지 영역별 평균 점수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryAverages.map((cat, index) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                          <span className="font-medium">{cat.label}</span>
                        </div>
                        <span className={`text-lg font-bold ${getScoreColor(cat.average)}`}>
                          {cat.average}점
                        </span>
                      </div>
                      <Progress value={cat.average} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 면접 이력 목록 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>면접 이력</CardTitle>
                    <CardDescription>
                      모든 면접 결과를 확인하고 재검토하세요
                    </CardDescription>
                  </div>
                  <Button
                    variant={showFavoritesOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    {showFavoritesOnly ? '전체 보기' : '즐겨찾기만'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant={session.isVoiceMode ? "default" : "secondary"} className="text-xs">
                            {session.isVoiceMode ? '음성' : '텍스트'}
                          </Badge>
                          <span className="text-xs md:text-sm text-muted-foreground truncate">
                            {new Date(session.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">점수:</span>
                            <span className={`font-bold ${getScoreColor(session.overallScore || 0)}`}>
                              {session.overallScore || 0}점
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">답변 준비도:</span>
                            <span className={`font-bold ${getScoreColor(session.passRate || 0)}`}>
                              {session.passRate || 0}점
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">질문:</span>
                            <span className="font-medium">
                              {session.completedQuestions}/{session.totalQuestions}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end md:justify-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10"
                          onClick={() => toggleFavoriteMutation.mutate({ sessionId: session.id })}
                          title="즐겨찾기"
                        >
                          <Star className={`w-4 h-4 ${(session as any).isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleDelete(session.id, e)}
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/result/${session.id}`)}
                          className="gap-1 md:gap-2 text-xs md:text-sm h-8 md:h-9"
                        >
                          <Eye className="w-3 h-3 md:w-4 md:h-4" />
                          상세 보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 성장 가이드 */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI 성장 가이드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {averagePassRate >= 70 ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600 mb-1">우수한 면접 역량!</p>
                      <p className="text-sm text-muted-foreground">
                        평균 답변 준비도는 {averagePassRate}점입니다. 높은 점수의 근거 문장을 유지하며 실제 채용 판단과는 구분하세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-600 mb-1">개선이 필요합니다</p>
                      <p className="text-sm text-muted-foreground">
                        평균 답변 준비도는 {averagePassRate}점입니다. 가장 낮은 연습 영역 한 가지부터 보완해보세요.
                      </p>
                    </div>
                  </div>
                )}

                {categoryAverages.length > 0 && categoryAverages[categoryAverages.length - 1].average < 60 && (
                  <div className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-600 mb-1">집중 개선 영역</p>
                      <p className="text-sm text-muted-foreground">
                        <strong>{categoryAverages[categoryAverages.length - 1].label}</strong> 영역이 
                        {categoryAverages[categoryAverages.length - 1].average}점으로 가장 낮습니다. 
                        이 영역의 질문을 더 연습해보세요.
                      </p>
                    </div>
                  </div>
                )}

                {scoreImprovement > 0 && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600 mb-1">성장 중입니다!</p>
                      <p className="text-sm text-muted-foreground">
                        최근 면접 점수가 {scoreImprovement}점 향상되었습니다. 꾸준히 연습하세요!
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
