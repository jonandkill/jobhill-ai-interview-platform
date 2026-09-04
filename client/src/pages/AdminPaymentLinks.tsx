import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Plus, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentLinks() {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [formData, setFormData] = useState({
    planType: "monthly" as "monthly" | "basic" | "premium" | "premium_plus",
    externalUrl: "",
    description: "",
    isActive: true,
  });

  const { data: links, refetch: refetchLinks } = trpc.paymentLink.listLinks.useQuery();
  const { data: pendingRequests, refetch: refetchRequests } = trpc.paymentLink.pendingRequests.useQuery();

  const upsertLinkMutation = trpc.paymentLink.upsertLink.useMutation({
    onSuccess: () => {
      toast.success("결제 링크가 저장되었습니다.");
      setShowLinkDialog(false);
      setEditingLink(null);
      resetForm();
      refetchLinks();
    },
    onError: (error) => {
      toast.error(error.message || "저장에 실패했습니다.");
    },
  });

  const approveRequestMutation = trpc.paymentLink.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("결제 신청이 승인되었습니다.");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "승인에 실패했습니다.");
    },
  });

  const rejectRequestMutation = trpc.paymentLink.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("결제 신청이 거부되었습니다.");
      refetchRequests();
    },
    onError: (error) => {
      toast.error(error.message || "거부에 실패했습니다.");
    },
  });

  const resetForm = () => {
    setFormData({
      planType: "monthly",
      externalUrl: "",
      description: "",
      isActive: true,
    });
  };

  const handleOpenLinkDialog = (link?: any) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        planType: link.planType,
        externalUrl: link.externalUrl,
        description: link.description || "",
        isActive: link.isActive,
      });
    } else {
      setEditingLink(null);
      resetForm();
    }
    setShowLinkDialog(true);
  };

  const handleSaveLink = () => {
    upsertLinkMutation.mutate(formData);
  };

  const handleApprove = (requestId: number) => {
    if (confirm("이 결제 신청을 승인하시겠습니까?")) {
      approveRequestMutation.mutate({ requestId });
    }
  };

  const handleReject = (requestId: number) => {
    const reason = prompt("거부 사유를 입력해주세요:");
    if (reason) {
      rejectRequestMutation.mutate({ requestId, reason });
    }
  };

  const getPlanName = (planType: string) => {
    const names: Record<string, string> = {
      monthly: "월 정액",
      basic: "베이직",
      premium: "프리미엄",
      premium_plus: "프리미엄+",
    };
    return names[planType] || planType;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />승인됨</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />거부됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">결제 링크 관리</h1>
            <p className="text-muted-foreground">
              외부 결제창 URL을 설정하고 결제 신청을 승인하세요
            </p>
          </div>
          <Button onClick={() => handleOpenLinkDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            링크 추가
          </Button>
        </div>

        {/* 결제 링크 목록 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>결제 링크 설정</CardTitle>
            <CardDescription>요금제별 외부 결제창 URL 관리</CardDescription>
          </CardHeader>
          <CardContent>
            {links && links.length > 0 ? (
              <div className="space-y-4">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{getPlanName(link.planType)}</span>
                        {link.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
                        ) : (
                          <Badge variant="outline">비활성</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          <a href={link.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {link.externalUrl}
                          </a>
                        </div>
                        {link.description && <div className="mt-1">{link.description}</div>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenLinkDialog(link)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                등록된 결제 링크가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결제 신청 승인 */}
        <Card>
          <CardHeader>
            <CardTitle>결제 신청 승인</CardTitle>
            <CardDescription>사용자의 결제 신청을 확인하고 승인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{request.user?.name || "알 수 없음"}</span>
                        <span className="text-sm text-muted-foreground">({request.user?.email})</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>요금제: {getPlanName(request.planType)}</div>
                        <div>금액: {request.amount.toLocaleString()}원</div>
                        <div>신청일: {new Date(request.createdAt).toLocaleDateString("ko-KR")}</div>
                        {request.externalPaymentId && (
                          <div>결제 ID: {request.externalPaymentId}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveRequestMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleReject(request.id)}
                        disabled={rejectRequestMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        거부
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                대기 중인 결제 신청이 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결제 링크 추가/수정 다이얼로그 */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLink ? "결제 링크 수정" : "결제 링크 추가"}</DialogTitle>
              <DialogDescription>
                외부 결제창 URL을 설정하세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="planType">요금제</Label>
                <select
                  id="planType"
                  className="w-full p-2 border rounded-md"
                  value={formData.planType}
                  onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                >
                  <option value="monthly">월 정액</option>
                  <option value="basic">베이직</option>
                  <option value="premium">프리미엄</option>
                  <option value="premium_plus">프리미엄+</option>
                </select>
              </div>

              <div>
                <Label htmlFor="externalUrl">외부 결제창 URL</Label>
                <Input
                  id="externalUrl"
                  placeholder="https://payment.example.com/..."
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  placeholder="결제 링크에 대한 설명을 입력하세요"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>활성화</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                취소
              </Button>
              <Button 
                onClick={handleSaveLink}
                disabled={upsertLinkMutation.isPending || !formData.externalUrl}
              >
                {upsertLinkMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
