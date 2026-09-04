import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  Search, 
  Plus,
  CheckCircle2,
  Loader2,
  Sparkles
} from "lucide-react";

interface PopularQuestionsProps {
  onSelectQuestions?: (questions: string[]) => void;
  onStartInterview?: (questions: string[]) => void; // 선택한 질문으로 바로 면접 시작
  maxSelections?: number;
  hasProfile?: boolean;
  profileResume?: string | null;
  profileCoverLetter?: string | null;
}

const categoryLabels: Record<string, string> = {
  all: "전체",
  personality: "인성/성격",
  experience: "경험/역량",
  technical: "기술/전문성",
  situational: "상황대처",
  company: "회사/직무",
};

export default function PopularQuestions({ 
  onSelectQuestions, 
  onStartInterview,
  maxSelections = 5,
  hasProfile = false,
  profileResume,
  profileCoverLetter
}: PopularQuestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");

  const { data: questions, isLoading } = trpc.autoQuestion.getPopularQuestions.useQuery({
    category: selectedCategory as "all" | "personality" | "experience" | "technical" | "situational" | "company",
    limit: 20,
  });

  // 이력서/자소서 기반 맞춤 질문 생성
  const generateMutation = trpc.autoQuestion.generateFromProfile.useMutation();
  const [customQuestions, setCustomQuestions] = useState<Array<{question: string, type: string}>>([]);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const handleGenerateCustomQuestions = async () => {
    if (!hasProfile) return;
    setIsGeneratingCustom(true);
    try {
      const result = await generateMutation.mutateAsync();
      setCustomQuestions(result.questions || []);
    } catch (error) {
      console.error('Failed to generate custom questions:', error);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const toggleQuestion = (question: string) => {
    setSelectedQuestions(prev => {
      let newQuestions: string[];
      if (prev.includes(question)) {
        newQuestions = prev.filter(q => q !== question);
      } else if (prev.length >= maxSelections) {
        return prev;
      } else {
        newQuestions = [...prev, question];
      }
      return newQuestions;
    });
  };

  // 선택된 질문이 변경될 때 상위 컴포넌트에 전달 (useEffect로 분리하여 렌더링 중 setState 방지)
  useEffect(() => {
    if (onSelectQuestions) {
      onSelectQuestions(selectedQuestions);
    }
  }, [selectedQuestions, onSelectQuestions]);

  const addCustomQuestion = () => {
    if (customQuestion.trim() && selectedQuestions.length < maxSelections) {
      const newQuestions = [...selectedQuestions, customQuestion.trim()];
      setSelectedQuestions(newQuestions);
      setCustomQuestion("");
    }
  };

  const handleConfirm = () => {
    if (selectedQuestions.length > 0) {
      // 선택된 질문을 상위 컴포넌트에 전달
      if (onSelectQuestions) {
        onSelectQuestions(selectedQuestions);
      }
      // 바로 면접 시작 (새로운 콜백 사용)
      if (onStartInterview) {
        onStartInterview(selectedQuestions);
      }
    }
  };

  return (
    <Card className="elegant-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 korean-title">
          <TrendingUp className="w-5 h-5 text-gold" />
          핵심 연습 질문
        </CardTitle>
        <p className="text-sm text-muted-foreground korean-body">
          직무와 지원 정보를 바탕으로 먼저 연습하기 좋은 질문을 제안합니다
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 이력서/자소서 기반 맞춤 질문 */}
        {hasProfile && (profileResume || profileCoverLetter) && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-50 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-primary">나의 이력서/자소서 기반 맞춤 질문</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateCustomQuestions}
                disabled={isGeneratingCustom}
                className="gap-1"
              >
                {isGeneratingCustom ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> 생성 중...</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> AI 질문 생성</>
                )}
              </Button>
            </div>
            
            {customQuestions.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {customQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedQuestions.includes(q.question)
                        ? "border-primary bg-white"
                        : "border-primary/20 bg-white/50 hover:border-primary/50"
                    }`}
                    onClick={() => toggleQuestion(q.question)}
                  >
                    <Checkbox
                      checked={selectedQuestions.includes(q.question)}
                      onCheckedChange={() => toggleQuestion(q.question)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{q.question}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {categoryLabels[q.type] || q.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                'AI 질문 생성' 버튼을 클릭하면 귀하의 이력서/자소서를 분석하여 맞춤형 질문을 생성합니다.
              </p>
            )}
          </div>
        )}

        {/* 카테고리 탭 */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="text-xs px-3 py-1.5"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {questions?.map((q, index) => (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedQuestions.includes(q.question)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                    }`}
                    onClick={() => toggleQuestion(q.question)}
                  >
                    <Checkbox
                      checked={selectedQuestions.includes(q.question)}
                      onCheckedChange={() => toggleQuestion(q.question)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm korean-body">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[q.category] || q.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          연습 우선순위 {index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 직접 입력 */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium mb-2 korean-text">직접 질문 추가</p>
          <div className="flex gap-2">
            <Input
              placeholder="연습하고 싶은 질문을 입력하세요"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomQuestion()}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={addCustomQuestion}
              disabled={!customQuestion.trim() || selectedQuestions.length >= maxSelections}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 선택된 질문 표시 - 간략히 표시 (Interview.tsx에서 드래그 앤 드롭 UI 제공) */}
        {selectedQuestions.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm font-medium korean-text text-center text-primary">
              {selectedQuestions.length}개 질문 선택됨 - 아래에서 순서를 변경하세요
            </p>
          </div>
        )}

        {/* 확인 버튼 */}
        {onSelectQuestions && (
          <Button 
            className="w-full gap-2"
            onClick={handleConfirm}
            disabled={selectedQuestions.length === 0}
          >
            <Sparkles className="w-4 h-4" />
            선택한 질문으로 연습 시작 ({selectedQuestions.length}개)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
