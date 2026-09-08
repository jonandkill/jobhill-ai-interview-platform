import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Check, Gift, Ticket, GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";

export default function OrganizationApply() {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [activeTab, setActiveTab] = useState("coupon");
  const contactEmail = PUBLIC_BUSINESS_INFO.supportEmail || PUBLIC_BUSINESS_INFO.email;
  
  // 내 단체 정보 조회
  const { data: myOrganization, refetch: refetchOrg } = trpc.organization.getMyOrganization.useQuery();
  
  // 쿠폰 코드로 단체 가입 mutation
  const joinByCodeMutation = trpc.organization.joinByCode.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.organizationName}에 가입되었습니다!`);
      setCouponCode("");
      refetchOrg();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });
  
  const handleJoinByCode = () => {
    if (!couponCode.trim()) {
      toast.error("인증 코드를 입력해주세요.");
      return;
    }
    
    joinByCodeMutation.mutate({ code: couponCode.trim() });
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
  
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      university: "대학교",
      company: "기업",
      academy: "학원",
      other: "기타",
    };
    return labels[type] || type;
  };
  
  // 이미 단체에 가입되어 있는 경우
  if (myOrganization) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">단체 인증</h1>
            <p className="text-muted-foreground">학교, 기업 등 단체 인증을 통해 특별 혜택을 받으세요.</p>
          </div>
          
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <CardTitle className="text-green-800">단체 인증 완료</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">단체명</Label>
                  <p className="font-medium">{myOrganization.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">유형</Label>
                  <p className="font-medium">{getTypeLabel(myOrganization.type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">플랜</Label>
                  <Badge variant="secondary">{getPlanLabel(myOrganization.planType)}</Badge>
                </div>
                {myOrganization.freeInterviewsPerMember && (
                  <div>
                    <Label className="text-muted-foreground">무료 면접 횟수</Label>
                    <p className="font-medium">{myOrganization.freeInterviewsPerMember}회/월</p>
                  </div>
                )}
                {myOrganization.discountPercent && myOrganization.discountPercent > 0 && (
                  <div>
                    <Label className="text-muted-foreground">할인율</Label>
                    <p className="font-medium text-green-600">{myOrganization.discountPercent}% 할인</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">단체 인증</h1>
          <p className="text-muted-foreground">학교, 기업 등 단체 인증을 통해 특별 혜택을 받으세요.</p>
        </div>
        
        {/* 혜택 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">무료 면접 제공</CardTitle>
              <Gift className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                단체 인증 시 매월 무료 면접 횟수가 제공됩니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">할인 혜택</CardTitle>
              <Badge variant="secondary">최대 50%</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                단체별 할인율이 적용되어 더 저렴하게 이용 가능합니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">즉시 인증</CardTitle>
              <Ticket className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                인증 코드 입력 시 즉시 혜택이 적용됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* 인증 방식 선택 */}
        <Card>
          <CardHeader>
            <CardTitle>단체 인증 방법</CardTitle>
            <CardDescription>아래 방법 중 하나를 선택하여 단체 인증을 진행하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="coupon" className="gap-2">
                  <Ticket className="w-4 h-4" />
                  인증 코드 입력
                </TabsTrigger>
                <TabsTrigger value="school" className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  학교 인증
                </TabsTrigger>
              </TabsList>
              
              {/* 쿠폰 코드 입력 */}
              <TabsContent value="coupon" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="couponCode">인증 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="couponCode"
                      placeholder="단체에서 제공받은 인증 코드를 입력하세요"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleJoinByCode}
                      disabled={joinByCodeMutation.isPending || !couponCode.trim()}
                    >
                      {joinByCodeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "인증하기"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    학교, 기업, 학원 등에서 제공받은 단체 인증 코드를 입력하세요.
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">인증 코드는 어디서 받나요?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 학교: 취업지원센터, 진로상담실에서 제공</li>
                    <li>• 기업: 인사팀, HR 담당자에게 문의</li>
                    <li>• 학원: 담당 강사 또는 운영팀에서 제공</li>
                  </ul>
                </div>
              </TabsContent>
              
              {/* 학교 인증 */}
              <TabsContent value="school" className="space-y-4 mt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">학교 인증 안내</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        학교 인증은 학교에서 제공하는 인증 코드를 통해 진행됩니다.
                        학교 취업지원센터나 진로상담실에 문의하여 AI 면접 코치 서비스 인증 코드를 요청하세요.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolCode">학교 인증 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="schoolCode"
                      placeholder="학교에서 제공받은 인증 코드를 입력하세요"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleJoinByCode}
                      disabled={joinByCodeMutation.isPending || !couponCode.trim()}
                    >
                      {joinByCodeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "인증하기"
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">학교 인증 혜택</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 재학생/졸업생 전용 무료 면접 횟수 제공</li>
                    <li>• 학교별 맞춤 할인율 적용</li>
                    <li>• 취업지원센터 연계 서비스 이용 가능</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* 단체가 없는 경우 안내 */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="font-medium">인증 코드가 없으신가요?</h3>
              <p className="text-sm text-muted-foreground">
                소속 단체에 AI 면접 코치 서비스 도입을 요청해주세요.
              </p>
              <p className="text-sm text-muted-foreground">
                문의: <a href={contactEmail ? `mailto:${contactEmail}` : "/privacy"} className="text-primary hover:underline">{displayBusinessValue(contactEmail)}</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
