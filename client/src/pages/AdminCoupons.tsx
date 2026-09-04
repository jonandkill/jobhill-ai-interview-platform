import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit, Ticket, Clock, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCoupons() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  
  // 폼 상태
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [freeHours, setFreeHours] = useState(24);
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState("");
  
  const { data: coupons, refetch } = trpc.coupon.list.useQuery();
  const createMutation = trpc.coupon.create.useMutation({
    onSuccess: () => {
      toast.success("쿠폰이 생성되었습니다.");
      refetch();
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.coupon.update.useMutation({
    onSuccess: () => {
      toast.success("쿠폰이 수정되었습니다.");
      refetch();
      setEditingCoupon(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.coupon.delete.useMutation({
    onSuccess: () => {
      toast.success("쿠폰이 삭제되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const resetForm = () => {
    setCode("");
    setDescription("");
    setFreeHours(24);
    setMaxUses(undefined);
    setExpiresAt("");
  };
  
  const handleCreate = () => {
    if (!code.trim()) {
      toast.error("쿠폰 코드를 입력해주세요.");
      return;
    }
    
    createMutation.mutate({
      code: code.trim(),
      description: description.trim() || undefined,
      freeHours,
      maxUses: maxUses || undefined,
      expiresAt: expiresAt || undefined,
    });
  };
  
  const handleUpdate = () => {
    if (!editingCoupon) return;
    
    updateMutation.mutate({
      id: editingCoupon.id,
      description: description.trim() || undefined,
      freeHours,
      maxUses: maxUses || undefined,
      expiresAt: expiresAt || undefined,
      isActive: editingCoupon.isActive,
    });
  };
  
  const handleToggleActive = (coupon: any) => {
    updateMutation.mutate({
      id: coupon.id,
      isActive: !coupon.isActive,
    });
  };
  
  const openEditDialog = (coupon: any) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || "");
    setFreeHours(coupon.freeHours || 24);
    setMaxUses(coupon.maxUses || undefined);
    setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : "");
  };
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">쿠폰 관리</h1>
            <p className="text-muted-foreground mt-1">무료 사용 쿠폰을 생성하고 관리합니다.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                쿠폰 생성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 쿠폰 생성</DialogTitle>
                <DialogDescription>
                  무료 사용 쿠폰을 생성합니다. 코드는 대문자로 자동 변환됩니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">쿠폰 코드 *</Label>
                  <Input
                    id="code"
                    placeholder="예: WELCOME2024"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Input
                    id="description"
                    placeholder="예: 신규 가입 환영 쿠폰"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freeHours">무료 시간 (시간)</Label>
                    <Input
                      id="freeHours"
                      type="number"
                      min={1}
                      value={freeHours}
                      onChange={(e) => setFreeHours(parseInt(e.target.value) || 24)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxUses">최대 사용 횟수</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min={1}
                      placeholder="무제한"
                      value={maxUses || ""}
                      onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">만료일</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">비워두면 무기한</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "생성 중..." : "생성"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 쿠폰</p>
                  <p className="text-2xl font-bold">{coupons?.length || 0}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">활성 쿠폰</p>
                  <p className="text-2xl font-bold">{coupons?.filter(c => c.isActive).length || 0}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 사용 횟수</p>
                  <p className="text-2xl font-bold">{coupons?.reduce((sum, c) => sum + (c.currentUses || 0), 0) || 0}회</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">만료 예정</p>
                  <p className="text-2xl font-bold">
                    {coupons?.filter(c => c.expiresAt && new Date(c.expiresAt) > new Date() && new Date(c.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length || 0}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 쿠폰 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>쿠폰 목록</CardTitle>
            <CardDescription>생성된 모든 쿠폰을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {!coupons || coupons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>생성된 쿠폰이 없습니다.</p>
                <p className="text-sm mt-1">새 쿠폰을 생성해보세요.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코드</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>무료 시간</TableHead>
                    <TableHead>사용 현황</TableHead>
                    <TableHead>만료일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell>{coupon.description || "-"}</TableCell>
                      <TableCell>{coupon.freeHours}시간</TableCell>
                      <TableCell>
                        {coupon.currentUses || 0}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : " / 무제한"}
                      </TableCell>
                      <TableCell>{formatDate(coupon.expiresAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.isActive || false}
                            onCheckedChange={() => handleToggleActive(coupon)}
                          />
                          <Badge variant={coupon.isActive ? "default" : "secondary"}>
                            {coupon.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("정말 이 쿠폰을 삭제하시겠습니까?")) {
                                deleteMutation.mutate({ id: coupon.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* 수정 다이얼로그 */}
        <Dialog open={!!editingCoupon} onOpenChange={(open) => !open && setEditingCoupon(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>쿠폰 수정</DialogTitle>
              <DialogDescription>
                쿠폰 코드: <span className="font-mono font-bold">{editingCoupon?.code}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">설명</Label>
                <Input
                  id="edit-description"
                  placeholder="예: 신규 가입 환영 쿠폰"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-freeHours">무료 시간 (시간)</Label>
                  <Input
                    id="edit-freeHours"
                    type="number"
                    min={1}
                    value={freeHours}
                    onChange={(e) => setFreeHours(parseInt(e.target.value) || 24)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-maxUses">최대 사용 횟수</Label>
                  <Input
                    id="edit-maxUses"
                    type="number"
                    min={1}
                    placeholder="무제한"
                    value={maxUses || ""}
                    onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-expiresAt">만료일</Label>
                <Input
                  id="edit-expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCoupon(null)}>
                취소
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
