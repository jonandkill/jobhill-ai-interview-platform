import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { 
  Sparkles, 
  Mic, 
  MessageSquare,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import { useLocation } from "wouter";

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "voice_limit" | "usage_limit" | null;
  voiceCount?: number;
  totalCount?: number;
}

export function UsageLimitModal({ 
  isOpen, 
  onClose, 
  reason,
  voiceCount = 0,
  totalCount = 0 
}: UsageLimitModalProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleViewPricing = () => {
    onClose();
    setLocation("/pricing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            {reason === "voice_limit" 
              ? "음성 면접 체험 완료!" 
              : "무료 체험을 마치셨습니다!"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === "voice_limit" 
              ? "음성 AI 면접을 체험해보셨네요. 더 많은 연습을 위해 가입해주세요."
              : `${totalCount}회의 무료 체험을 사용하셨습니다. 계속 사용하시려면 가입해주세요.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 사용 현황 */}
          <div className="flex items-center justify-center gap-8 p-4 bg-muted rounded-lg">
            {reason === "voice_limit" && (
              <div className="text-center">
                <Mic className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{voiceCount}회</p>
                <p className="text-sm text-muted-foreground">음성 면접</p>
              </div>
            )}
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalCount}회</p>
              <p className="text-sm text-muted-foreground">전체 사용</p>
            </div>
          </div>

          {/* 가입 혜택 */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              가입하면 받는 혜택
            </h4>
            <ul className="space-y-2">
              {[
                "가입 시 기본 질문 크레딧 3개",
                "지원 정보 기반 AI 면접 연습",
                "음성 면접 모드 이용",
                "상세한 피드백 및 점수 분석",
                "기업 분석 및 직무 분석",
                "면접 이력 저장 및 관리",
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA 버튼 */}
          <div className="space-y-2">
            {!isAuthenticated ? (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleLogin}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                가입하고 기본 질문 받기
              </Button>
            ) : (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleViewPricing}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                요금제 확인하기
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={onClose}
            >
              나중에 할게요
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">추가 이용이 필요하면 결제 화면에서 상품 금액과 제공 범위를 확인하세요.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
