import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Star, MessageSquare, Eye, EyeOff, CheckCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Review {
  id: number;
  userId: number;
  userName: string | null;
  rating: number | null;
  content: string | null;
  isApproved: boolean | null;
  isDisplayed: boolean | null;
  createdAt: Date | string | null;
}

export default function AdminReviews() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [createAuthor, setCreateAuthor] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createRating, setCreateRating] = useState(5);

  const { data: reviews, refetch } = trpc.review.list.useQuery();
  
  const updateMutation = trpc.review.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("후기 상태가 업데이트되었습니다.");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const createMutation = trpc.review.createByAdmin.useMutation({
    onSuccess: () => {
      toast.success("후기가 생성되었습니다.");
      setCreateDialogOpen(false);
      setCreateAuthor("");
      setCreateContent("");
      setCreateRating(5);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const editMutation = trpc.review.edit.useMutation({
    onSuccess: () => {
      toast.success("후기가 수정되었습니다.");
      setEditDialogOpen(false);
      setSelectedReview(null);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.review.delete.useMutation({
    onSuccess: () => {
      toast.success("후기가 삭제되었습니다.");
      setDeleteDialogOpen(false);
      setSelectedReview(null);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const handleToggleApproved = (review: Review) => {
    updateMutation.mutate({
      id: review.id,
      isApproved: !review.isApproved,
    });
  };
  
  const handleToggleDisplayed = (review: Review) => {
    updateMutation.mutate({
      id: review.id,
      isDisplayed: !review.isDisplayed,
    });
  };

  const handleEditClick = (review: Review) => {
    setSelectedReview(review);
    setEditContent(review.content || "");
    setEditRating(review.rating || 5);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (review: Review) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedReview) return;
    editMutation.mutate({
      id: selectedReview.id,
      content: editContent,
      rating: editRating,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedReview) return;
    deleteMutation.mutate({ id: selectedReview.id });
  };

  const handleCreateReview = () => {
    if (!createAuthor.trim() || !createContent.trim()) {
      toast.error("작성자와 내용을 모두 입력해주세요.");
      return;
    }
    createMutation.mutate({
      author: createAuthor,
      content: createContent,
      rating: createRating,
    });
  };
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onChange && onChange(star)}
          />
        ))}
      </div>
    );
  };
  
  const approvedCount = reviews?.filter(r => r.isApproved).length || 0;
  const displayedCount = reviews?.filter(r => r.isDisplayed).length || 0;
  const avgRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";
  
  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">후기 관리</h1>
            <p className="text-muted-foreground mt-1">사용자 후기를 관리하고 메인 페이지 노출을 설정합니다.</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            후기 생성
          </Button>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 후기</p>
                  <p className="text-2xl font-bold">{reviews?.length || 0}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">승인됨</p>
                  <p className="text-2xl font-bold">{approvedCount}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">메인 노출</p>
                  <p className="text-2xl font-bold">{displayedCount}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">평균 별점</p>
                  <p className="text-2xl font-bold">{avgRating}점</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 후기 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>후기 목록</CardTitle>
            <CardDescription>모든 사용자 후기를 관리합니다. 수정 및 삭제가 가능합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {!reviews || reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>등록된 후기가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>작성자</TableHead>
                    <TableHead>별점</TableHead>
                    <TableHead className="max-w-md">내용</TableHead>
                    <TableHead>작성일</TableHead>
                    <TableHead>승인</TableHead>
                    <TableHead>메인 노출</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.userName || "익명"}</TableCell>
                      <TableCell>{renderStars(review.rating || 0)}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{review.content}</p>
                      </TableCell>
                      <TableCell>{formatDate(review.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={review.isApproved || false}
                            onCheckedChange={() => handleToggleApproved(review)}
                          />
                          <Badge variant={review.isApproved ? "default" : "secondary"}>
                            {review.isApproved ? "승인" : "대기"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={review.isDisplayed || false}
                            onCheckedChange={() => handleToggleDisplayed(review)}
                            disabled={!review.isApproved}
                          />
                          {review.isDisplayed ? (
                            <Eye className="w-4 h-4 text-blue-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(review)}
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(review)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="삭제"
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
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>후기 수정</DialogTitle>
              <DialogDescription>
                {selectedReview?.userName || "익명"}님의 후기를 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>별점</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 cursor-pointer transition-transform hover:scale-110 ${star <= editRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                      onClick={() => setEditRating(star)}
                    />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">{editRating}점</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  placeholder="후기 내용을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleEditSubmit} disabled={editMutation.isPending}>
                {editMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                후기 삭제
              </DialogTitle>
              <DialogDescription>
                정말로 이 후기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <p className="font-medium">{selectedReview?.userName || "익명"}</p>
                  <div className="flex items-center gap-1 my-2">
                    {renderStars(selectedReview?.rating || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {selectedReview?.content}
                  </p>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 후기 생성 모달 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                후기 생성
              </DialogTitle>
              <DialogDescription>
                사이트 활성화를 위한 후기를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="author">작성자</Label>
                <Input
                  id="author"
                  placeholder="작성자 이름"
                  value={createAuthor}
                  onChange={(e) => setCreateAuthor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">평점</Label>
                <div className="flex items-center gap-2">
                  {renderStars(createRating, true, setCreateRating)}
                  <span className="text-sm text-muted-foreground ml-2">{createRating}점</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  placeholder="후기 내용 (10~500자)"
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  {createContent.length}/500
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleCreateReview}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
