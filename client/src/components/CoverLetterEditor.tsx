import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Upload,
  GripVertical,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface CoverLetterItem {
  id?: number;
  itemOrder: number;
  itemTitle: string;
  maxLength?: number;
  content?: string;
}

interface CoverLetterEditorProps {
  items: CoverLetterItem[];
  onChange: (items: CoverLetterItem[]) => void;
  mode: "input" | "upload";
  onModeChange: (mode: "input" | "upload") => void;
  onFileUpload?: (file: File) => void;
}

// 지원되는 파일 확장자
const SUPPORTED_EXTENSIONS = [".hwp", ".hwpx", ".pdf", ".docx", ".doc", ".txt"];

export default function CoverLetterEditor({
  items,
  onChange,
  mode,
  onModeChange,
  onFileUpload,
}: CoverLetterEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addItem = () => {
    const newItem: CoverLetterItem = {
      itemOrder: items.length + 1,
      itemTitle: "",
      maxLength: 500,
      content: "",
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      itemOrder: i + 1,
    }));
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof CoverLetterItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      toast.error(`지원하지 않는 파일 형식입니다. 지원 형식: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      return;
    }

    if (onFileUpload) {
      onFileUpload(file);
    }
    toast.success(`${file.name} 파일이 선택되었습니다.`);
  };

  const getCharCountColor = (current: number, max?: number) => {
    if (!max) return "text-muted-foreground";
    const ratio = current / max;
    if (ratio > 1) return "text-red-500";
    if (ratio > 0.9) return "text-orange-500";
    if (ratio > 0.7) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      {/* 모드 선택 */}
      <div className="flex gap-2">
        <Button
          variant={mode === "input" ? "default" : "outline"}
          onClick={() => onModeChange("input")}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          직접 입력
        </Button>
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => onModeChange("upload")}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          파일 업로드
        </Button>
      </div>

      {mode === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">자기소개서 파일 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                파일을 드래그하거나 클릭하여 업로드하세요
              </p>
              <input
                type="file"
                accept=".hwp,.hwpx,.pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="cover-letter-upload"
              />
              <label htmlFor="cover-letter-upload">
                <Button variant="outline" asChild>
                  <span>파일 선택</span>
                </Button>
              </label>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">지원 파일 형식</p>
                <p>한글 파일 (.hwp, .hwpx), PDF (.pdf), Word (.docx, .doc), 텍스트 (.txt)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index} className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground">
                <GripVertical className="w-4 h-4" />
              </div>
              <CardContent className="pl-8 pt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>항목 {index + 1}</Label>
                      <Input
                        placeholder="항목명을 입력하세요 (예: 지원동기를 작성해주세요)"
                        value={item.itemTitle}
                        onChange={(e) => updateItem(index, "itemTitle", e.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>글자수 제한</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={item.maxLength || ""}
                        onChange={(e) => updateItem(index, "maxLength", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-6 text-red-500 hover:text-red-700"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>내용</Label>
                      <span className={`text-sm ${getCharCountColor(item.content?.length || 0, item.maxLength)}`}>
                        {item.content?.length || 0}
                        {item.maxLength && ` / ${item.maxLength}`}자
                      </span>
                    </div>
                    <Textarea
                      placeholder="자기소개서 내용을 입력하세요..."
                      value={item.content || ""}
                      onChange={(e) => updateItem(index, "content", e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    {item.maxLength && (item.content?.length || 0) > item.maxLength && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        글자수 제한을 초과했습니다.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={addItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            항목 추가
          </Button>

          {items.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">총 {items.length}개 항목</p>
                <p className="text-sm text-muted-foreground">
                  총 {items.reduce((sum, item) => sum + (item.content?.length || 0), 0)}자 작성
                </p>
              </div>
              <Badge variant="secondary">
                {items.filter(item => item.content && item.content.length > 0).length}개 작성 완료
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
