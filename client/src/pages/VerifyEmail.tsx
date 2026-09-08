import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/verify-email");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
  }, []);

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // 인증 성공 시 3초 후 홈으로 이동
        setTimeout(() => {
          setLocation("/");
        }, 3000);
      }
    }
  });

  useEffect(() => {
    if (token && !verifyMutation.isPending && !verifyMutation.data) {
      verifyMutation.mutate({ token });
    }
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">잘못된 인증 링크</CardTitle>
            <CardDescription>
              인증 링크가 올바르지 않습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">이메일 인증 중...</CardTitle>
            <CardDescription>
              잠시만 기다려주세요
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verifyMutation.data?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">인증 완료!</CardTitle>
            <CardDescription>
              {verifyMutation.data.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>이제 기본 면접 연습을 시작할 수 있습니다:</strong>
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1 list-disc list-inside">
                <li>기본 질문 크레딧 3개</li>
                <li>텍스트 답변과 구조화 피드백</li>
                <li>음성 면접은 별도 이용권 또는 구독 필요</li>
              </ul>
            </div>

            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              시작하기
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              3초 후 자동으로 홈으로 이동합니다...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">인증 실패</CardTitle>
          <CardDescription>
            {verifyMutation.data?.message || "알 수 없는 오류가 발생했습니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>가능한 원인:</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
              <li>인증 링크가 만료되었습니다 (24시간)</li>
              <li>이미 인증된 계정입니다</li>
              <li>잘못된 인증 링크입니다</li>
            </ul>
          </div>

          <Button
            onClick={() => setLocation("/email-verification-pending")}
            className="w-full"
          >
            인증 이메일 다시 받기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
