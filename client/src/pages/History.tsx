import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Calendar,
  Download,
  History as HistoryIcon,
  Loader2,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/safeHtml";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";

export default function History() {
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: sessions, isLoading } = trpc.interview.list.useQuery({
    position: selectedPosition !== 'all' ? selectedPosition : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const [downloadingPdf, setDownloadingPdf] = useState<number | null>(null);
  const utils = trpc.useUtils();
  
  const toggleFavoriteMutation = trpc.interview.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
      toast.success('즐겨찾기가 업데이트되었습니다.');
    },
    onError: () => {
      toast.error('즐겨찾기 업데이트에 실패했습니다.');
    },
  });
  
  const deleteSessionMutation = trpc.interview.deleteSession.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
      toast.success('면접 결과가 삭제되었습니다.');
    },
    onError: () => {
      toast.error('면접 결과 삭제에 실패했습니다.');
    },
  });
  
  const handleDelete = (sessionId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('정말로 이 면접 결과를 삭제하시겠습니까?')) {
      deleteSessionMutation.mutate({ sessionId });
    }
  };
  
  const handleDownloadPDF = async (sessionId: number) => {
    setDownloadingPdf(sessionId);
    try {
      toast.info("PDF 데이터를 불러오는 중...");
      
      // tRPC 직접 호출 대신 fetch 사용 (credentials 포함)
      const response = await fetch(`/api/trpc/interview.getPdfData?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF API error:', response.status, errorText);
        throw new Error(`API 오류: ${response.status}`);
      }
      
      const result = await response.json();
      
      // tRPC 응답 구조 확인
      if (!result || !result.result || !result.result.data) {
        console.error('Invalid API response:', result);
        throw new Error('잘못된 API 응답 형식');
      }
      
      const data = result.result.data;

      const avgScore = data.qas.length > 0
        ? Math.round(data.qas.reduce((sum: number, qa: any) => sum + (qa.score || 0), 0) / data.qas.length)
        : 0;

      // Blob 기반 직접 다운로드 (HTML 파일로 저장)
      const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 면접 코치 - 면접 결과 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', '맑은 고딕', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1e3a5f; }
    .header h1 { color: #1e3a5f; font-size: 24px; margin-bottom: 10px; }
    .header p { color: #666; font-size: 14px; }
    .summary { display: flex; justify-content: space-around; gap: 20px; margin-bottom: 40px; }
    .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
    .summary-card h3 { font-size: 12px; color: #666; margin-bottom: 8px; }
    .summary-card .value { font-size: 28px; font-weight: bold; color: #1e3a5f; }
    .qa-section { margin-bottom: 30px; page-break-inside: avoid; }
    .qa-header { background: #1e3a5f; color: white; padding: 12px 16px; border-radius: 8px 8px 0 0; }
    .qa-header h3 { font-size: 14px; }
    .qa-content { border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; }
    .qa-item { margin-bottom: 16px; }
    .qa-item:last-child { margin-bottom: 0; }
    .qa-label { font-size: 12px; color: #666; margin-bottom: 4px; font-weight: bold; }
    .qa-text { font-size: 14px; white-space: pre-wrap; }
    .score { display: inline-block; background: #d4a574; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .feedback-box { background: #f0f7ff; padding: 12px; border-radius: 6px; margin-top: 12px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
    @media print { body { padding: 20px; } .qa-section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI 면접 코치 - 면접 결과 리포트</h1>
    <p>생성일: ${new Date().toLocaleDateString('ko-KR')} | 세션 ID: ${sessionId}</p>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <h3>평균 점수</h3>
      <div class="value">${avgScore}점</div>
    </div>
    <div class="summary-card">
      <h3>질문 수</h3>
      <div class="value">${data.qas.length}개</div>
    </div>
    <div class="summary-card">
      <h3>면접 유형</h3>
      <div class="value" style="font-size: 16px;">모의 면접</div>
    </div>
  </div>

  ${data.qas.map((qa: any, idx: number) => `
    <div class="qa-section">
      <div class="qa-header">
        <h3>Q${idx + 1}. ${escapeHtmlWithBreaks(qa.question || '')}</h3>
      </div>
      <div class="qa-content">
        <div class="qa-item">
          <div class="qa-label">나의 답변</div>
          <div class="qa-text">${escapeHtmlWithBreaks(qa.userAnswer || '답변 없음')}</div>
        </div>
        ${qa.score ? `
          <div class="qa-item">
            <div class="qa-label">점수</div>
            <span class="score">${qa.score}점</span>
          </div>
        ` : ''}
        ${qa.feedback ? `
          <div class="feedback-box">
            <div class="qa-label">AI 피드백</div>
            <div class="qa-text">${escapeHtmlWithBreaks(qa.feedback)}</div>
          </div>
        ` : ''}
        <div style="background: #fdf2f8; border-left: 4px solid #db2777; padding: 12px; border-radius: 4px; margin-top: 12px;">
          <div class="qa-label" style="color: #be185d;">[비교 분석] 사용자 답변 스크립트 vs AI 교정 가이드</div>
          <p style="font-size: 13px; margin-bottom: 6px;"><strong>· 원본 답변:</strong> ${escapeHtmlWithBreaks(qa.userAnswer || '답변 없음')}</p>
          <p style="font-size: 13px;"><strong>· AI 교정 가이드:</strong> ${escapeHtmlWithBreaks(qa.improvements || qa.suggestedAnswer || '교정 내용 없음')}</p>
        </div>
        ${qa.suggestedAnswer ? `
          <div class="qa-item" style="margin-top: 12px;">
            <div class="qa-label">모범 답안</div>
            <div class="qa-text" style="color: #1e3a5f;">${escapeHtmlWithBreaks(qa.suggestedAnswer)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('')}

  <div class="footer">
    <p>${escapeHtml(PUBLIC_BUSINESS_INFO.name)} AI 면접 코치 | 고객지원: ${escapeHtml(displayBusinessValue(PUBLIC_BUSINESS_INFO.supportEmail))} | ${escapeHtml(displayBusinessValue(PUBLIC_BUSINESS_INFO.phone))}</p>
    <p style="margin-top: 8px; font-size: 11px;">이 파일을 브라우저에서 열고 Ctrl+P(또는 Cmd+P)를 눌러 PDF로 저장하세요.</p>
  </div>
</body>
</html>`;

      // Blob으로 직접 다운로드
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `면접결과_${sessionId}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("HTML 파일이 다운로드되었습니다. 브라우저에서 열고 Ctrl+P로 PDF 저장하세요.");
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">완료</span>;
      case "in_progress":
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">진행중</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">대기</span>;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "mock_interview":
        return "모의 면접";
      case "feedback_only":
        return "피드백 분석";
      default:
        return type;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">면접 이력</h1>
            <p className="text-muted-foreground">
              지금까지 진행한 면접 세션을 확인하세요
            </p>
          </div>
          <Link href="/interview">
            <Button className="gap-2">
              새 면접 시작
            </Button>
          </Link>
        </div>

        {/* 직무 및 날짜 기간 필터 바 */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium whitespace-nowrap">직무 필터:</span>
              <select
                className="flex h-9 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
              >
                <option value="all">전체 직무</option>
                <option value="프론트엔드">프론트엔드</option>
                <option value="백엔드">백엔드</option>
                <option value="기획">기획/PM</option>
                <option value="마케팅">마케팅</option>
                <option value="영업">영업</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium whitespace-nowrap">시작일:</span>
              <input
                type="date"
                className="flex h-9 w-full md:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium whitespace-nowrap">종료일:</span>
              <input
                type="date"
                className="flex h-9 w-full md:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(selectedPosition !== 'all' || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPosition('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                필터 초기화
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 역량 변화 추이 그래프 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> 면접 점수 및 역량 성장 추이
            </CardTitle>
            <CardDescription>필터링된 기간 동안의 세션별 점수 변화 흐름입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions && sessions.length > 0 ? (
              <div className="h-40 flex items-end gap-2 pt-6 px-2 border-b border-border">
                {sessions.slice(-10).map((s: any, idx: number) => {
                  const score = s.overallScore || 0;
                  const heightPercent = Math.max(Math.min(score, 100), 10);
                  return (
                    <div key={s.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-8 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {score}점 ({new Date(s.createdAt).toLocaleDateString()})
                      </div>
                      <div 
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">조건에 해당하는 면접 기록이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                총 면접 횟수
              </CardTitle>
              <HistoryIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions?.length || 0}회</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                완료된 면접
              </CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions?.filter(s => s.status === "completed").length || 0}회
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                평균 점수
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions && sessions.filter(s => s.overallScore).length > 0
                  ? Math.round(
                      sessions.filter(s => s.overallScore)
                        .reduce((sum, s) => sum + (s.overallScore || 0), 0) /
                      sessions.filter(s => s.overallScore).length
                    )
                  : 0}점
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 면접 목록 */}
        {sessions && sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm md:text-base truncate">
                            {getSessionTypeLabel(session.sessionType)}
                          </p>
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="truncate">
                              {new Date(session.createdAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                          <span className="whitespace-nowrap">
                            질문 {session.totalQuestions}개
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
                      {session.overallScore && (
                        <div className="text-left md:text-right">
                          <p className="text-xs md:text-sm text-muted-foreground">점수</p>
                          <p className="text-xl md:text-2xl font-bold text-primary">{session.overallScore}점</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 md:gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavoriteMutation.mutate({ sessionId: session.id });
                          }}
                          title="즐겨찾기"
                        >
                          <Star className={`w-4 h-4 md:w-5 md:h-5 ${(session as any).isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                        {session.status === "completed" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 md:h-10 md:w-10"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownloadPDF(session.id);
                            }}
                            title="PDF 다운로드"
                          >
                            <Download className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleDelete(session.id, e)}
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                        <Link href={`/interview/${session.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">아직 면접 이력이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                첫 번째 모의 면접을 시작해보세요
              </p>
              <Link href="/interview">
                <Button>면접 시작하기</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
