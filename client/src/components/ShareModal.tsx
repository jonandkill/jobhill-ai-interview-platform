import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Copy, 
  Mail, 
  MessageCircle, 
  FileText,
  Check,
  Download
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/safeHtml";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: "interview" | "company_analysis" | "feedback" | "interview_result";
}

export function ShareModal({ isOpen, onClose, title, content, type }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("링크가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${content}`);
      toast.success("내용이 복사되었습니다");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleKakaoShare = () => {
    // 카카오톡 공유 (Kakao SDK 필요)
    const kakaoShareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(kakaoShareUrl, "_blank", "width=600,height=400");
    toast.success("카카오톡 공유 창이 열렸습니다");
  };

  const handleEmailShare = () => {
    if (!email) {
      toast.error("이메일 주소를 입력해주세요");
      return;
    }
    
    const subject = encodeURIComponent(`[다음 면접 코치] ${title}`);
    const body = encodeURIComponent(`${title}\n\n${content}\n\n---\n다음 면접 코치에서 확인하기: ${shareUrl}`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    toast.success("이메일 앱이 열렸습니다");
    setShowEmailForm(false);
    setEmail("");
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([`${title}\n\n${content}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("텍스트 파일이 다운로드되었습니다");
  };

  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Pretendard', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; }
    h1 { color: #1e3a5f; border-bottom: 2px solid #c9a962; padding-bottom: 10px; }
    .content { white-space: pre-wrap; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="content">${escapeHtmlWithBreaks(content)}</div>
  <div class="footer">
    <p>다음 면접 코치에서 생성됨</p>
    <p>생성일: ${new Date().toLocaleDateString("ko-KR")}</p>
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML 문서가 다운로드되었습니다");
  };

  const getTypeLabel = () => {
    switch (type) {
      case "interview": return "면접 연습";
      case "company_analysis": return "기업 분석";
      case "feedback": return "피드백";
      default: return "내용";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>공유하기</DialogTitle>
          <DialogDescription>
            {getTypeLabel()} 결과를 공유하거나 저장하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 링크 복사 */}
          <div className="flex items-center gap-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="flex-1 text-sm"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* 공유 버튼들 */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleKakaoShare}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              카카오톡
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowEmailForm(!showEmailForm)}
            >
              <Mail className="w-4 h-4 mr-2" />
              이메일
            </Button>
          </div>

          {/* 이메일 폼 */}
          {showEmailForm && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label htmlFor="email">받는 사람 이메일</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button onClick={handleEmailShare}>전송</Button>
              </div>
            </div>
          )}

          {/* 문서 저장 */}
          <div className="border-t pt-4">
            <Label className="text-sm text-muted-foreground mb-2 block">문서로 저장</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDownloadTxt}
              >
                <FileText className="w-4 h-4 mr-2" />
                텍스트 (.txt)
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDownloadHtml}
              >
                <Download className="w-4 h-4 mr-2" />
                문서 (.html)
              </Button>
            </div>
          </div>

          {/* 내용 복사 */}
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={handleCopyContent}
          >
            <Copy className="w-4 h-4 mr-2" />
            전체 내용 복사
          </Button>

          {/* 미리보기 */}
          <div className="border-t pt-4">
            <Label className="text-sm text-muted-foreground mb-2 block">공유될 내용 미리보기</Label>
            <Textarea 
              value={`${title}\n\n${content.slice(0, 200)}${content.length > 200 ? "..." : ""}`}
              readOnly
              className="h-24 text-sm"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
