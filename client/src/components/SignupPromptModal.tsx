import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLoginUrl } from "@/const";
import {
  CheckCircle2,
  Gift,
  Lock,
  Mail,
  Star,
  Zap,
} from "lucide-react";

interface SignupPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: "usage_limit" | "save_feature" | "premium_feature" | "first_visit";
  usageCount?: number;
}

// 인증 방법 옵션 - 구글 이메일 로그인으로 단순화
const AUTH_METHODS = [
  {
    id: "google",
    name: "Google로 계속하기",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300",
    description: "Google 계정으로 간편하게 시작",
  },
  {
    id: "email",
    name: "이메일로 계속하기",
    icon: Mail,
    color: "bg-primary hover:bg-primary/90 text-white",
    description: "이메일 주소로 가입/로그인",
  },
];

// 트리거별 메시지
const TRIGGER_MESSAGES = {
  usage_limit: {
    title: "무료 체험 횟수를 모두 사용했어요",
    description: "회원가입하고 기본 제공 질문으로 연습 기록을 시작하세요.",
    icon: Lock,
  },
  save_feature: {
    title: "연습 내용을 저장하시겠어요?",
    description: "회원가입하면 모든 연습 내용을 저장하고 관리할 수 있어요.",
    icon: Star,
  },
  premium_feature: {
    title: "프리미엄 기능이에요",
    description: "회원가입하고 모든 기능을 이용해보세요.",
    icon: Zap,
  },
  first_visit: {
    title: "AI 면접 코치에 오신 것을 환영합니다!",
    description: "간편하게 가입하고 AI 면접 코칭을 시작하세요.",
    icon: Gift,
  },
};

export default function SignupPromptModal({
  open,
  onOpenChange,
  trigger = "first_visit",
  usageCount = 0,
}: SignupPromptModalProps) {
  const [step, setStep] = useState<"intro" | "auth_select">("intro");
  const message = TRIGGER_MESSAGES[trigger];
  const Icon = message.icon;

  const handleAuthSelect = (method: string) => {
    // 모든 인증 방법은 Manus OAuth 로그인 URL로 이동
    window.location.href = getLoginUrl();
  };

  const handleContinueAsGuest = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "intro" ? (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">{message.title}</DialogTitle>
              <DialogDescription className="text-base">
                {message.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 혜택 안내 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>가입 시 기본 질문 크레딧 3개</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>지원 정보 기반 맞춤 질문</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>상세한 피드백 및 점수 분석</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>연습 내용 저장 및 관리</span>
                </div>
              </div>

              {trigger === "usage_limit" && usageCount > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    지금까지 {usageCount}개의 질문을 연습했어요. 
                    회원가입하면 기록이 저장됩니다!
                  </p>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep("auth_select")}
              >
                <Gift className="w-4 h-4 mr-2" />
                무료로 시작하기
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleContinueAsGuest}
              >
                나중에 하기
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">로그인 방법 선택</DialogTitle>
              <DialogDescription>
                원하시는 방법으로 간편하게 시작하세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {AUTH_METHODS.map((method) => (
                <Button
                  key={method.id}
                  variant="outline"
                  className={`w-full h-auto py-4 justify-start ${method.color}`}
                  onClick={() => handleAuthSelect(method.id)}
                >
                  <div className="flex items-center w-full">
                    {method.id === 'google' ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                    <div className="text-left ml-3">
                      <div className="font-medium">{method.name}</div>
                      <div className="text-xs opacity-80">{method.description}</div>
                    </div>
                  </div>
                </Button>
              ))}

              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setStep("intro")}
                >
                  뒤로 가기
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              가입 시 <a href="/terms" className="underline">이용약관</a> 및{" "}
              <a href="/privacy" className="underline">개인정보처리방침</a>에 동의합니다.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
