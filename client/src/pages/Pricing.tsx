import { useEffect } from "react";

export default function Pricing() {
  // Pricing 페이지는 외부 결제 신청 페이지로 리다이렉트
  useEffect(() => {
    window.location.href = '/payment/external';
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">페이지를 이동 중입니다...</p>
      </div>
    </div>
  );
}
