import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gift } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, Brain, FileText, History, Target, 
  User, HelpCircle, Bookmark, Database, Ticket, MessageSquare, BarChart3, 
  DollarSign, Building2, Settings, Users, Bell, Zap, Coins, ChevronDown,
  TrendingUp, Home, FolderOpen, Clock, UserCircle, Shield, ExternalLink, Sparkles, Gamepad2
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { CouponBalanceBadge } from "./CouponBalanceBadge";
import { EmailVerificationPrompt } from "./EmailVerificationPrompt";

// 메뉴 그룹 정의 - 고객 여정 기반 재설계
const menuGroups = [
  {
    id: "interview",
    label: "면접 연습",
    icon: Brain,
    items: [
      { icon: Brain, label: "모의 면접 시작", path: "/interview" },
      { icon: Zap, label: "화상 모의면접", path: "/interview" },
      { icon: Sparkles, label: "AI 실시간 평가", path: "/ai-evaluation" },
      { icon: Gamepad2, label: "게임형 평가", path: "/game-assessment" },
    ]
  },
  {
    id: "results",
    label: "평가 결과",
    icon: TrendingUp,
    items: [
      { icon: BarChart3, label: "종합 평가 결과", path: "/comprehensive-results" },
      { icon: History, label: "면접 이력", path: "/history" },
      { icon: TrendingUp, label: "연습 통계", path: "/statistics" },
      { icon: Zap, label: "꾸리 질문 이력", path: "/follow-up-history" },
    ]
  },
  {
    id: "prepare",
    label: "면접 준비",
    icon: FileText,
    items: [
      { icon: FileText, label: "프로필 관리", path: "/profile" },
      { icon: Target, label: "기업 분석", path: "/company-analysis" },
      { icon: HelpCircle, label: "어려운 질문", path: "/difficult-questions" },
      { icon: Bookmark, label: "저장된 연습", path: "/saved-practices" },
    ]
  },
  {
    id: "account",
    label: "내 계정",
    icon: UserCircle,
    items: [
      { icon: User, label: "마이페이지", path: "/mypage" },
      { icon: Coins, label: "크레딧 내역", path: "/credit-history" },
      { icon: Bell, label: "알림", path: "/notifications" },
      { icon: Building2, label: "단체 가입", path: "/organization/apply" },
      { icon: Gift, label: "쿠폰 획등 방법", path: "/how-to-earn-coupons" },
    ]
  },
];

const adminMenuGroup = {
  id: "admin",
  label: "관리자",
  icon: Shield,
  items: [
    { icon: Database, label: "학습 자료 관리", path: "/admin/learning" },
    { icon: Ticket, label: "쿠폰 관리", path: "/admin/coupons" },
    { icon: BarChart3, label: "쿠폰 통계", path: "/admin/coupon-stats" },
    { icon: MessageSquare, label: "후기 관리", path: "/admin/reviews" },
    { icon: DollarSign, label: "결제 대시보드", path: "/admin/payments" },
    { icon: ExternalLink, label: "결제 링크 관리", path: "/admin/payment-links" },
    { icon: Building2, label: "단체 관리", path: "/admin/organizations" },
    { icon: Settings, label: "시스템 설정", path: "/admin/settings" },
    { icon: Users, label: "회원 관리", path: "/admin/users" },
  ]
};

// 모바일 하단 네비게이션 메뉴
const mobileBottomNavItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/dashboard" },
  { icon: Brain, label: "면접", path: "/interview" },
  { icon: History, label: "이력", path: "/history" },
  { icon: TrendingUp, label: "통계", path: "/statistics" },
  { icon: User, label: "마이", path: "/mypage" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const COLLAPSED_GROUPS_KEY = "collapsed-groups";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              로그인이 필요합니다
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              이 페이지를 이용하려면 로그인이 필요합니다.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            로그인
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </TooltipProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // 이메일 인증 팝업 상태
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  
  // 로그인 후 이메일 미인증 사용자에게 팝업 표시
  useEffect(() => {
    if (user && !user.emailVerified && user.email) {
      // localStorage로 팝업 표시 여부 관리 (하루에 한 번만)
      const lastShown = localStorage.getItem('emailVerificationPromptShown');
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        setTimeout(() => {
          setShowEmailVerification(true);
          localStorage.setItem('emailVerificationPromptShown', today);
        }, 2000); // 2초 후 표시
      }
    }
  }, [user]);
  
  // 그룹 접힘 상태 관리
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // 현재 활성 메뉴 찾기
  const findActiveMenuItem = () => {
    for (const group of menuGroups) {
      const item = group.items.find(item => item.path === location);
      if (item) return item;
    }
    const adminItem = adminMenuGroup.items.find(item => item.path === location);
    if (adminItem) return adminItem;
    return null;
  };
  
  const activeMenuItem = findActiveMenuItem();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // 메뉴 그룹 렌더링
  const renderMenuGroup = (group: typeof menuGroups[0], isAdmin = false) => {
    const isGroupCollapsed = collapsedGroups.has(group.id);
    const GroupIcon = group.icon;
    
    return (
      <li key={group.id} className={isAdmin ? "border-t border-border pt-2 mt-2" : ""}>
        {/* 그룹 헤더 */}
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${isCollapsed ? "justify-center" : ""}`}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <GroupIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {group.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <GroupIcon className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isGroupCollapsed ? "-rotate-90" : ""}`} />
            </>
          )}
        </button>
        
        {/* 그룹 아이템 */}
        {(!isGroupCollapsed || isCollapsed) && (
          <SidebarMenu className="space-y-0.5">
            {group.items.map(item => {
              const isActive = location === item.path;
              const ItemIcon = item.icon;
              
              return (
                <SidebarMenuItem key={item.path}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          className="h-10 justify-center"
                        >
                          <ItemIcon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 pl-6"
                    >
                      <ItemIcon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </li>
    );
  };

  return (
    <>
      {/* 이메일 인증 팝업 */}
      {user && !user.emailVerified && user.email && (
        <EmailVerificationPrompt
          open={showEmailVerification}
          onClose={() => setShowEmailVerification(false)}
          userEmail={user.email}
          userName={user.name || '사용자'}
        />
      )}
      
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                  aria-label="홈으로 이동"
                >
                  <span className="font-semibold tracking-tight truncate">
                    다음 면접 코치
                  </span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setLocation("/")}
                      className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                      aria-label="홈으로 이동"
                    >
                      <Home className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    홈으로 이동
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <ul className="px-2 py-2 space-y-1">
              {menuGroups.map(group => renderMenuGroup(group))}
              {user?.role === "admin" && renderMenuGroup(adminMenuGroup, true)}
            </ul>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className={isMobile ? "pb-16" : ""}>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <CouponBalanceBadge />
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
        
        {/* 모바일 하단 네비게이션 */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-50 flex items-center justify-around px-2 safe-area-inset-bottom">
            {mobileBottomNavItems.map(item => {
              const isActive = location === item.path;
              const ItemIcon = item.icon;
              
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ItemIcon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </SidebarInset>
    </>
  );
}
