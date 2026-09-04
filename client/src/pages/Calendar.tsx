import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Plus, MapPin, Clock, Building2, Trash2, Edit, Phone, Video, Users, ArrowLeft, Bell } from "lucide-react";

export default function CalendarPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  
  // 폼 상태
  const [companyName, setCompanyName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewType, setInterviewType] = useState<"phone" | "video" | "onsite" | "other">("onsite");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDays, setReminderDays] = useState(3);

  const schedulesQuery = trpc.schedule.list.useQuery();
  const createSchedule = trpc.schedule.create.useMutation({
    onSuccess: () => {
      toast.success("면접 일정이 등록되었습니다!");
      schedulesQuery.refetch();
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "일정 등록에 실패했습니다.");
    },
  });
  
  const updateSchedule = trpc.schedule.update.useMutation({
    onSuccess: () => {
      toast.success("면접 일정이 수정되었습니다!");
      schedulesQuery.refetch();
      resetForm();
      setEditingSchedule(null);
    },
    onError: (error) => {
      toast.error(error.message || "일정 수정에 실패했습니다.");
    },
  });
  
  const deleteSchedule = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("면접 일정이 삭제되었습니다.");
      schedulesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "일정 삭제에 실패했습니다.");
    },
  });

  const resetForm = () => {
    setCompanyName("");
    setPositionName("");
    setInterviewDate("");
    setInterviewTime("");
    setInterviewType("onsite");
    setLocation("");
    setNotes("");
    setReminderDays(3);
  };

  const handleSubmit = () => {
    if (!companyName || !interviewDate || !interviewTime) {
      toast.error("회사명, 날짜, 시간은 필수입니다.");
      return;
    }

    const dateTime = new Date(`${interviewDate}T${interviewTime}`);
    
    if (editingSchedule) {
      updateSchedule.mutate({
        id: editingSchedule.id,
        companyName,
        positionName,
        interviewDate: dateTime.toISOString(),
        interviewType,
        location,
        notes,
      });
    } else {
      createSchedule.mutate({
        companyName,
        positionName,
        interviewDate: dateTime.toISOString(),
        interviewType,
        location,
        notes,
        reminderDays,
      });
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setCompanyName(schedule.companyName);
    setPositionName(schedule.positionName || "");
    const date = new Date(schedule.interviewDate);
    setInterviewDate(date.toISOString().split("T")[0]);
    setInterviewTime(date.toTimeString().slice(0, 5));
    setInterviewType(schedule.interviewType || "onsite");
    setLocation(schedule.location || "");
    setNotes(schedule.notes || "");
    setReminderDays(schedule.reminderDays || 3);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 이 일정을 삭제하시겠습니까?")) {
      deleteSchedule.mutate({ id });
    }
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case "phone": return <Phone className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "onsite": return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getInterviewTypeLabel = (type: string) => {
    switch (type) {
      case "phone": return "전화 면접";
      case "video": return "화상 면접";
      case "onsite": return "대면 면접";
      default: return "기타";
    }
  };

  const schedules = schedulesQuery.data || [];
  const upcomingSchedules = schedules.filter(s => s.status === "scheduled" && new Date(s.interviewDate) > new Date());
  const pastSchedules = schedules.filter(s => s.status !== "scheduled" || new Date(s.interviewDate) <= new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 헤더 */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-400" />
              <h1 className="text-xl font-bold text-white">면접 일정 캘린더</h1>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingSchedule(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                일정 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "면접 일정 수정" : "새 면접 일정 등록"}</DialogTitle>
                <DialogDescription>
                  면접 일정을 등록하면 D-day 알림을 받을 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">회사명 *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="예: 삼성전자"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="positionName">지원 직무</Label>
                  <Input
                    id="positionName"
                    value={positionName}
                    onChange={(e) => setPositionName(e.target.value)}
                    placeholder="예: 프론트엔드 개발자"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="interviewDate">면접 날짜 *</Label>
                    <Input
                      id="interviewDate"
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="interviewTime">면접 시간 *</Label>
                    <Input
                      id="interviewTime"
                      type="time"
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="interviewType">면접 유형</Label>
                  <Select value={interviewType} onValueChange={(v: any) => setInterviewType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onsite">대면 면접</SelectItem>
                      <SelectItem value="video">화상 면접</SelectItem>
                      <SelectItem value="phone">전화 면접</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="location">면접 장소</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 서울시 강남구 테헤란로 123"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="면접 준비 사항, 주의점 등을 메모하세요"
                    rows={3}
                  />
                </div>
                
                {!editingSchedule && (
                  <div className="grid gap-2">
                    <Label htmlFor="reminderDays">알림 설정</Label>
                    <Select value={String(reminderDays)} onValueChange={(v) => setReminderDays(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1일 전 알림</SelectItem>
                        <SelectItem value="3">3일 전 알림</SelectItem>
                        <SelectItem value="7">7일 전 알림</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                  setEditingSchedule(null);
                }}>
                  취소
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createSchedule.isPending || updateSchedule.isPending}
                >
                  {createSchedule.isPending || updateSchedule.isPending ? "저장 중..." : editingSchedule ? "수정" : "등록"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        {/* 다가오는 면접 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6 text-yellow-400" />
            다가오는 면접
          </h2>
          
          {upcomingSchedules.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 mb-4">등록된 면접 일정이 없습니다.</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  첫 면접 일정 등록하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSchedules.map((schedule) => {
                const daysUntil = getDaysUntil(new Date(schedule.interviewDate));
                const isUrgent = daysUntil <= 3;
                
                return (
                  <Card key={schedule.id} className={`bg-white/5 border-white/10 ${isUrgent ? "ring-2 ring-red-500/50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-purple-400" />
                            {schedule.companyName}
                          </CardTitle>
                          {schedule.positionName && (
                            <CardDescription className="text-white/60 mt-1">
                              {schedule.positionName}
                            </CardDescription>
                          )}
                        </div>
                        <Badge className={isUrgent ? "bg-red-500" : "bg-purple-600"}>
                          D-{daysUntil}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-white/70">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(schedule.interviewDate).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {getInterviewTypeIcon(schedule.interviewType || "other")}
                          {getInterviewTypeLabel(schedule.interviewType || "other")}
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {schedule.location}
                          </div>
                        )}
                      </div>
                      
                      {schedule.notes && (
                        <p className="mt-3 text-sm text-white/50 border-t border-white/10 pt-3">
                          {schedule.notes}
                        </p>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          수정
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* 지난 면접 */}
        {pastSchedules.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white/70 mb-4">지난 면접</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastSchedules.map((schedule) => (
                <Card key={schedule.id} className="bg-white/5 border-white/10 opacity-60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white/70 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {schedule.companyName}
                      </CardTitle>
                      <Badge variant="outline" className="border-white/30 text-white/50">
                        {schedule.status === "completed" ? "완료" : schedule.status === "cancelled" ? "취소" : "종료"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-white/50">
                      {new Date(schedule.interviewDate).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-500/30 text-red-400/70 hover:bg-red-500/10"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
