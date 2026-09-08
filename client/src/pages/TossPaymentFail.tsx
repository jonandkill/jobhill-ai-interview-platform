import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  XCircle, 
  ArrowLeft,
  Brain,
  RefreshCw
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";

export default function TossPaymentFail() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline">다음 면접 코치</span>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">결제 실패</CardTitle>
            <CardDescription className="text-base">
              결제 처리 중 문제가 발생했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 에러 정보 */}
            {(code || message) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                {code && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium">에러 코드</span>
                    <span className="font-mono text-red-700">{code}</span>
                  </div>
                )}
                {message && (
                  <div className="text-sm text-red-700">
                    {decodeURIComponent(message)}
                  </div>
                )}
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>결제가 완료되지 않았습니다.</p>
              <p>다시 시도하시거나 다른 결제 수단을 이용해주세요.</p>
            </div>

            {/* 버튼 */}
            <div className="space-y-3">
              <Link href="/pricing">
                <Button className="w-full h-12 gap-2">
                  <RefreshCw className="w-5 h-5" />
                  다시 시도하기
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-5 h-5" />
                  홈으로 돌아가기
                </Button>
              </Link>
            </div>

            {/* 고객센터 안내 */}
            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>문제가 지속되면 고객센터로 문의해주세요.</p>
              <p className="mt-1">{displayBusinessValue(PUBLIC_BUSINESS_INFO.supportEmail)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
