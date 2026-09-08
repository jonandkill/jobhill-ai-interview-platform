import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  Loader2, 
  HelpCircle, 
  Trash2, 
  MessageSquare,
  Target,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function DifficultQuestions() {
  const { data: questions, isLoading } = trpc.difficultQuestions.list.useQuery();
  const utils = trpc.useUtils();
  
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createMutation = trpc.difficultQuestions.create.useMutation({
    onSuccess: () => {
      toast.success("질문이 추가되었습니다");
      utils.difficultQuestions.list.invalidate();
      setNewQuestion("");
      setNewCategory("");
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("추가 실패: " + error.message);
    },
  });

  const practiceMutation = trpc.difficultQuestions.practice.useMutation({
    onSuccess: () => {
      toast.success("피드백이 생성되었습니다");
      utils.difficultQuestions.list.invalidate();
      setPracticeAnswer("");
      setSelectedQuestion(null);
    },
    onError: (error) => {
      toast.error("피드백 생성 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.difficultQuestions.delete.useMutation({
    onSuccess: () => {
      toast.success("질문이 삭제되었습니다");
      utils.difficultQuestions.list.invalidate();
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) {
      toast.error("질문을 입력해주세요");
      return;
    }
    createMutation.mutate({
      question: newQuestion,
      category: newCategory || undefined,
    });
  };

  const handlePractice = (id: number) => {
    if (!practiceAnswer.trim()) {
      toast.error("답변을 입력해주세요");
      return;
    }
    practiceMutation.mutate({ id, answer: practiceAnswer });
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">어려운 질문 관리</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              어려웠던 질문을 등록하고 반복 연습하세요
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                질문 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>어려운 질문 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>질문</Label>
                  <Textarea
                    placeholder="어려웠던 면접 질문을 입력하세요"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>카테고리 (선택)</Label>
                  <Input
                    placeholder="예: 인성, 기술, 경험"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddQuestion}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  추가하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {questions && questions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">등록된 질문이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                어려웠던 면접 질문을 추가하고 연습해보세요
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 질문 추가하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions?.map((q) => (
              <Card key={q.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {q.category && (
                          <Badge variant="secondary">{q.category}</Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <Target className="w-3 h-3" />
                          연습 {q.practiceCount || 0}회
                        </Badge>
                        {q.lastPracticedAt && (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(q.lastPracticedAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base sm:text-lg leading-relaxed">
                        {q.question}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: q.id })}
                      disabled={deleteMutation.isPending}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 이전 피드백 표시 */}
                  {q.aiFeedback && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">이전 피드백</p>
                      <div className="text-sm prose prose-sm max-w-none">
                        <Streamdown>{q.aiFeedback}</Streamdown>
                      </div>
                    </div>
                  )}

                  {/* 연습 섹션 */}
                  {selectedQuestion === q.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="이 질문에 대한 답변을 작성해보세요"
                        value={practiceAnswer}
                        onChange={(e) => setPracticeAnswer(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePractice(q.id)}
                          disabled={practiceMutation.isPending}
                          className="flex-1 sm:flex-none"
                        >
                          {practiceMutation.isPending && (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          )}
                          피드백 받기
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedQuestion(null);
                            setPracticeAnswer("");
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setSelectedQuestion(q.id)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      연습하기
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
