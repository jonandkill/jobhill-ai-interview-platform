import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function EmailVerificationPending() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const resendMutation = trpc.auth.requestEmailVerification.useMutation({
    onSuccess: () => {
      toast.success("인증 이메일을 다시 발송했습니다", {
        description: "이메일을 확인해주세요"
      });
      setIsResending(false);
    },
    onError: (error) => {
      toast.error("이메일 발송 실패", {
        description: error.message
      });
      setIsResending(false);
    }
  });

  const handleResend = () => {
    setIsResending(true);
    resendMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">이메일 인증이 필요합니다</CardTitle>
          <CardDescription>
            {user?.email}로 인증 이메일을 발송했습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>인증 방법:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>이메일 받은편지함을 확인하세요</li>
              <li>인증 링크를 클릭하세요</li>
              <li>인증 완료 후 서비스를 이용하실 수 있습니다</li>
            </ol>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>이메일이 오지 않았나요?</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
              <li>스팸 메일함을 확인해보세요</li>
              <li>이메일 주소가 올바른지 확인해주세요</li>
              <li>아래 버튼을 눌러 다시 발송하세요</li>
            </ul>
          </div>

          <Button
            onClick={handleResend}
            disabled={isResending}
            className="w-full"
            variant="outline"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                인증 이메일 다시 보내기
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>인증 링크는 24시간 동안 유효합니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
