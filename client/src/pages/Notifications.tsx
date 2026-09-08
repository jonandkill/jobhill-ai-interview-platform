import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, BellOff, Check, CheckCheck, ChevronLeft, ChevronRight, Clock, MessageSquare, CreditCard, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function Notifications() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const limit = 20;
  
  // 알림 목록 조회
  const { data, isLoading, refetch } = trpc.notifications.list.useQuery({
    limit,
    offset: page * limit,
  });
  
  // 읽지 않은 알림 개수
  const { data: unreadData, refetch: refetchUnread } = trpc.notifications.unreadCount.useQuery();
  
  // 알림 읽음 처리
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnread();
    },
  });
  
  // 모든 알림 읽음 처리
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("모든 알림을 읽음 처리했습니다.");
      refetch();
      refetchUnread();
    },
    onError: (error) => {
      toast.error("읽음 처리 실패: " + error.message);
    },
  });
  
  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_success":
      case "payment_failed":
        return <CreditCard className="w-5 h-5" />;
      case "subscription_expiring":
        return <AlertCircle className="w-5 h-5" />;
      case "admin_message":
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };
  
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "payment_success":
        return "결제 완료";
      case "payment_failed":
        return "결제 실패";
      case "subscription_expiring":
        return "구독 만료 예정";
      case "admin_message":
        return "관리자 메시지";
      default:
        return "알림";
    }
  };
  
  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "payment_success":
        return "bg-green-500/10 text-green-600";
      case "payment_failed":
        return "bg-red-500/10 text-red-600";
      case "subscription_expiring":
        return "bg-yellow-500/10 text-yellow-600";
      case "admin_message":
        return "bg-blue-500/10 text-blue-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };
  
  if (!user) {
    return (
      <div className="container py-12 text-center">
        <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">로그인이 필요합니다</h1>
        <p className="text-muted-foreground mb-4">알림을 확인하려면 로그인해주세요.</p>
        <Link href="/">
          <Button>홈으로 이동</Button>
        </Link>
      </div>
    );
  }
  
  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  
  return (
    <div className="container py-8 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              알림 센터
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadData?.count ? `읽지 않은 알림 ${unreadData.count}개` : "모든 알림을 확인했습니다"}
            </p>
          </div>
        </div>
        
        {unreadData && unreadData.count > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            모두 읽음
          </Button>
        )}
      </div>
      
      {/* 알림 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">알림이 없습니다</h3>
            <p className="text-muted-foreground">
              새로운 알림이 도착하면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.notifications.map((notification: any) => (
            <Card 
              key={notification.id} 
              className={`transition-all ${
                !notification.isRead 
                  ? "border-primary/30 bg-primary/5" 
                  : "opacity-80"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className={`p-2 rounded-full ${getNotificationTypeColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      {!notification.isRead && (
                        <Badge className="text-xs bg-primary">새 알림</Badge>
                      )}
                    </div>
                    
                    <h4 className="font-medium mb-1">{notification.title}</h4>
                    
                    {notification.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.content}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true, 
                          locale: ko 
                        })}
                      </span>
                      
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          읽음 처리
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-4">
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
    </div>
  );
}
