import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">결제 완료!</CardTitle>
          <CardDescription>
            결제가 성공적으로 처리되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            이제 AI 면접 코치를 이용하실 수 있습니다.
            대시보드에서 면접을 시작해보세요.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full">대시보드로 이동</Button>
            </Link>
            <Link href="/interview">
              <Button variant="outline" className="w-full">바로 면접 시작</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
