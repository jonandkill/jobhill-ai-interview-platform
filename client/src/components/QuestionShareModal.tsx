import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Check, X, Link2, Share2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface QuestionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: string[];
  targetCompany?: string;
  targetPosition?: string;
}

export function QuestionShareModal({ 
  isOpen, 
  onClose, 
  questions, 
  targetCompany, 
  targetPosition 
}: QuestionShareModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createShareMutation = trpc.sharedQuestions.create.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/shared/${data.shareCode}`;
      setShareUrl(url);
      setIsCreating(false);
    },
    onError: (error) => {
      console.error("공유 링크 생성 실패:", error);
      setIsCreating(false);
    }
  });

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 초기화
      setTitle("");
      setDescription("");
      setShareUrl("");
      setCopied(false);
    }
  }, [isOpen]);

  const handleCreateShare = () => {
    if (questions.length === 0) return;
    
    setIsCreating(true);
    createShareMutation.mutate({
      title: title || `면접 질문 목록 (${questions.length}개)`,
      description,
      questions,
      targetCompany,
      targetPosition
    });
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setShareUrl("");
    setCopied(false);
    onClose();
  };

  console.log('QuestionShareModal isOpen:', isOpen);
  if (!isOpen) return null;
  console.log('QuestionShareModal 렌더링됨');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-50 w-full max-w-md bg-background rounded-lg shadow-lg border p-6 mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">질문 목록 공유</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          선택한 질문 목록을 다른 사람과 공유하고 피드백을 받아보세요
        </p>
        
        {!shareUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-title">제목 (선택)</Label>
              <Input
                id="share-title"
                placeholder="예: 현대자동차 공정기술 면접 준비"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="share-description">설명 (선택)</Label>
              <Textarea
                id="share-description"
                placeholder="이 질문 목록에 대한 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">공유할 질문 ({questions.length}개)</p>
              <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {questions.map((q, i) => (
                  <li key={i} className="truncate">• {q}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                취소
              </Button>
              <Button 
                onClick={handleCreateShare} 
                disabled={isCreating || questions.length === 0}
                className="flex-1"
              >
                {isCreating ? "생성 중..." : "공유 링크 생성"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <Check className="h-5 w-5" />
                <span className="font-medium">공유 링크가 생성되었습니다!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500">
                아래 링크를 복사하여 공유하세요
              </p>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{shareUrl}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              닫기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
