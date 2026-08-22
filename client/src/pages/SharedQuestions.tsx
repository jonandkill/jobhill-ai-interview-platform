import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, 
  MessageSquare, 
  Star, 
  Eye, 
  Copy, 
  CheckCircle2,
  Loader2,
  ArrowRight,
  Building,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function SharedQuestions() {
  const params = useParams();
  const shareCode = params.shareCode as string;
  
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [copied, setCopied] = useState(false);
  
  const { data: sharedList, isLoading } = trpc.sharedQuestions.get.useQuery(
    { shareCode },
    { enabled: !!shareCode }
  );
  
  const { data: feedbacks, refetch: refetchFeedbacks } = trpc.sharedQuestions.getFeedbacks.useQuery(
    { shareCode },
    { enabled: !!shareCode }
  );
  
  const addFeedbackMutation = trpc.sharedQuestions.addFeedback.useMutation({
    onSuccess: () => {
      toast.success("피드백이 등록되었습니다!");
      setFeedbackContent("");
      setAuthorName("");
      refetchFeedbacks();
    },
    onError: (error) => {
      toast.error("피드백 등록 실패: " + error.message);
    },
  });
  
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("링크가 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSubmitFeedback = () => {
    if (!feedbackContent.trim()) {
      toast.error("피드백 내용을 입력해주세요");
      return;
    }
    
    addFeedbackMutation.mutate({
      shareCode,
      content: feedbackContent.trim(),
      rating: feedbackRating,
      authorName: authorName.trim() || undefined,
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">질문 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (!sharedList) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">질문 목록을 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mb-4">
              링크가 만료되었거나 삭제되었을 수 있습니다.
            </p>
            <Link href="/">
              <Button>홈으로 돌아가기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const questions = sharedList.questions as string[];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* 헤더 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/">
            <span className="font-bold text-lg text-primary">JobKill</span>
          </Link>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" />복사됨</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" />링크 복사</>
            )}
          </Button>
        </div>
      </header>
      
      <main className="container max-w-3xl py-8 px-4">
        {/* 제목 및 정보 */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <Share2 className="w-3 h-3 mr-1" />
            공유된 질문 목록
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{sharedList.title}</h1>
          {sharedList.description && (
            <p className="text-muted-foreground">{sharedList.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            {sharedList.targetCompany && (
              <div className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {sharedList.targetCompany}
              </div>
            )}
            {sharedList.targetPosition && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {sharedList.targetPosition}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {sharedList.viewCount || 0}회 조회
            </div>
          </div>
        </div>
        
        {/* 질문 목록 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">면접 질문 ({questions.length}개)</CardTitle>
            <CardDescription>
              이 질문들로 면접 연습을 해보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm">{question}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <Link href={`/interview?questions=${encodeURIComponent(JSON.stringify(questions))}`}>
                <Button className="w-full gap-2">
                  이 질문으로 면접 연습하기
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* 피드백 섹션 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              피드백 남기기
            </CardTitle>
            <CardDescription>
              이 질문 목록에 대한 의견을 남겨주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">평점</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="p-1"
                  >
                    <Star 
                      className={`w-6 h-6 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">이름 (선택)</label>
              <Input
                placeholder="익명"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">피드백 내용</label>
              <Textarea
                placeholder="이 질문 목록에 대한 의견을 남겨주세요..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                rows={4}
              />
            </div>
            
            <Button 
              onClick={handleSubmitFeedback}
              disabled={addFeedbackMutation.isPending}
              className="w-full"
            >
              {addFeedbackMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />등록 중...</>
              ) : (
                "피드백 등록"
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* 피드백 목록 */}
        {feedbacks && feedbacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">피드백 ({feedbacks.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{feedback.authorName}</span>
                      <div className="flex items-center gap-1">
                        {feedback.rating && [...Array(feedback.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
