import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface KakaoShareButtonProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
}

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoShareButton({
  title = "AI 면접 코치 - 면접 연습 결과",
  description = "AI 면접관과 함께 실전처럼 면접을 연습하고 상세한 피드백을 받았습니다!",
  imageUrl = "https://ai-interview.manus.space/og-image.png",
  url = window.location.href,
}: KakaoShareButtonProps) {
  
  useEffect(() => {
    // 카카오 SDK 초기화
    if (window.Kakao && !window.Kakao.isInitialized()) {
      // JavaScript 키 사용 (환경변수에서 가져오거나 하드코딩)
      window.Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY');
    }
  }, []);

  const handleKakaoShare = () => {
    if (!window.Kakao) {
      alert('카카오 SDK가 로드되지 않았습니다.');
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: title,
        description: description,
        imageUrl: imageUrl,
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
      buttons: [
        {
          title: '면접 연습하기',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
      ],
    });
  };

  return (
    <Button
      onClick={handleKakaoShare}
      variant="outline"
      className="gap-2"
    >
      <Share2 className="w-4 h-4" />
      카카오톡 공유하기
    </Button>
  );
}
