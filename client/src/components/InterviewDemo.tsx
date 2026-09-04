import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Bot, 
  User, 
  CheckCircle2, 
  Star,
  ArrowRight,
  Sparkles
} from "lucide-react";

// 실제 면접 예시 데이터
const demoConversation = [
  {
    type: "interviewer",
    message: "자기소개를 해주시겠어요?",
    delay: 0,
  },
  {
    type: "candidate",
    message: "안녕하세요. 저는 마케팅 분야에서 3년간 경력을 쌓아온 김지원입니다. 특히 디지털 마케팅과 브랜드 전략 수립에 강점을 가지고 있습니다.",
    delay: 1500,
  },
  {
    type: "feedback",
    message: "✅ 강점: 명확한 경력 소개\n⚠️ 개선점: 지원 회사와의 연결고리 추가 필요\n💡 팁: \"귀사의 OO 비전에 기여하고 싶어 지원했습니다\" 추가",
    score: 75,
    delay: 3000,
  },
];

interface InterviewDemoProps {
  onStartInterview?: () => void;
}

export default function InterviewDemo({ onStartInterview }: InterviewDemoProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isPlaying && visibleMessages < demoConversation.length) {
      const nextMessage = demoConversation[visibleMessages];
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
      }, nextMessage.delay);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, visibleMessages]);

  const startDemo = () => {
    setVisibleMessages(0);
    setIsPlaying(true);
    setTimeout(() => setVisibleMessages(1), 500);
  };

  const resetDemo = () => {
    setVisibleMessages(0);
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
          <Sparkles className="w-3 h-3 mr-1" />
          실제 면접 예시
        </Badge>
        <h3 className="text-xl font-bold korean-title mb-2">
          이렇게 진행됩니다
        </h3>
        <p className="text-muted-foreground korean-body text-sm">
          지원 정보와 구조화 면접 연습 기준을 바탕으로 답변 구성을 돕습니다
        </p>
      </div>

      <Card className="elegant-card overflow-hidden">
        <CardContent className="p-0">
          {/* 데모 헤더 */}
          <div className="bg-primary/5 px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">AI 면접 코치</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              실시간 피드백
            </Badge>
          </div>

          {/* 대화 영역 */}
          <div className="p-4 space-y-4 min-h-[300px] bg-gradient-to-b from-background to-secondary/20">
            {!isPlaying && visibleMessages === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-center">
                <Bot className="w-12 h-12 text-primary/50 mb-4" />
                <p className="text-muted-foreground korean-body mb-4">
                  버튼을 눌러 면접 예시를 확인하세요
                </p>
                <Button onClick={startDemo} className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  예시 보기
                </Button>
              </div>
            ) : (
              <>
                {demoConversation.slice(0, visibleMessages).map((item, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${
                      item.type === "candidate" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {item.type === "interviewer" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    {item.type === "candidate" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                    )}
                    {item.type === "feedback" && (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    )}

                    <div
                      className={`flex-1 rounded-xl p-3 korean-body text-sm ${
                        item.type === "interviewer"
                          ? "bg-primary/10 text-foreground"
                          : item.type === "candidate"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-green-50 border border-green-200"
                      }`}
                    >
                      {item.type === "feedback" ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-green-700">AI 피드백</span>
                            {item.score && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <Star className="w-3 h-3 mr-1" />
                                {item.score}점
                              </Badge>
                            )}
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-green-800">
                            {item.message}
                          </pre>
                        </div>
                      ) : (
                        <p>{item.message}</p>
                      )}
                    </div>
                  </div>
                ))}

                {visibleMessages === demoConversation.length && (
                  <div className="flex flex-col items-center gap-3 pt-4 animate-in fade-in duration-500">
                    <p className="text-sm text-muted-foreground korean-body">
                      이처럼 실시간으로 피드백을 받을 수 있습니다
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={resetDemo}>
                        다시 보기
                      </Button>
                      {onStartInterview && (
                        <Button size="sm" onClick={onStartInterview} className="gap-2">
                          지금 시작하기
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
