import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface EmailVerificationPromptProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
}

export function EmailVerificationPrompt({ open, onClose, userEmail, userName }: EmailVerificationPromptProps) {
  const [emailSent, setEmailSent] = useState(false);
  
  const requestVerificationMutation = trpc.auth.requestEmailVerification.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setEmailSent(true);
        toast.success('인증 이메일을 발송했습니다! 메일함을 확인해주세요.');
      } else {
        toast.error(data.message || '이메일 발송에 실패했습니다.');
      }
    },
    onError: (error) => {
      toast.error('이메일 발송 중 오류가 발생했습니다: ' + error.message);
    },
  });

  const handleSendEmail = () => {
    requestVerificationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !requestVerificationMutation.isPending) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gold" />
            이메일 인증이 필요합니다
          </DialogTitle>
          <DialogDescription>
            모든 기능을 이용하려면 이메일 인증을 완료해주세요
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-1">인증이 필요한 이유</h4>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    이메일 인증 후 기본 질문 크레딧 3개로 텍스트 면접과 구조화 피드백을 시작할 수 있습니다. 음성 면접은 별도 이용권 또는 구독이 필요합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                <strong className="text-foreground">{userName}</strong>님의 이메일:
              </p>
              <p className="text-sm font-mono bg-background px-3 py-2 rounded border">
                {userEmail}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSendEmail}
                disabled={requestVerificationMutation.isPending}
                className="w-full bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90"
                size="lg"
              >
                {requestVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    인증 이메일 받기
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={requestVerificationMutation.isPending}
                className="w-full"
              >
                나중에 하기
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💡 인증 링크는 24시간 동안 유효합니다
            </p>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">이메일을 발송했습니다!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{userEmail}</strong>로<br />
                인증 이메일을 발송했습니다.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900 font-medium mb-2">📧 다음 단계</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>메일함에서 인증 이메일을 확인하세요</li>
                <li>"이메일 인증하기" 버튼을 클릭하세요</li>
                <li>인증 완료 후 모든 기능을 이용하세요!</li>
              </ol>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={onClose}
                className="w-full"
                variant="outline"
              >
                확인
              </Button>
              
              <p className="text-xs text-muted-foreground">
                이메일이 오지 않았나요? 스팸함을 확인하거나<br />
                잠시 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
