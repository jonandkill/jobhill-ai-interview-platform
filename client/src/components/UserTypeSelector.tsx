import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { GraduationCap, Briefcase, ArrowRightLeft, RefreshCw, Check } from "lucide-react";

interface UserTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (type: string) => void;
}

const userTypes = [
  {
    id: "new_grad",
    title: "신입",
    description: "첫 취업을 준비하는 취업준비생",
    icon: GraduationCap,
    tips: "자기소개, 지원동기, 성격의 장단점 위주로 준비하세요",
    color: "bg-blue-500",
  },
  {
    id: "experienced",
    title: "경력직",
    description: "경력을 바탕으로 이직을 준비하는 분",
    icon: Briefcase,
    tips: "이직 사유, 성과/실적, 리더십 경험 위주로 준비하세요",
    color: "bg-green-500",
  },
  {
    id: "career_change",
    title: "이직/전직",
    description: "다른 분야로 커리어 전환을 준비하는 분",
    icon: ArrowRightLeft,
    tips: "전환 이유, 관련 경험, 학습 의지 위주로 준비하세요",
    color: "bg-purple-500",
  },
  {
    id: "return",
    title: "중고신입/경단녀",
    description: "경력 단절 후 재취업을 준비하는 분",
    icon: RefreshCw,
    tips: "공백기 활용, 복귀 의지, 적응력 위주로 준비하세요",
    color: "bg-orange-500",
  },
];

export default function UserTypeSelector({ open, onClose, onSelect }: UserTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const updateTypeMutation = trpc.user.updateType.useMutation({
    onSuccess: () => {
      toast.success("사용자 유형이 설정되었습니다!");
      onSelect?.(selectedType!);
      onClose();
    },
    onError: (error) => {
      toast.error("설정 실패: " + error.message);
    },
  });

  const handleConfirm = () => {
    if (selectedType) {
      updateTypeMutation.mutate({ userType: selectedType as any });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">어떤 취업 준비를 하고 계신가요?</DialogTitle>
          <DialogDescription>
            맞춤형 면접 코칭을 위해 현재 상황을 선택해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 py-4">
          {userTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-primary border-primary" : ""
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    💡 {type.tips}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            나중에 선택
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedType || updateTypeMutation.isPending}
          >
            {updateTypeMutation.isPending ? "저장 중..." : "선택 완료"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
