import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Gift, Ticket, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface CouponInputModalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  variant?: "default" | "compact";
  redirectToInterview?: boolean; // 쿠폰 적용 후 면접 페이지로 이동할지 여부
}

export default function CouponInputModal({ 
  trigger, 
  onSuccess, 
  variant = "default",
  redirectToInterview = true 
}: CouponInputModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [, setLocation] = useLocation();
  
  const { refetch: refetchFreeTime } = trpc.coupon.myFreeTime.useQuery(undefined, {
    enabled: false,
  });
  
  const redeemCouponMutation = trpc.coupon.redeem.useMutation({
    onSuccess: (data) => {
      toast.success("쿠폰이 적용되었습니다!", {
        description: `${data.freeHours}시간 무료 이용권이 지급되었습니다. 지금 바로 면접을 시작해보세요!`,
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        duration: 3000,
      });
      setCouponCode("");
      setIsOpen(false);
      refetchFreeTime();
      onSuccess?.();
      
      // 쿠폰 적용 후 면접 페이지로 자동 이동
      if (redirectToInterview) {
        setTimeout(() => {
          setLocation("/interview");
        }, 500);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error("쿠폰 코드를 입력해주세요");
      return;
    }
    redeemCouponMutation.mutate({ code: couponCode.trim() });
  };
  
  const defaultTrigger = variant === "compact" ? (
    <Button variant="outline" size="sm" className="gap-2">
      <Ticket className="w-4 h-4" />
      쿠폰 입력
    </Button>
  ) : (
    <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
      <Gift className="w-4 h-4" />
      무료 쿠폰이 있으신가요?
    </Button>
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            쿠폰 코드 입력
          </DialogTitle>
          <DialogDescription>
            쿠폰 코드를 입력하면 무료 이용 시간이 지급됩니다
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="couponCode">쿠폰 코드</Label>
            <Input
              id="couponCode"
              placeholder="예: WELCOME2024"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono tracking-wider"
              autoComplete="off"
            />
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">쿠폰 사용 안내</p>
                <ul className="text-amber-700 mt-1 space-y-1">
                  <li>• 쿠폰 적용 시 즉시 무료 시간이 활성화됩니다</li>
                  <li>• <strong>음성 면접도 무료로 이용</strong>할 수 있습니다</li>
                  <li>• 동일 쿠폰은 1회만 사용 가능합니다</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2"
              disabled={redeemCouponMutation.isPending || !couponCode.trim()}
            >
              {redeemCouponMutation.isPending ? (
                "적용 중..."
              ) : (
                <>
                  쿠폰 적용하고 면접 시작
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
