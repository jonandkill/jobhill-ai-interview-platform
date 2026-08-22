import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Users, Plus, Pencil, Trash2, Check, X, Mail } from "lucide-react";

export default function AdminOrganizations() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{
    id: number;
    name: string;
    type: string;
    domain: string | null;
    maxMembers: number | null;
    planType: string;
    freeInterviewsPerMember: number | null;
    discountPercent: number | null;
  } | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    type: "university" as "university" | "company" | "academy" | "other",
    domain: "",
    joinCode: "",
    maxMembers: 100,
    planType: "free" as "free" | "basic" | "premium" | "enterprise",
    freeInterviewsPerMember: 5,
    discountPercent: 0,
  });
  
  const { data: organizations, isLoading, refetch } = trpc.organization.list.useQuery();
  const { data: pendingRequests } = trpc.organization.getPendingRequests.useQuery();
  
  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      toast.success("단체가 생성되었습니다.");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("단체 정보가 수정되었습니다.");
      setEditDialogOpen(false);
      setSelectedOrg(null);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      toast.success("단체가 삭제되었습니다.");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const processRequestMutation = trpc.organization.processRequest.useMutation({
    onSuccess: () => {
      toast.success("가입 신청이 처리되었습니다.");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      type: "university",
      domain: "",
      joinCode: "",
      maxMembers: 100,
      planType: "free",
      freeInterviewsPerMember: 5,
      discountPercent: 0,
    });
  };
  
  // 인증 코드 자동 생성
  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, joinCode: code });
  };
  
  const handleCreate = () => {
    createMutation.mutate(formData);
  };
  
  const handleEdit = () => {
    if (!selectedOrg) return;
    updateMutation.mutate({
      id: selectedOrg.id,
      ...formData,
    });
  };
  
  const openEditDialog = (org: typeof selectedOrg & { joinCode?: string | null }) => {
    if (!org) return;
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      type: org.type as "university" | "company" | "academy" | "other",
      domain: org.domain || "",
      joinCode: org.joinCode || "",
      maxMembers: org.maxMembers || 100,
      planType: org.planType as "free" | "basic" | "premium" | "enterprise",
      freeInterviewsPerMember: org.freeInterviewsPerMember || 5,
      discountPercent: org.discountPercent || 0,
    });
    setEditDialogOpen(true);
  };
  
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      university: "대학교",
      company: "기업",
      academy: "학원",
      other: "기타",
    };
    return labels[type] || type;
  };
  
  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: "무료",
      basic: "베이직",
      premium: "프리미엄",
      enterprise: "엔터프라이즈",
    };
    return labels[plan] || plan;
  };
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">단체 관리</h1>
            <p className="text-muted-foreground">학교, 기업 등 단체를 관리하고 권한을 부여합니다.</p>
          </div>
          <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            단체 추가
          </Button>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">전체 단체</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">대기 중인 가입 신청</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">활성 단체</CardTitle>
              <Check className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {organizations?.filter(o => o.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 가입 신청 목록 */}
        {pendingRequests && pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>가입 신청 대기</CardTitle>
              <CardDescription>승인 대기 중인 단체 가입 신청입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청자</TableHead>
                    <TableHead>단체</TableHead>
                    <TableHead>신청 메시지</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.userName || "알 수 없음"}</TableCell>
                      <TableCell>{request.organizationName}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.requestMessage || "-"}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString("ko-KR")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => processRequestMutation.mutate({ id: request.id, status: "approved" })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => processRequestMutation.mutate({ id: request.id, status: "rejected" })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* 단체 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>단체 목록</CardTitle>
            <CardDescription>등록된 모든 단체를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
            ) : organizations && organizations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>단체명</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>이메일 도메인</TableHead>
                    <TableHead>플랜</TableHead>
                    <TableHead>멤버 수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(org.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {org.domain ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {org.domain}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.planType === "enterprise" ? "default" : "secondary"}>
                          {getPlanLabel(org.planType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.memberCount || 0} / {org.maxMembers}</TableCell>
                      <TableCell>
                        <Badge variant={org.isActive ? "default" : "destructive"}>
                          {org.isActive ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(org)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("정말 이 단체를 삭제하시겠습니까?")) {
                              deleteMutation.mutate({ id: org.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                등록된 단체가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 단체 생성 다이얼로그 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>단체 추가</DialogTitle>
              <DialogDescription>새로운 단체를 등록합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>단체명</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 서울대학교"
                />
              </div>
              <div>
                <Label>유형</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">대학교</SelectItem>
                    <SelectItem value="company">기업</SelectItem>
                    <SelectItem value="academy">학원</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>인증 코드</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.joinCode}
                    onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                    placeholder="예: ABC12345"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateJoinCode}>
                    자동생성
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  사용자가 이 코드를 입력하면 단체에 자동 가입됩니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>최대 멤버 수</Label>
                  <Input
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <Label>플랜</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(v) => setFormData({ ...formData, planType: v as typeof formData.planType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">무료</SelectItem>
                      <SelectItem value="basic">베이직</SelectItem>
                      <SelectItem value="premium">프리미엄</SelectItem>
                      <SelectItem value="enterprise">엔터프라이즈</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>무료 면접 횟수 (멤버당)</Label>
                  <Input
                    type="number"
                    value={formData.freeInterviewsPerMember}
                    onChange={(e) => setFormData({ ...formData, freeInterviewsPerMember: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label>할인율 (%)</Label>
                  <Input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>취소</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 단체 수정 다이얼로그 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>단체 수정</DialogTitle>
              <DialogDescription>단체 정보를 수정합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>단체명</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>유형</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">대학교</SelectItem>
                    <SelectItem value="company">기업</SelectItem>
                    <SelectItem value="academy">학원</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>인증 코드</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.joinCode}
                    onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateJoinCode}>
                    자동생성
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>최대 멤버 수</Label>
                  <Input
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <Label>플랜</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(v) => setFormData({ ...formData, planType: v as typeof formData.planType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">무료</SelectItem>
                      <SelectItem value="basic">베이직</SelectItem>
                      <SelectItem value="premium">프리미엄</SelectItem>
                      <SelectItem value="enterprise">엔터프라이즈</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>무료 면접 횟수 (멤버당)</Label>
                  <Input
                    type="number"
                    value={formData.freeInterviewsPerMember}
                    onChange={(e) => setFormData({ ...formData, freeInterviewsPerMember: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label>할인율 (%)</Label>
                  <Input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>취소</Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
