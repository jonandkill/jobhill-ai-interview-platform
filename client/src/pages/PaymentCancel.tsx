import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">결제 취소</CardTitle>
          <CardDescription>
            결제가 취소되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            결제를 취소하셨습니다. 언제든 다시 시도하실 수 있습니다.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button className="w-full">요금제 다시 보기</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">홈으로 이동</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
