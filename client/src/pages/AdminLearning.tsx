import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  FileText,
  Building2,
  Briefcase,
  MessageSquare
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const dataTypes = [
  { value: "interview_qa", label: "면접 Q&A", icon: MessageSquare },
  { value: "company_info", label: "기업 정보", icon: Building2 },
  { value: "job_info", label: "직무 정보", icon: Briefcase },
  { value: "feedback_template", label: "피드백 템플릿", icon: FileText },
];

export default function AdminLearning() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    dataType: "interview_qa" as any,
    title: "",
    content: "",
    companyName: "",
    positionType: "",
    tags: "",
  });

  const { data: learningData, isLoading, refetch } = trpc.admin.learningData.list.useQuery(
    { dataType: selectedType as any },
    { enabled: user?.role === "admin" }
  );

  const createMutation = trpc.admin.learningData.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      resetForm();
      toast.success("학습 자료가 추가되었습니다.");
    },
    onError: (error) => {
      toast.error("추가 실패: " + error.message);
    },
  });

  const updateMutation = trpc.admin.learningData.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      resetForm();
      toast.success("학습 자료가 수정되었습니다.");
    },
    onError: (error) => {
      toast.error("수정 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.admin.learningData.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("학습 자료가 삭제되었습니다.");
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      dataType: "interview_qa",
      title: "",
      content: "",
      companyName: "",
      positionType: "",
      tags: "",
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      dataType: item.dataType,
      title: item.title,
      content: item.content,
      companyName: item.companyName || "",
      positionType: item.positionType || "",
      tags: item.tags || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">관리자 전용 페이지</h3>
              <p className="text-muted-foreground">
                이 페이지는 관리자만 접근할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6" />
              학습 자료 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              AI 면접 코치의 학습 데이터를 관리합니다
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                자료 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "학습 자료 수정" : "학습 자료 추가"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>자료 유형</Label>
                  <Select
                    value={formData.dataType}
                    onValueChange={(value) => setFormData({ ...formData, dataType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="자료 제목"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>회사명 (선택)</Label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="예: 삼성전자"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>직무 (선택)</Label>
                    <Input
                      value={formData.positionType}
                      onChange={(e) => setFormData({ ...formData, positionType: e.target.value })}
                      placeholder="예: 마케팅"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>내용 (JSON 또는 텍스트)</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={`면접 Q&A 예시:
{
  "question": "자기소개 해주세요",
  "sampleAnswer": "안녕하세요, 저는...",
  "tips": ["핵심 역량 강조", "1분 내외로"]
}`}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>태그 (쉼표로 구분)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="예: 자기소개, 신입, 공통질문"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    취소
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {editingItem ? "수정" : "추가"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!selectedType ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(undefined)}
          >
            전체
          </Button>
          {dataTypes.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !learningData || learningData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">학습 자료가 없습니다</h3>
              <p className="text-muted-foreground">
                새로운 학습 자료를 추가해주세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {learningData.map((item) => {
              const typeInfo = dataTypes.find((t) => t.value === item.dataType);
              const Icon = typeInfo?.icon || FileText;
              
              return (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary">{typeInfo?.label}</Badge>
                            {item.companyName && <span>{item.companyName}</span>}
                            {item.positionType && <span>• {item.positionType}</span>}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-secondary/30 p-3 rounded-lg overflow-x-auto max-h-32">
                      {item.content.substring(0, 300)}
                      {item.content.length > 300 && "..."}
                    </pre>
                    {item.tags && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.tags.split(",").map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
