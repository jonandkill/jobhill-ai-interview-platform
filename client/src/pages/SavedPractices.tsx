import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/safeHtml";
import { 
  Bookmark, 
  Star, 
  StarOff, 
  Trash2, 
  Eye, 
  Loader2,
  FileText,
  Calendar,
  Building2,
  Briefcase,
  Download,
  MessageSquare,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Streamdown } from "streamdown";
import SocialShare from "@/components/SocialShare";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

interface QAItem {
  question: string;
  questionType: string;
  userAnswer?: string;
  feedback?: string;
  score?: number;
  strengths?: string;
  improvements?: string;
  suggestedAnswer?: string;
}

interface BalanceAnalysis {
  personality: number;
  experience: number;
  technical: number;
  situational: number;
  company: number;
}

interface ParsedContent {
  qas?: QAItem[];
  passRate?: number;
  balanceAnalysis?: BalanceAnalysis;
  raw?: string;
}

export default function SavedPractices() {
  const { data: practices, isLoading, refetch } = trpc.savedPractices.list.useQuery();
  const [selectedPractice, setSelectedPractice] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const updateMutation = trpc.savedPractices.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("업데이트되었습니다.");
    },
  });

  const deleteMutation = trpc.savedPractices.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("삭제되었습니다.");
    },
  });

  const toggleFavorite = (id: number, currentValue: boolean) => {
    updateMutation.mutate({ id, isFavorite: !currentValue });
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate({ id });
    }
  };

  const viewDetail = (practice: any) => {
    setSelectedPractice(practice);
    setDetailOpen(true);
  };

  const getPracticeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mock_interview: "모의 면접",
      difficult_question: "어려운 질문",
      custom: "직접 입력",
    };
    return labels[type] || type;
  };

  const parseContent = (content: string): ParsedContent => {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "우수";
    if (score >= 70) return "양호";
    if (score >= 50) return "보통";
    return "개선 필요";
  };

  // PDF 다운로드 함수
  const handleDownloadPDF = (practice: any) => {
    const content = parseContent(practice.content);
    const qas = content.qas || [];
    
    let pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(practice.title)} - 면접 연습 결과</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a365d; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .info { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .qa-item { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .question { font-weight: bold; color: #1a365d; margin-bottom: 10px; }
    .answer { background: #f0fff4; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
    .feedback { background: #ebf8ff; padding: 10px; border-radius: 4px; }
    .score { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .score-high { background: #c6f6d5; color: #22543d; }
    .score-mid { background: #fef3c7; color: #92400e; }
    .score-low { background: #fed7d7; color: #9b2c2c; }
    .summary { background: linear-gradient(135deg, #1a365d, #2d3748); color: white; padding: 20px; border-radius: 8px; margin-top: 30px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🎯 면접 연습 결과</h1>
  <div class="info">
    <p><strong>제목:</strong> ${escapeHtml(practice.title)}</p>
    <p><strong>날짜:</strong> ${new Date(practice.createdAt).toLocaleString("ko-KR")}</p>
    ${practice.companyName ? `<p><strong>회사:</strong> ${escapeHtml(practice.companyName)}</p>` : ''}
    ${practice.positionName ? `<p><strong>직무:</strong> ${escapeHtml(practice.positionName)}</p>` : ''}
    ${practice.overallScore ? `<p><strong>평균 점수:</strong> ${practice.overallScore}점</p>` : ''}
  </div>
`;

    if (qas.length > 0) {
      pdfContent += `<h2>📝 질문 및 답변</h2>`;
      qas.forEach((qa, idx) => {
        const scoreClass = (qa.score || 0) >= 70 ? 'score-high' : (qa.score || 0) >= 50 ? 'score-mid' : 'score-low';
        pdfContent += `
  <div class="qa-item">
    <div class="question">Q${idx + 1}. ${escapeHtmlWithBreaks(qa.question)}</div>
    ${qa.userAnswer ? `<div class="answer"><strong>내 답변:</strong><br>${escapeHtmlWithBreaks(qa.userAnswer)}</div>` : ''}
    ${qa.feedback ? `<div class="feedback"><strong>AI 피드백:</strong><br>${escapeHtmlWithBreaks(qa.feedback)}</div>` : ''}
    ${qa.score ? `<p><span class="score ${scoreClass}">${qa.score}점</span></p>` : ''}
    ${qa.strengths ? `<p><strong>💪 강점:</strong> ${escapeHtmlWithBreaks(qa.strengths)}</p>` : ''}
    ${qa.improvements ? `<p><strong>📈 개선점:</strong> ${escapeHtmlWithBreaks(qa.improvements)}</p>` : ''}
    ${qa.suggestedAnswer ? `<p><strong>💡 모범 답안:</strong> ${escapeHtmlWithBreaks(qa.suggestedAnswer)}</p>` : ''}
  </div>
`;
      });
    }

    if (content.passRate || content.balanceAnalysis) {
      pdfContent += `
  <div class="summary">
    <h2 style="color: white; margin-top: 0;">📊 분석 결과</h2>
    ${content.passRate ? `<p><strong>답변 준비도:</strong> ${content.passRate}점 (실제 합격 확률이 아닌 연습 지표)</p>` : ''}
    ${content.balanceAnalysis ? `
    <p><strong>답변 밸런스:</strong></p>
    <ul>
      <li>인성/가치관: ${content.balanceAnalysis.personality}%</li>
      <li>경험/성과: ${content.balanceAnalysis.experience}%</li>
      <li>기술/전문성: ${content.balanceAnalysis.technical}%</li>
      <li>상황 대처: ${content.balanceAnalysis.situational}%</li>
      <li>기업 이해도: ${content.balanceAnalysis.company}%</li>
    </ul>
    ` : ''}
  </div>
`;
    }

    pdfContent += `
  <p style="text-align: center; margin-top: 40px; color: #718096;">
    AI 면접 코치 - ${new Date().toLocaleDateString("ko-KR")} 생성
  </p>
</body>
</html>
`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bookmark className="w-6 h-6" />
              저장된 연습
            </h1>
            <p className="text-muted-foreground mt-1">
              면접 연습 내역을 한눈에 확인하세요
            </p>
          </div>
          <SocialShare 
            title="AI 면접 코치로 면접 준비하기"
            description="나만의 면접 연습 기록을 공유해보세요"
          />
        </div>

        {!practices || practices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">저장된 연습이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                면접 연습 후 저장 버튼을 눌러 기록을 남겨보세요
              </p>
              <Button asChild>
                <a href="/interview">면접 시작하기</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 즐겨찾기 먼저 표시 */}
            {practices
              .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
              .map((practice) => {
                const content = parseContent(practice.content);
                
                return (
                  <Card key={practice.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg truncate">{practice.title}</CardTitle>
                            {practice.isFavorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-4 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(practice.createdAt).toLocaleDateString("ko-KR")}
                            </span>
                            {practice.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {practice.companyName}
                              </span>
                            )}
                            {practice.positionName && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {practice.positionName}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary">
                            {getPracticeTypeLabel(practice.practiceType || "mock_interview")}
                          </Badge>
                          {practice.overallScore && (
                            <Badge variant="outline" className="font-bold">
                              {practice.overallScore}점
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {practice.notes && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {practice.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => viewDetail(practice)}
                        >
                          <Eye className="w-4 h-4" />
                          상세보기
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleDownloadPDF(practice)}
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(practice.id, practice.isFavorite || false)}
                        >
                          {practice.isFavorite ? (
                            <StarOff className="w-4 h-4" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(practice.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* 상세보기 다이얼로그 - 개선된 UI */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedPractice?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedPractice && (() => {
              const content = parseContent(selectedPractice.content);
              const qas = content.qas || [];
              const avgScore = qas.length > 0 
                ? Math.round(qas.reduce((sum, qa) => sum + (qa.score || 0), 0) / qas.length)
                : selectedPractice.overallScore || 0;

              return (
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(selectedPractice.createdAt).toLocaleString("ko-KR")}
                    </Badge>
                    {selectedPractice.companyName && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="w-3 h-3" />
                        {selectedPractice.companyName}
                      </Badge>
                    )}
                    {selectedPractice.positionName && (
                      <Badge variant="outline" className="gap-1">
                        <Briefcase className="w-3 h-3" />
                        {selectedPractice.positionName}
                      </Badge>
                    )}
                  </div>

                  {/* 요약 카드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">질문 수</p>
                        <p className="text-2xl font-bold text-blue-600">{qas.length}개</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">평균 점수</p>
                        <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}점</p>
                        <p className="text-xs text-muted-foreground">{getScoreLabel(avgScore)}</p>
                      </CardContent>
                    </Card>
                    {content.passRate && (
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground">답변 준비도</p>
                          <p className="text-2xl font-bold text-purple-600">{content.passRate}점</p>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">연습 유형</p>
                        <p className="text-sm font-bold text-amber-600">
                          {getPracticeTypeLabel(selectedPractice.practiceType || "mock_interview")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 밸런스 분석 차트 */}
                  {content.balanceAnalysis && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          답변 밸런스 분석
                        </CardTitle>
                        <CardDescription>대기업 채용 기준 5대 평가 요소</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                              { subject: '인성/가치관', value: content.balanceAnalysis.personality, fullMark: 100 },
                              { subject: '경험/성과', value: content.balanceAnalysis.experience, fullMark: 100 },
                              { subject: '기술/전문성', value: content.balanceAnalysis.technical, fullMark: 100 },
                              { subject: '상황 대처', value: content.balanceAnalysis.situational, fullMark: 100 },
                              { subject: '기업 이해도', value: content.balanceAnalysis.company, fullMark: 100 },
                            ]}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <Radar
                                name="점수"
                                dataKey="value"
                                stroke="#d4af37"
                                fill="#d4af37"
                                fillOpacity={0.5}
                              />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 질문별 상세 내용 */}
                  {qas.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        질문 및 답변 ({qas.length}개)
                      </h3>
                      {qas.map((qa, idx) => (
                        <Card key={idx} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <Badge variant="secondary" className="mb-2">Q{idx + 1}</Badge>
                                <CardTitle className="text-base">{qa.question}</CardTitle>
                              </div>
                              {qa.score !== undefined && (
                                <Badge className={`shrink-0 ${
                                  qa.score >= 70 ? 'bg-green-100 text-green-700' :
                                  qa.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {qa.score}점
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* 내 답변 */}
                            {qa.userAnswer && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs font-medium text-blue-700 mb-1">💬 내 답변</p>
                                <p className="text-sm text-blue-900 whitespace-pre-wrap">{qa.userAnswer}</p>
                              </div>
                            )}

                            {/* AI 피드백 */}
                            {qa.feedback && (
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <p className="text-xs font-medium text-purple-700 mb-1">🤖 AI 피드백</p>
                                <p className="text-sm text-purple-900 whitespace-pre-wrap">{qa.feedback}</p>
                              </div>
                            )}

                            {/* 강점 & 개선점 */}
                            <div className="grid sm:grid-cols-2 gap-3">
                              {qa.strengths && (
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> 강점
                                  </p>
                                  <p className="text-sm text-green-900">{qa.strengths}</p>
                                </div>
                              )}
                              {qa.improvements && (
                                <div className="p-3 bg-amber-50 rounded-lg">
                                  <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> 개선점
                                  </p>
                                  <p className="text-sm text-amber-900">{qa.improvements}</p>
                                </div>
                              )}
                            </div>

                            {/* 모범 답안 */}
                            {qa.suggestedAnswer && (
                              <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="text-xs font-medium text-gray-700 mb-1">💡 모범 답안</p>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{qa.suggestedAnswer}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* 메모 */}
                  {selectedPractice.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">📝 메모</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedPractice.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Raw 콘텐츠 (파싱 실패 시) */}
                  {content.raw && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">원본 내용</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{content.raw}</Streamdown>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 하단 버튼 */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadPDF(selectedPractice)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PDF 다운로드
                    </Button>
                    <Button onClick={() => setDetailOpen(false)}>
                      닫기
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
