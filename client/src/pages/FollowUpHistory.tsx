import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Bookmark, 
  BookmarkCheck, 
  Zap, 
  TrendingUp, 
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function FollowUpHistory() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: history, isLoading, refetch } = trpc.interview.getFollowUpHistory.useQuery();
  const { data: bookmarked } = trpc.interview.getBookmarkedFollowUps.useQuery();
  const { data: stats } = trpc.interview.getFollowUpStatsByDifficulty.useQuery();
  
  const toggleBookmarkMutation = trpc.interview.toggleFollowUpBookmark.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("북마크가 업데이트되었습니다");
    },
  });

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const displayHistory = activeTab === 'bookmarked' ? bookmarked : history;

  // 난이도별 통계 차트 데이터
  const chartData = stats?.byDifficulty ? [
    { name: '쉬움', count: stats.byDifficulty.easy?.count || 0, avgScore: stats.byDifficulty.easy?.avgScore || 0, fill: '#22c55e' },
    { name: '보통', count: stats.byDifficulty.medium?.count || 0, avgScore: stats.byDifficulty.medium?.avgScore || 0, fill: '#eab308' },
    { name: '어려움', count: stats.byDifficulty.hard?.count || 0, avgScore: stats.byDifficulty.hard?.avgScore || 0, fill: '#ef4444' },
  ] : [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            꼬리 질문 연습 이력
          </h1>
          <p className="text-muted-foreground mt-1">
            면접에서 받은 후속 질문과 답변을 복습하고 약점을 파악하세요
          </p>
        </div>

        {/* 통계 요약 */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCount || 0}</p>
                  <p className="text-sm text-muted-foreground">총 후속 질문</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.avgScore || 0}점</p>
                  <p className="text-sm text-muted-foreground">평균 점수</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <BookmarkCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookmarked?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">북마크</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 난이도별 통계 차트 */}
        {chartData.length > 0 && chartData.some(d => d.count > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                난이도별 통계
              </CardTitle>
              <CardDescription>각 난이도별 연습 횟수와 평균 점수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'avgScore' ? `${value}점` : `${value}회`,
                        name === 'avgScore' ? '평균 점수' : '연습 횟수'
                      ]}
                    />
                    <Bar dataKey="avgScore" name="평균 점수" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {chartData.map((item) => (
                  <div key={item.name} className="text-center">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.count}회 연습</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              전체 ({history?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="bookmarked" className="gap-1">
              <Bookmark className="w-4 h-4" />
              북마크 ({bookmarked?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-4">
            {!displayHistory || displayHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {activeTab === 'bookmarked' 
                      ? '북마크한 후속 질문이 없습니다' 
                      : '아직 후속 질문 연습 이력이 없습니다'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    면접 중 후속 질문에 답변하면 여기에 기록됩니다
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayHistory.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getDifficultyColor(item.difficulty)}>
                            {getDifficultyLabel(item.difficulty)}
                          </Badge>
                          {item.followUpScore && (
                            <span className={`font-bold ${getScoreColor(item.followUpScore)}`}>
                              {item.followUpScore}점
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="font-medium text-sm line-clamp-2">
                          {item.followUpQuestion}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmarkMutation.mutate({
                              id: item.id,
                              isBookmarked: !item.isBookmarked,
                            });
                          }}
                        >
                          {item.isBookmarked ? (
                            <BookmarkCheck className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Bookmark className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                        {expandedId === item.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedId === item.id && (
                    <CardContent className="border-t bg-muted/30">
                      <div className="space-y-4 pt-4">
                        {item.followUpAnswer && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">내 답변</p>
                            <p className="text-sm bg-white p-3 rounded-lg border">
                              {item.followUpAnswer}
                            </p>
                          </div>
                        )}
                        
                        {item.followUpFeedback && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI 피드백</p>
                            <p className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                              {item.followUpFeedback}
                            </p>
                          </div>
                        )}
                        
                        {item.originalQuestion && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">원래 질문</p>
                            <p className="text-sm text-muted-foreground">
                              {item.originalQuestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
