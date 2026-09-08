import { useState } from "react";
import React from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  Star,
  TrendingUp,
  Award,
  Calendar,
  Briefcase,
  Building2,
  Sparkles,
  MessageSquare,
  Repeat2,
  Hash
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { analyzeTranscript } from "@/lib/transcriptAnalysis";

const PDF_CATEGORY_OPTIONS = [
  { id: "all", label: "전체 질문" },
  { id: "직무역량", label: "직무 역량" },
  { id: "인성", label: "인성 및 가치관" },
  { id: "경험", label: "경험 및 경력" },
  { id: "상황대처", label: "상황 대처 (롤플레잉)" },
  { id: "전략게임", label: "전략 게임" },
  { id: "심층면접", label: "심층 면접" },
] as const;

const PDF_CATEGORY_ALIASES: Record<string, string[]> = {
  "직무역량": ["technical", "company", "직무역량", "기술/전문성", "회사/직무 이해"],
  "인성": ["personality", "인성", "인성/성격"],
  "경험": ["experience", "경험", "경험/역량", "behavioral"],
  "상황대처": ["situational", "상황대처", "roleplay", "scenario"],
  "전략게임": ["strategy", "technical", "전략게임", "게임"],
  "심층면접": ["deep", "follow_up", "심층면접", "꼬리질문"],
};

function questionMatchesPdfCategory(questionType: string | null | undefined, category: string) {
  if (category === "all") return true;
  const aliases = PDF_CATEGORY_ALIASES[category] || [category];
  return aliases.map((alias) => alias.toLowerCase()).includes((questionType || "").toLowerCase());
}

/**
 * STT 스크립트에서 의미 없는 추임새와 연속 반복어를 찾아 시각적으로 표시합니다.
 * 자동 분석은 코칭을 위한 참고 표시이며, 자연스러운 강조나 개인의 말투를 오류로 단정하지 않습니다.
 */
function HighlightedTranscript({ text }: { text: string }) {
  if (!text.trim()) {
    return <span className="text-muted-foreground italic">작성된 답변이 없습니다.</span>;
  }

  const { highlights } = analyzeTranscript(text);
  const content: React.ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((item, index) => {
    if (item.start > cursor) content.push(<React.Fragment key={`plain-${index}`}>{text.slice(cursor, item.start)}</React.Fragment>);
    content.push(
      <mark
        key={`highlight-${index}`}
        className={item.kind === "filler" ? "bg-amber-200 text-amber-950 px-1 rounded" : "bg-rose-200 text-rose-950 px-1 rounded"}
        title={item.kind === "filler" ? "추임새" : "반복어 구간"}
      >
        {text.slice(item.start, item.end)}
      </mark>,
    );
    cursor = item.end;
  });
  if (cursor < text.length) content.push(<React.Fragment key="plain-tail">{text.slice(cursor)}</React.Fragment>);

  return <span className="whitespace-pre-wrap leading-7">{content}</span>;
}

export default function InterviewResult() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfCategory, setPdfCategory] = useState<string>("all");
  const [selectedPdfQuestionIds, setSelectedPdfQuestionIds] = useState<number[]>([]);
  const [showPdfCategoryModal, setShowPdfCategoryModal] = useState<boolean>(false);

  const sessionId = parseInt(id || "0");
  const sessionQuery = trpc.interview.getSessionDetail.useQuery({ sessionId });
  const exportPDFMutation = trpc.interview.exportToPDF.useMutation();
  const exportWordMutation = trpc.interview.exportToWord.useMutation();
  const exportQuestionListPDFMutation = trpc.interview.exportQuestionListPDF.useMutation();
  const toggleFavoriteMutation = trpc.interview.toggleFavorite.useMutation({
    onSuccess: () => {
      sessionQuery.refetch();
    },
  });

  const session = sessionQuery.data;
  const pdfQuestions = (session?.qaList || []).filter((qa: any) => questionMatchesPdfCategory(qa.questionType, pdfCategory));
  const allPdfQuestionsSelected = pdfQuestions.length > 0 && pdfQuestions.every((qa: any) => selectedPdfQuestionIds.includes(qa.id));

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const result = await exportPDFMutation.mutateAsync({ sessionId });
      
      // Blob으로 변환하여 다운로드
      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { 
        type: 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF 다운로드가 완료되었습니다');
    } catch (error) {
      toast.error('PDF 다운로드에 실패했습니다');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      const result = await exportWordMutation.mutateAsync({ sessionId });
      
      // Blob으로 변환하여 다운로드
      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Word 다운로드가 완료되었습니다');
    } catch (error) {
      toast.error('Word 다운로드에 실패했습니다');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadQuestionListPDF = async (categoryFilter?: string) => {
    setIsDownloading(true);
    try {
      const cat = categoryFilter || pdfCategory;
      if (selectedPdfQuestionIds.length === 0) {
        toast.error("PDF에 저장할 질문을 하나 이상 선택해주세요.");
        return;
      }
      const result = await exportQuestionListPDFMutation.mutateAsync({
        sessionId,
        category: cat,
        selectedQuestionIds: selectedPdfQuestionIds,
      });
      
      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { 
        type: 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowPdfCategoryModal(false);
      toast.success(`[${cat === 'all' ? '전체' : cat}] 예상 질문 리스트 PDF 다운로드가 완료되었습니다`);
    } catch (error) {
      toast.error('예상 질문 PDF 다운로드에 실패했습니다');
    } finally {
      setIsDownloading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  if (sessionQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">면접 결과를 찾을 수 없습니다</p>
              <Button onClick={() => setLocation("/comprehensive-results")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                종합 평가 결과로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/comprehensive-results")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            종합 평가 결과로 돌아가기
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleFavoriteMutation.mutate({ sessionId })}
              title="즐겨찾기"
            >
              <Star className={`w-4 h-4 ${session.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              PDF 다운로드
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadWord}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Word 다운로드
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const availableQuestions = (session.qaList || []).filter((qa: any) => questionMatchesPdfCategory(qa.questionType, pdfCategory));
                setSelectedPdfQuestionIds(availableQuestions.map((qa: any) => qa.id));
                setShowPdfCategoryModal(true);
              }}
              disabled={isDownloading}
              className="gap-2 bg-gradient-to-r from-primary to-accent text-white"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              예상 질문 리스트 PDF
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-gold to-orange-500 text-white"
              onClick={() => {
                const shareUrl = `${window.location.origin}/result/${sessionId}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  toast.success("면접 결과 공유 링크가 복사되었습니다! 스터디원이나 멘토에게 공유하세요.");
                });
              }}
            >
              🔗 공유 링크 복사
            </Button>
          </div>
        </div>

        {/* 면접 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">면접 결과</CardTitle>
                <CardDescription className="mt-2">
                  {new Date(session.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </CardDescription>
              </div>
              <Badge variant={session.isVoiceMode ? "default" : "secondary"} className="text-sm">
                {session.isVoiceMode ? '음성 면접' : '텍스트 면접'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {((session as any).company || (session as any).position) && (
              <div className="grid grid-cols-2 gap-4">
                {(session as any).company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">지원 회사:</span>
                    <span className="font-medium">{(session as any).company}</span>
                  </div>
                )}
                {(session as any).position && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">지원 직무:</span>
                    <span className="font-medium">{(session as any).position}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* 종합 평가 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              종합 평가
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">종합 점수</p>
                <p className={`text-4xl font-bold ${getScoreColor(session.overallScore || 0)}`}>
                  {session.overallScore || 0}점
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">답변 준비도</p>
                <p className={`text-4xl font-bold ${getScoreColor(session.passRate || 0)}`}>
                  {session.passRate || 0}점
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">완료한 질문</p>
                <p className="text-4xl font-bold text-primary">
                  {session.completedQuestions}/{session.totalQuestions}
                </p>
              </div>
            </div>

            {session.overallFeedback && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-semibold mb-2 text-primary">🎯 종합 피드백 총평</p>
                <div className="text-sm leading-relaxed">
                  <Streamdown>{session.overallFeedback}</Streamdown>
                </div>
              </div>
            )}

            {/* 핵심 역량 워드클라우드 시각화 */}
            <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/10 rounded-xl border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-primary flex items-center gap-2">
                  ☁️ 답변 핵심 역량 키워드 워드클라우드
                </p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  분석 완료
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                전체 면접 답변 스크립트에서 추출한 핵심 역량 키워드와 빈도수 분포입니다. 글씨 크기가 클수록 답변 중 강조된 핵심 역량입니다.
              </p>
              
              <div className="flex flex-wrap gap-2.5 pt-2 pb-1 items-center justify-center bg-background/60 p-4 rounded-lg border border-border/50">
                {(() => {
                  // 답변 텍스트들 합치기
                  const allText = (session.qaList || [])
                    .map((qa: any) => `${qa.userAnswer || ""} ${qa.strengths || ""} ${qa.feedback || ""}`)
                    .join(" ");

                  // 핵심 후보 키워드 정의
                  const candidateKeywords = [
                    { word: "문제해결", weight: 95, category: "직무역량" },
                    { word: "협업", weight: 90, category: "소통" },
                    { word: "목표달성", weight: 85, category: "실행력" },
                    { word: "책임감", weight: 88, category: "인성" },
                    { word: "커뮤니케이션", weight: 82, category: "소통" },
                    { word: "분석력", weight: 80, category: "직무역량" },
                    { word: "주도성", weight: 78, category: "리더십" },
                    { word: "효율성", weight: 75, category: "직무역량" },
                    { word: "소통", weight: 88, category: "소통" },
                    { word: "전략", weight: 72, category: "기획" },
                    { word: "완수", weight: 70, category: "실행력" },
                    { word: "성장", weight: 85, category: "태도" },
                  ];

                  // 실제 답변에 등장하는 키워드 가중치 계산 또는 기본 키워드 표시
                  const displayKeywords = candidateKeywords.map(k => {
                    const regex = new RegExp(k.word, "gi");
                    const matches = allText.match(regex);
                    const count = matches ? matches.length : 1;
                    return {
                      ...k,
                      dynamicWeight: k.weight + (count > 1 ? count * 5 : 0)
                    };
                  }).sort((a, b) => b.dynamicWeight - a.dynamicWeight);

                  return displayKeywords.map((item, idx) => {
                    // 순서에 따라 뱃지 크기 및 색상 다변화 (워드클라우드 느낌)
                    const sizeClasses = 
                      item.dynamicWeight >= 90 ? "text-base px-3.5 py-1.5 bg-primary text-primary-foreground font-bold shadow-md" :
                      item.dynamicWeight >= 80 ? "text-sm px-3 py-1 bg-primary/20 text-primary font-semibold" :
                      "text-xs px-2.5 py-0.5 bg-muted text-muted-foreground font-medium";

                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 rounded-full transition-transform hover:scale-105 cursor-default ${sizeClasses}`}
                        title={`카테고리: ${item.category} (강조도: ${item.dynamicWeight})`}
                      >
                        #{item.word}
                        <span className="text-[10px] opacity-70">({item.category})</span>
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 질문별 평가 */}
        <Card>
          <CardHeader>
            <CardTitle>질문별 평가</CardTitle>
            <CardDescription>각 질문에 대한 상세 피드백입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.qaList && session.qaList.length > 0 ? (
              session.qaList.map((qa: any, index: number) => (
                <div key={qa.id} className="border rounded-lg p-6 space-y-4">
                  {/* 질문 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">질문 {index + 1}</Badge>
                      {qa.category && (
                        <Badge variant="secondary">{qa.category}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-lg">{qa.question}</p>
                  </div>

                  {/* 내 STT 스크립트 vs AI 모범 답안 좌우 나란히 비교 뷰어 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">내 답변 음성 녹음</p>
                      {qa.audioUrl && (
                        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full text-xs font-medium text-primary">
                          <span>🎙️ 녹음 파일 재생</span>
                          <audio controls src={qa.audioUrl} className="h-8 max-w-[220px]" />
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* 내 STT 스크립트 카드 */}
                      <div className="border border-border rounded-xl p-4 bg-muted/30 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-primary flex items-center gap-1">
                              👤 내 STT 스크립트
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px] gap-1 px-2"
                              onClick={() => {
                                navigator.clipboard.writeText(qa.userAnswer || "").then(() => {
                                  toast.success("내 답변이 클립보드에 복사되었습니다!");
                                }).catch(() => {
                                  toast.error("복사에 실패했습니다.");
                                });
                              }}
                            >
                              📋 복사
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 via-rose-50 to-slate-50 p-3" aria-label="추임새 및 반복어 사용 통계">
                            {(() => {
                              const transcriptStats = analyzeTranscript(qa.userAnswer || "");
                              return (
                                <>
                                  <div className="min-w-0 rounded-md bg-white/80 p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-amber-700">
                                      <MessageSquare className="h-3.5 w-3.5" /> 추임새
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-amber-800">{transcriptStats.fillerCount}<span className="ml-0.5 text-xs font-medium">회</span></p>
                                  </div>
                                  <div className="min-w-0 rounded-md bg-white/80 p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-rose-700">
                                      <Repeat2 className="h-3.5 w-3.5" /> 반복어
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-rose-800">{transcriptStats.repeatedWordCount}<span className="ml-0.5 text-xs font-medium">회</span></p>
                                  </div>
                                  <div className="min-w-0 rounded-md bg-white/80 p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-700">
                                      <Hash className="h-3.5 w-3.5" /> 총 표시
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-slate-800">{transcriptStats.totalFlaggedCount}<span className="ml-0.5 text-xs font-medium">회</span></p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          <div className="text-sm font-normal bg-background/80 p-3 rounded-lg border border-border/50 min-h-[100px]">
                            <HighlightedTranscript text={qa.userAnswer || ""} />
                          </div>
                          {qa.userAnswer && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground" aria-label="스크립트 강조 범례">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> 추임새·습관어
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-rose-200" /> 반복어 구간
                              </span>
                            </div>
                          )}
                        </div>
                        {qa.score !== null && qa.score !== undefined && (
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">답변 점수</span>
                            <span className={`font-bold ${getScoreColor(qa.score)}`}>{qa.score}점</span>
                          </div>
                        )}
                      </div>

                      {/* AI 모범 답안 카드 */}
                      <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-blue-700">
                            <span className="font-semibold flex items-center gap-1">
                              💡 AI 맞춤 모범 답안
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px] gap-1 px-2 border-blue-200 text-blue-700 hover:bg-blue-100/50"
                              onClick={() => {
                                navigator.clipboard.writeText(qa.suggestedAnswer || "").then(() => {
                                  toast.success("모범 답안이 클립보드에 복사되었습니다!");
                                }).catch(() => {
                                  toast.error("복사에 실패했습니다.");
                                });
                              }}
                            >
                              📋 복사
                            </Button>
                          </div>
                          <div className="text-sm font-normal bg-background/90 p-3 rounded-lg border border-blue-100 min-h-[100px] text-blue-950">
                            {qa.suggestedAnswer ? (
                              <Streamdown>{qa.suggestedAnswer}</Streamdown>
                            ) : (
                              <span className="text-muted-foreground italic">모범 답안이 생성되지 않았습니다.</span>
                            )}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-xs text-blue-700">
                          <span>핵심 역량 가이드</span>
                          <span className="font-medium">구조화된 답변(STAR 기법)</span>
                        </div>
                      </div>
                    </div>

                    {/* 강점과 개선점 */}
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      {qa.strengths && (
                        <div className="bg-green-50/60 border border-green-200 p-4 rounded-xl text-sm">
                          <p className="font-semibold text-green-700 mb-1.5 flex items-center gap-1">✅ 나의 강점</p>
                          <Streamdown>{qa.strengths}</Streamdown>
                        </div>
                      )}
                      {qa.improvements && (
                        <div className="bg-orange-50/60 border border-orange-200 p-4 rounded-xl text-sm">
                          <p className="font-semibold text-orange-700 mb-1.5 flex items-center gap-1">⚠️ 보완 및 개선점</p>
                          <Streamdown>{qa.improvements}</Streamdown>
                        </div>
                      )}
                    </div>

                    {/* 이 질문 다시 답변하기 버튼 */}
                    <div className="pt-3 flex justify-end">
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        onClick={() => {
                          // 세션 설정 정보를 가지고 면접 페이지로 이동하되, 해당 질문을 바로 연습할 수 있도록 쿼리 전달
                          localStorage.setItem("retry_single_question", JSON.stringify({
                            question: qa.question,
                            category: qa.category || "역량 면접"
                          }));
                          setLocation(`/interview?retry=single`);
                        }}
                      >
                        🔄 이 질문 다시 답변하기
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                평가 결과가 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* PDF 카테고리 및 개별 질문 선택 모달 */}
        {showPdfCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card text-card-foreground border border-border p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  ✨ 예상 질문 리스트 PDF 선택
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowPdfCategoryModal(false)}
                  aria-label="PDF 선택 창 닫기"
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                먼저 카테고리를 고른 다음, PDF에 저장할 질문만 체크하세요. 선택하지 않은 질문은 이번 파일에서 제외됩니다.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PDF_CATEGORY_OPTIONS.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={pdfCategory === cat.id ? "default" : "outline"}
                    className="justify-start text-left min-h-11 h-auto py-2"
                    onClick={() => {
                      setPdfCategory(cat.id);
                      const nextQuestions = (session.qaList || []).filter((qa: any) => questionMatchesPdfCategory(qa.questionType, cat.id));
                      setSelectedPdfQuestionIds(nextQuestions.map((qa: any) => qa.id));
                    }}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">질문 선택</p>
                    <p className="text-xs text-muted-foreground">{selectedPdfQuestionIds.length}개 선택 / 현재 카테고리 {pdfQuestions.length}개</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pdfQuestions.length === 0}
                    onClick={() => setSelectedPdfQuestionIds(allPdfQuestionsSelected ? [] : pdfQuestions.map((qa: any) => qa.id))}
                  >
                    {allPdfQuestionsSelected ? "전체 선택 해제" : "현재 카테고리 전체 선택"}
                  </Button>
                </div>

                {pdfQuestions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    현재 카테고리에 포함된 질문이 없습니다. 다른 카테고리를 선택해주세요.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {pdfQuestions.map((qa: any, index: number) => {
                      const questionId = qa.id as number;
                      const checked = selectedPdfQuestionIds.includes(questionId);
                      return (
                        <label key={questionId} className={`flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-muted/60 ${checked ? "bg-primary/5" : ""}`}>
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedPdfQuestionIds((previous) => event.target.checked
                                ? Array.from(new Set([...previous, questionId]))
                                : previous.filter((id) => id !== questionId));
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>질문 {index + 1}</span>
                              {qa.questionType && <Badge variant="secondary" className="text-[10px]">{qa.questionType}</Badge>}
                            </span>
                            <span className="mt-1 block text-sm font-medium leading-6">{qa.question}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setShowPdfCategoryModal(false)}
                >
                  취소
                </Button>
                <Button
                  className="gap-2 bg-gradient-to-r from-primary to-accent text-white"
                  disabled={isDownloading || selectedPdfQuestionIds.length === 0}
                  onClick={() => handleDownloadQuestionListPDF(pdfCategory)}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  선택한 {selectedPdfQuestionIds.length}개 질문 저장
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
