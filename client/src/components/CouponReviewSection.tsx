import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Ticket, Star, Gift, Clock, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CouponReviewSectionProps {
  showCouponInput?: boolean;
  showReviewForm?: boolean;
  onReviewSubmitted?: () => void;
}

export default function CouponReviewSection({ 
  showCouponInput = true, 
  showReviewForm = true,
  onReviewSubmitted 
}: CouponReviewSectionProps) {
  // 쿠폰 상태
  const [couponCode, setCouponCode] = useState("");
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  
  // 후기 상태
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [userName, setUserName] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  
  const { data: freeTime, refetch: refetchFreeTime } = trpc.coupon.myFreeTime.useQuery();
  const { data: myReview } = trpc.review.getMine.useQuery();
  
  const applyCouponMutation = trpc.coupon.redeem.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setCouponCode("");
      setIsCouponDialogOpen(false);
      refetchFreeTime();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setReviewContent("");
      setRating(5);
      setIsReviewDialogOpen(false);
      refetchFreeTime();
      onReviewSubmitted?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("쿠폰 코드를 입력해주세요.");
      return;
    }
    applyCouponMutation.mutate({ code: couponCode.trim() });
  };
  
  const handleSubmitReview = () => {
    if (!reviewContent.trim() || reviewContent.length < 10) {
      toast.error("후기는 최소 10자 이상 작성해주세요.");
      return;
    }
    createReviewMutation.mutate({
      rating,
      content: reviewContent.trim(),
      userName: userName.trim() || undefined,
    });
  };
  
  const formatMinutes = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${minutes}분`;
  };
  
  return (
    <div className="space-y-4">
      {/* 무료 시간 현황 */}
      {freeTime && freeTime.remainingMinutes > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">남은 무료 사용 시간</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatMinutes(freeTime.remainingMinutes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 쿠폰 입력 */}
        {showCouponInput && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                쿠폰 등록
              </CardTitle>
              <CardDescription>무료 사용 쿠폰 코드를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Gift className="w-4 h-4 mr-2" />
                    쿠폰 코드 입력하기
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>쿠폰 코드 입력</DialogTitle>
                    <DialogDescription>
                      받으신 쿠폰 코드를 입력하면 무료 사용 시간이 추가됩니다.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupon-code">쿠폰 코드</Label>
                      <Input
                        id="coupon-code"
                        placeholder="예: WELCOME2024"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="font-mono text-lg tracking-wider"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
                      취소
                    </Button>
                    <Button 
                      onClick={handleApplyCoupon} 
                      disabled={applyCouponMutation.isPending}
                    >
                      {applyCouponMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          적용 중...
                        </>
                      ) : (
                        "쿠폰 적용"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
        
        {/* 후기 작성 */}
        {showReviewForm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                후기 작성
              </CardTitle>
              <CardDescription>
                {myReview 
                  ? "이미 후기를 작성하셨습니다" 
                  : "후기 작성 시 1시간 무료 사용권 증정!"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myReview ? (
                <div className="text-center py-4">
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= (myReview.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{myReview.content}</p>
                  <p className="text-xs text-green-600 mt-2">✓ 1시간 무료 사용권 적용됨</p>
                </div>
              ) : (
                <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                      <Star className="w-4 h-4 mr-2" />
                      후기 작성하고 1시간 받기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>후기 작성</DialogTitle>
                      <DialogDescription>
                        AI 면접 코치 사용 경험을 공유해주세요. 작성 완료 시 1시간 무료 사용권이 지급됩니다!
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {/* 별점 */}
                      <div className="space-y-2">
                        <Label>별점</Label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300 hover:text-yellow-300"}`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-lg font-medium">{rating}점</span>
                        </div>
                      </div>
                      
                      {/* 표시 이름 */}
                      <div className="space-y-2">
                        <Label htmlFor="user-name">표시 이름 (선택)</Label>
                        <Input
                          id="user-name"
                          placeholder="익명으로 표시됩니다"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                        />
                      </div>
                      
                      {/* 후기 내용 */}
                      <div className="space-y-2">
                        <Label htmlFor="review-content">후기 내용 *</Label>
                        <Textarea
                          id="review-content"
                          placeholder="AI 면접 코치를 사용해보신 경험을 자유롭게 작성해주세요. (최소 10자)"
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          rows={4}
                          maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {reviewContent.length}/500자
                        </p>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                        취소
                      </Button>
                      <Button 
                        onClick={handleSubmitReview} 
                        disabled={createReviewMutation.isPending || reviewContent.length < 10}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        {createReviewMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            등록 중...
                          </>
                        ) : (
                          "후기 등록하기"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
