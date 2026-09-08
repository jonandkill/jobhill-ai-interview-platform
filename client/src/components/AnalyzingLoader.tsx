import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  /** 단계별로 순서대로 표시할 현재 진행 상태 문구 */
  stepLabels?: string[];
  /** 단계 아래에 표시할 보조 안내 문구 */
  message?: string;
}

export default function AnalyzingLoader({
  stepLabels = ["답변 내용 분석 중", "점수 계산 중", "피드백 생성 중", "완료"],
  message = "잠시만 기다려주세요...",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const icons = [Brain, TrendingUp, Sparkles, CheckCircle2];
  const colors = ["text-blue-500", "text-green-500", "text-purple-500", "text-cyan-500"];
  const steps = stepLabels.map((label, index) => ({
    icon: icons[index] || Sparkles,
    label,
    color: colors[index] || "text-blue-500",
  }));

  useEffect(() => {
    // 진행률 애니메이션
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // 95%까지만 자동 증가
        return prev + 1;
      });
    }, 100);

    // 단계 변경
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 2) return prev; // 마지막 전 단계까지만
        return prev + 1;
      });
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6 space-y-4">
        {/* 메시지 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2" aria-live="polite">
            {steps[currentStep]?.label || message}
          </h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {/* 진행률 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>진행률</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 단계 표시 */}
        <div className="space-y-3 pt-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isActive ? "scale-105" : isCompleted ? "opacity-60" : "opacity-30"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-green-100"
                      : isActive
                      ? "bg-blue-100 animate-pulse"
                      : "bg-gray-100"
                  }`}
                >
                  <StepIcon
                    className={`w-4 h-4 ${
                      isCompleted
                        ? "text-green-600"
                        : isActive
                        ? step.color
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-green-600"
                      : isActive
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <div className="ml-auto flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                {isCompleted && (
                  <CheckCircle2 className="ml-auto w-4 h-4 text-green-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* 움직이는 그래프 (시각적 효과) */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-end justify-center gap-1 h-16">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-3 bg-gradient-to-t from-blue-400 to-purple-400 rounded-t transition-all duration-500"
                style={{
                  height: `${30 + Math.sin((progress + i * 10) / 10) * 20}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
