import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, MessageCircle, Facebook, Twitter, Link2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  title?: string;
  description?: string;
  url?: string;
  variant?: "button" | "icon";
}

export default function SocialShare({ 
  title = "AI 면접 코치 - 실전처럼 연습하고 답변을 개선하세요",
  description = "이력서와 자기소개서를 분석하여 맞춤형 면접 질문을 생성하고, AI가 상세한 피드백을 제공합니다.",
  url,
  variant = "button"
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const handleKakaoShare = () => {
    // 카카오톡 공유 (카카오 SDK 필요)
    if (typeof window !== "undefined" && (window as any).Kakao) {
      const Kakao = (window as any).Kakao;
      if (!Kakao.isInitialized()) {
        // 카카오 앱 키가 필요합니다
        toast.info("카카오톡 공유 기능 준비 중입니다.");
        return;
      }
      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl: `${shareUrl}/og-image.png`,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: "면접 연습 시작하기",
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      // 카카오 SDK 없을 때 모바일 공유 URL 사용
      const kakaoUrl = `https://story.kakao.com/share?url=${encodedUrl}`;
      window.open(kakaoUrl, "_blank", "width=600,height=400");
    }
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (err) {
        // 사용자가 취소한 경우
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon">
            <Share2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />
            공유하기
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleKakaoShare} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4 text-yellow-500" />
          카카오톡
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebookShare} className="gap-2 cursor-pointer">
          <Facebook className="w-4 h-4 text-blue-600" />
          페이스북
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitterShare} className="gap-2 cursor-pointer">
          <Twitter className="w-4 h-4 text-sky-500" />
          트위터
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          링크 복사
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
            <Share2 className="w-4 h-4" />
            더보기
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
