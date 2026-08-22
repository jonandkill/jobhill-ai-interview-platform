import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Settings, MessageSquare, Star, Gift, Bell } from "lucide-react";

// 후기 요청 설정 타입
interface ReviewRequestSettings {
  enabled: boolean;
  triggerType: "after_interview" | "after_count" | "after_days" | "manual";
  triggerCount: number; // 면접 횟수 후 요청
  triggerDays: number; // 가입 후 일수
  bonusMinutes: number; // 후기 작성 시 보너스 시간 (분)
  requestMessage: string; // 요청 메시지
  requestTitle: string; // 요청 제목
  showOnComplete: boolean; // 면접 완료 시 표시
  showOnDashboard: boolean; // 대시보드에 표시
  minRating: number; // 최소 별점 (이 이상일 때만 요청)
}

const defaultReviewSettings: ReviewRequestSettings = {
  enabled: true,
  triggerType: "after_interview",
  triggerCount: 3,
  triggerDays: 7,
  bonusMinutes: 30,
  requestMessage: "AI 면접 코치를 사용해보신 소감을 남겨주세요! 후기를 남겨주시면 30분 무료 사용 시간을 드립니다.",
  requestTitle: "서비스가 도움이 되셨나요?",
  showOnComplete: true,
  showOnDashboard: true,
  minRating: 4,
};

export default function AdminSettings() {
  const [reviewSettings, setReviewSettings] = useState<ReviewRequestSettings>(defaultReviewSettings);
  const [isSaving, setIsSaving] = useState(false);

  const settingsQuery = trpc.admin.settings.list.useQuery();
  const upsertMutation = trpc.admin.settings.upsert.useMutation();

  // 설정 로드
  useEffect(() => {
    if (settingsQuery.data) {
      const reviewSetting = settingsQuery.data.find(s => s.key === "review_request_settings");
      if (reviewSetting?.value) {
        try {
          const parsed = JSON.parse(reviewSetting.value);
          setReviewSettings({ ...defaultReviewSettings, ...parsed });
        } catch (e) {
          console.error("Failed to parse review settings:", e);
        }
      }
    }
  }, [settingsQuery.data]);

  const handleSaveReviewSettings = async () => {
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        key: "review_request_settings",
        value: JSON.stringify(reviewSettings),
        description: "무료 사용자 후기 요청 설정",
      });
      toast.success("후기 요청 설정이 저장되었습니다.");
      settingsQuery.refetch();
    } catch (error) {
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">시스템 설정</h1>
            <p className="text-muted-foreground">서비스 운영에 필요한 설정을 관리합니다.</p>
          </div>
        </div>

        {/* 후기 요청 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              무료 사용자 후기 요청 설정
            </CardTitle>
            <CardDescription>
              무료 사용자에게 후기를 요청하는 시점과 방식을 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 활성화 스위치 */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">후기 요청 활성화</Label>
                <p className="text-sm text-muted-foreground">무료 사용자에게 후기를 요청합니다.</p>
              </div>
              <Switch
                checked={reviewSettings.enabled}
                onCheckedChange={(checked) => setReviewSettings({ ...reviewSettings, enabled: checked })}
              />
            </div>

            {reviewSettings.enabled && (
              <>
                {/* 요청 트리거 타입 */}
                <div className="space-y-2">
                  <Label>후기 요청 시점</Label>
                  <Select
                    value={reviewSettings.triggerType}
                    onValueChange={(value: ReviewRequestSettings["triggerType"]) => 
                      setReviewSettings({ ...reviewSettings, triggerType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after_interview">면접 완료 후</SelectItem>
                      <SelectItem value="after_count">특정 면접 횟수 후</SelectItem>
                      <SelectItem value="after_days">가입 후 특정 일수</SelectItem>
                      <SelectItem value="manual">수동 (대시보드에만 표시)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 조건별 설정 */}
                {reviewSettings.triggerType === "after_count" && (
                  <div className="space-y-2">
                    <Label>면접 횟수 (회)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[reviewSettings.triggerCount]}
                        onValueChange={([value]) => setReviewSettings({ ...reviewSettings, triggerCount: value })}
                        min={1}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium">{reviewSettings.triggerCount}회</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reviewSettings.triggerCount}번째 면접 완료 후 후기를 요청합니다.
                    </p>
                  </div>
                )}

                {reviewSettings.triggerType === "after_days" && (
                  <div className="space-y-2">
                    <Label>가입 후 일수</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[reviewSettings.triggerDays]}
                        onValueChange={([value]) => setReviewSettings({ ...reviewSettings, triggerDays: value })}
                        min={1}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium">{reviewSettings.triggerDays}일</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      가입 후 {reviewSettings.triggerDays}일이 지나면 후기를 요청합니다.
                    </p>
                  </div>
                )}

                {/* 표시 위치 */}
                <div className="space-y-4">
                  <Label className="text-base">표시 위치</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">면접 완료 화면</p>
                        <p className="text-sm text-muted-foreground">면접 완료 후 결과 화면에 표시</p>
                      </div>
                      <Switch
                        checked={reviewSettings.showOnComplete}
                        onCheckedChange={(checked) => setReviewSettings({ ...reviewSettings, showOnComplete: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">대시보드</p>
                        <p className="text-sm text-muted-foreground">메인 대시보드에 카드로 표시</p>
                      </div>
                      <Switch
                        checked={reviewSettings.showOnDashboard}
                        onCheckedChange={(checked) => setReviewSettings({ ...reviewSettings, showOnDashboard: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* 보너스 시간 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-500" />
                    후기 작성 보너스 시간 (분)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[reviewSettings.bonusMinutes]}
                      onValueChange={([value]) => setReviewSettings({ ...reviewSettings, bonusMinutes: value })}
                      min={0}
                      max={120}
                      step={10}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-medium">{reviewSettings.bonusMinutes}분</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    후기 작성 시 {reviewSettings.bonusMinutes}분의 무료 사용 시간을 제공합니다.
                  </p>
                </div>

                {/* 최소 별점 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    최소 별점 (이 이상일 때만 요청)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[reviewSettings.minRating]}
                      onValueChange={([value]) => setReviewSettings({ ...reviewSettings, minRating: value })}
                      min={1}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < reviewSettings.minRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    면접 만족도가 {reviewSettings.minRating}점 이상일 때만 후기를 요청합니다.
                  </p>
                </div>

                {/* 요청 제목 */}
                <div className="space-y-2">
                  <Label>요청 제목</Label>
                  <Input
                    value={reviewSettings.requestTitle}
                    onChange={(e) => setReviewSettings({ ...reviewSettings, requestTitle: e.target.value })}
                    placeholder="서비스가 도움이 되셨나요?"
                  />
                </div>

                {/* 요청 메시지 */}
                <div className="space-y-2">
                  <Label>요청 메시지</Label>
                  <Textarea
                    value={reviewSettings.requestMessage}
                    onChange={(e) => setReviewSettings({ ...reviewSettings, requestMessage: e.target.value })}
                    placeholder="후기를 남겨주시면 보너스 시간을 드립니다."
                    rows={3}
                  />
                </div>

                {/* 미리보기 */}
                <div className="border rounded-lg p-4 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800">{reviewSettings.requestTitle}</h4>
                      <p className="text-sm text-amber-700 mt-1">{reviewSettings.requestMessage}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          후기 작성하기
                        </Button>
                        <Button size="sm" variant="outline">
                          나중에
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 저장 버튼 */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveReviewSettings} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                설정 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
