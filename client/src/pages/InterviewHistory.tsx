import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Eye,
  Calendar,
  Briefcase,
  TrendingUp,
  FileText,
  ChevronRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function InterviewHistory() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const { data: sessions, isLoading } = trpc.interview.getHistory.useQuery();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleDownloadPDF = async (sessionId: number) => {
    // PDF 다운로드 로직
    alert('PDF 다운로드 기능은 곧 추가됩니다!');
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">면접 이력</h1>
          <p className="text-muted-foreground">
            지금까지 진행한 면접 연습 기록을 확인하고 결과지를 다운로드하세요
          </p>
        </div>

        {!sessions || sessions.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">아직 면접 이력이 없습니다</p>
              <p className="text-muted-foreground mb-6">
                첫 면접 연습을 시작해보세요!
              </p>
              <Button>면접 시작하기</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session: any) => (
              <Card key={session.id} className="glass-effect hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        {session.companyName} - {session.jobTitle}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.createdAt)}
                        </span>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                          {session.status === 'completed' ? '완료' : '진행 중'}
                        </Badge>
                      </CardDescription>
                    </div>
                    {session.status === 'completed' && session.averageScore && (
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(session.averageScore)}`}>
                          {session.averageScore}점
                        </div>
                        <p className="text-sm text-muted-foreground">평균 점수</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-secondary/20 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{session.questionCount || 0}</p>
                      <p className="text-xs text-muted-foreground">질문 수</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-500">{session.followUpCount || 0}</p>
                      <p className="text-xs text-muted-foreground">꼬리질문</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{session.passRate || 0}점</p>
                      <p className="text-xs text-muted-foreground">답변 준비도</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/20 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-500">{session.duration || 0}분</p>
                      <p className="text-xs text-muted-foreground">소요 시간</p>
                    </div>
                  </div>

                  {session.status === 'completed' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        상세 보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(session.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF 다운로드
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 상세 보기 모달 */}
        <Dialog open={selectedSession !== null} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>면접 결과 상세</DialogTitle>
              <DialogDescription>
                면접 연습 결과를 자세히 확인하세요
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-6">
                {/* 여기에 상세 결과 표시 */}
                <p className="text-muted-foreground">상세 결과 표시 (개발 중)</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
