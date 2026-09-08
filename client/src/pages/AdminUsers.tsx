import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Search, ChevronLeft, ChevronRight, Eye, Activity, CheckSquare, Square, BarChart3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

export default function AdminUsers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkRole, setBulkRole] = useState<'user' | 'admin'>('user');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationContent, setNotificationContent] = useState("");
  const [sendEmailWithNotification, setSendEmailWithNotification] = useState(false);
  
  const limit = 20;
  
  // 관리자 권한 확인
  if (user?.role !== 'admin') {
    return (
      <div className="container py-12 text-center">
        <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h1>
        <p className="text-muted-foreground mb-4">이 페이지는 관리자만 접근할 수 있습니다.</p>
        <Link href="/dashboard">
          <Button>대시보드로 이동</Button>
        </Link>
      </div>
    );
  }
  
  // 회원 목록 조회
  const { data: usersData, isLoading, refetch } = trpc.admin.getUsers.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
  });
  
  // 회원 통계 조회
  const { data: stats } = trpc.admin.getUserStats.useQuery();
  
  // 회원 상세 정보 조회
  const { data: userDetail } = trpc.admin.getUserDetail.useQuery(
    { userId: selectedUser?.id },
    { enabled: !!selectedUser?.id && showDetailDialog }
  );
  
  // 권한 변경 mutation
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("회원 권한이 변경되었습니다.");
      refetch();
      setShowRoleDialog(false);
    },
    onError: (error) => {
      toast.error("권한 변경 실패: " + error.message);
    },
  });
  
  // 활동 로그 조회
  const { data: activityLog } = trpc.admin.getUserActivityLog.useQuery(
    { userId: selectedUser?.id },
    { enabled: !!selectedUser?.id && showActivityLog }
  );
  
  // 일괄 권한 변경 mutation
  const bulkUpdateMutation = trpc.admin.bulkUpdateRoles.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updatedCount}명의 회원 권한이 변경되었습니다.`);
      refetch();
      setSelectedUserIds([]);
      setShowBulkDialog(false);
    },
    onError: (error) => {
      toast.error("일괄 권한 변경 실패: " + error.message);
    },
  });
  
  // 일괄 알림 발송 mutation
  const sendNotificationMutation = trpc.admin.sendBulkNotification.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.sentCount}명에게 알림을 발송했습니다.`);
      setSelectedUserIds([]);
      setShowNotificationDialog(false);
      setNotificationTitle("");
      setNotificationContent("");
      setSendEmailWithNotification(false);
    },
    onError: (error) => {
      toast.error("알림 발송 실패: " + error.message);
    },
  });
  
  // 관리자 추가 mutation
  const setAdminMutation = trpc.admin.setAdminByEmail.useMutation({
    onSuccess: () => {
      toast.success("관리자가 추가되었습니다.");
      refetch();
      setShowAddAdminDialog(false);
      setAddAdminEmail("");
    },
    onError: (error) => {
      toast.error("관리자 추가 실패: " + error.message);
    },
  });
  
  const handleSearch = () => {
    setPage(0);
    refetch();
  };
  
  const handleRoleChange = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };
  
  const handleAddAdmin = () => {
    if (addAdminEmail) {
      setAdminMutation.mutate({ email: addAdminEmail });
    }
  };
  
  const handleBulkUpdate = () => {
    if (selectedUserIds.length > 0) {
      bulkUpdateMutation.mutate({ userIds: selectedUserIds, role: bulkRole });
    }
  };
  
  const handleSendNotification = () => {
    if (selectedUserIds.length > 0 && notificationTitle && notificationContent) {
      sendNotificationMutation.mutate({
        userIds: selectedUserIds,
        title: notificationTitle,
        content: notificationContent,
        sendEmail: sendEmailWithNotification,
      });
    }
  };
  
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const toggleAllSelection = () => {
    if (usersData?.users) {
      if (selectedUserIds.length === usersData.users.length) {
        setSelectedUserIds([]);
      } else {
        setSelectedUserIds(usersData.users.map((u: any) => u.id));
      }
    }
  };
  
  const totalPages = Math.ceil((usersData?.total || 0) / limit);
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">회원 관리</h1>
          <p className="text-muted-foreground">전체 회원을 조회하고 관리합니다.</p>
        </div>
        <Button onClick={() => setShowAddAdminDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          관리자 추가
        </Button>
      </div>
      
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 회원</CardDescription>
            <CardTitle className="text-2xl">{stats?.totalUsers || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>오늘 가입</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats?.newUsersToday || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>이번 주 가입</CardDescription>
            <CardTitle className="text-2xl">{stats?.newUsersThisWeek || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>이번 달 가입</CardDescription>
            <CardTitle className="text-2xl">{stats?.newUsersThisMonth || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>관리자 수</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats?.adminCount || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Select value={roleFilter} onValueChange={(v: any) => { setRoleFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="권한 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="user">일반 회원</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* 일괄 관리 버튼 */}
      {selectedUserIds.length > 0 && (
        <Card className="mb-4 bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">
              <strong>{selectedUserIds.length}명</strong> 선택됨
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUserIds([])}>
                선택 해제
              </Button>
              <Button size="sm" onClick={() => setShowBulkDialog(true)}>
                일괄 권한 변경
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowNotificationDialog(true)}>
                알림 발송
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 회원 목록 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={usersData?.users && selectedUserIds.length === usersData.users.length && usersData.users.length > 0}
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>최근 로그인</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : usersData?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    회원이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                usersData?.users.map((u: any) => (
                  <TableRow key={u.id} className={selectedUserIds.includes(u.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.includes(u.id)}
                        onCheckedChange={() => toggleUserSelection(u.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.id}</TableCell>
                    <TableCell>{u.name || '-'}</TableCell>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? '관리자' : '회원'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.lastSignedIn).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(u); setShowDetailDialog(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(u); setNewRole(u.role); setShowRoleDialog(true); }}
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* 회원 상세 정보 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>회원 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedUser?.name || selectedUser?.email || '회원'} 님의 상세 정보입니다.
            </DialogDescription>
          </DialogHeader>
          {userDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">이름</p>
                  <p className="font-medium">{userDetail.user?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이메일</p>
                  <p className="font-medium">{userDetail.user?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">권한</p>
                  <Badge variant={userDetail.user?.role === 'admin' ? 'default' : 'secondary'}>
                    {userDetail.user?.role === 'admin' ? '관리자' : '회원'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">구독 상태</p>
                  <Badge variant={userDetail.subscription ? 'default' : 'outline'}>
                    {userDetail.subscription?.planType || '무료'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">면접 세션 수</p>
                  <p className="font-medium">{userDetail.sessionCount || 0}회</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">지원 회사</p>
                  <p className="font-medium">{userDetail.profile?.targetCompany || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 권한 변경 다이얼로그 */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.name || selectedUser?.email || '회원'} 님의 권한을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">일반 회원</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              취소
            </Button>
            <Button onClick={handleRoleChange} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? '변경 중...' : '변경'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 관리자 추가 다이얼로그 */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 추가</DialogTitle>
            <DialogDescription>
              이메일 주소를 입력하여 해당 회원을 관리자로 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="email"
              placeholder="이메일 주소 입력"
              value={addAdminEmail}
              onChange={(e) => setAddAdminEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddAdmin} disabled={setAdminMutation.isPending || !addAdminEmail}>
              {setAdminMutation.isPending ? '추가 중...' : '관리자로 설정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 일괄 권한 변경 다이얼로그 */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 권한 변경</DialogTitle>
            <DialogDescription>
              선택한 {selectedUserIds.length}명의 회원 권한을 일괄 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bulkRole} onValueChange={(v: any) => setBulkRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">일반 회원</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              취소
            </Button>
            <Button onClick={handleBulkUpdate} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? '변경 중...' : `${selectedUserIds.length}명 권한 변경`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 알림 발송 다이얼로그 */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>회원 알림 발송</DialogTitle>
            <DialogDescription>
              선택한 {selectedUserIds.length}명의 회원에게 알림을 발송합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">알림 제목</label>
              <Input
                placeholder="알림 제목을 입력하세요"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">알림 내용</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="알림 내용을 입력하세요"
                value={notificationContent}
                onChange={(e) => setNotificationContent(e.target.value)}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {notificationContent.length}/2000자
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmailWithNotification}
                onCheckedChange={(checked) => setSendEmailWithNotification(checked === true)}
              />
              <label htmlFor="sendEmail" className="text-sm cursor-pointer">
                이메일로도 발송하기
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSendNotification} 
              disabled={sendNotificationMutation.isPending || !notificationTitle || !notificationContent}
            >
              {sendNotificationMutation.isPending ? '발송 중...' : `${selectedUserIds.length}명에게 발송`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
