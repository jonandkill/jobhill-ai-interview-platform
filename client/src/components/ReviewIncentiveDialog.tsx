import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Gift, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ReviewIncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReviewIncentiveDialog({ open, onOpenChange, onSuccess }: ReviewIncentiveDialogProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, {
        description: `${data.bonusHours}시간 무료 쿠폰이 발급되었습니다!`,
        duration: 5000,
      });
      onOpenChange(false);
      setContent("");
      setRating(5);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "후기 작성에 실패했습니다.");
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("후기 내용을 입력해주세요.");
      return;
    }

    createReviewMutation.mutate({
      rating,
      content: content.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-6 h-6 text-primary" />
            <DialogTitle>후기 작성하고 1시간 무료 쿠폰 받기!</DialogTitle>
          </div>
          <DialogDescription>
            면접 연습이 어떠셨나요? 솔직한 후기를 남겨주시면 <span className="font-semibold text-primary">1시간 무료 쿠폰</span>을 드립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 보상 안내 카드 */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">보상 혜택</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 1시간 무료 면접 연습 쿠폰 즉시 지급</li>
              <li>• 다른 사용자에게 도움이 되는 정보 공유</li>
              <li>• 서비스 개선에 기여</li>
            </ul>
          </div>

          {/* 별점 선택 */}
          <div>
            <Label>만족도</Label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating}점
              </span>
            </div>
          </div>

          {/* 후기 내용 */}
          <div>
            <Label htmlFor="review-content">후기 내용</Label>
            <Textarea
              id="review-content"
              placeholder="면접 연습이 어떠셨나요? 좋았던 점, 개선이 필요한 점 등을 자유롭게 작성해주세요. (최소 20자)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}자 / 최소 20자
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            나중에 하기
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReviewMutation.isPending || content.length < 20}
            className="w-full sm:w-auto"
          >
            {createReviewMutation.isPending ? "제출 중..." : "후기 작성하고 쿠폰 받기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
