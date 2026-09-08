import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Loader2, 
  Plus,
  Target,
  TrendingUp,
  Users,
  Calendar,
  Briefcase,
  Save,
  Share2,
  Trash2,
  Search,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { ShareModal } from "@/components/ShareModal";

type CompanyStage = "introduction" | "growth" | "maturity" | "decline";

export default function CompanyAnalysis() {
  const { data: analyses, isLoading } = trpc.companyAnalysis.list.useQuery();
  const utils = trpc.useUtils();
  
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    companyStage: "" as CompanyStage | "",
    positionType: "",
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // 기업 검색 및 AI 분석
  const searchMutation = trpc.companySearch.analyze.useMutation({
    onSuccess: (data) => {
      if (data.stage) {
        setFormData(prev => ({
          ...prev,
          companyStage: data.stage as CompanyStage,
        }));
        const stageNames: Record<string, string> = {
          introduction: '도입기',
          growth: '성장기',
          maturity: '성숙기',
          decline: '쇠퇴기'
        };
        toast.success(`기업 분석 완료: ${stageNames[data.stage] || data.stage} 기업`);
      }
    },
    onError: (error) => {
      toast.error("기업 검색 실패: " + error.message);
    },
  });

  const generateMutation = trpc.companyAnalysis.generate.useMutation({
    onSuccess: (data) => {
      toast.success("기업 분석이 완료되었습니다");
      utils.companyAnalysis.list.invalidate();
      setShowForm(false);
      setSelectedAnalysis(data.id);
      setFormData({ companyName: "", companyStage: "", positionType: "" });
    },
    onError: (error) => {
      toast.error("분석 실패: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.companyStage || !formData.positionType) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }
    generateMutation.mutate({
      companyName: formData.companyName,
      companyStage: formData.companyStage as CompanyStage,
      positionType: formData.positionType,
    });
  };

  // 기업 성장 단계 정의 (도입기/성장기/성숙기/쇠퇴기)
  const stageLabels: Record<CompanyStage, string> = {
    introduction: "도입기",
    growth: "성장기",
    maturity: "성숙기",
    decline: "쇠퇴기",
  };

  // 각 단계별 설명
  const stageDescriptions: Record<CompanyStage, { subtitle: string; description: string; crisis: string; characteristics: string[] }> = {
    introduction: {
      subtitle: "시장 진입 단계",
      description: "신제품/서비스를 시장에 출시하는 초기 단계로, 인지도 확보와 시장 개척에 집중합니다.",
      crisis: "자금 및 인지도 부족",
      characteristics: ["비용 지출 많음", "낮은 매출", "시장 테스트 중", "초기 고객 확보"]
    },
    growth: {
      subtitle: "급성장 단계",
      description: "매출과 시장 점유율이 빠르게 성장하는 단계로, 조직 확장과 투자가 활발합니다.",
      crisis: "성장통 및 조직 관리 이슈",
      characteristics: ["매출 급성장", "인력 채용 활발", "시장 확대", "경쟁 심화"]
    },
    maturity: {
      subtitle: "안정화 단계",
      description: "시장 점유율과 수익이 안정적인 단계로, 효율성과 비용 절감에 집중합니다.",
      crisis: "성장 정체 및 혁신 필요",
      characteristics: ["안정적 수익", "효율성 추구", "시장 포화", "비용 절감"]
    },
    decline: {
      subtitle: "재정비 단계",
      description: "매출과 수익이 감소하는 단계로, 사업 재편 또는 신사업 발굴이 필요합니다.",
      crisis: "생존 위기 및 구조조정",
      characteristics: ["매출 감소", "구조조정", "사업 재편", "신사업 모색"]
    },
  };

  const selectedData = analyses?.find(a => a.id === selectedAnalysis);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">기업 분석</h1>
            <p className="text-muted-foreground">
              지원 기업의 상황과 직무를 분석하여 면접을 준비하세요
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            새 분석
          </Button>
        </div>

        {/* 새 분석 폼 */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>새 기업 분석</CardTitle>
              <CardDescription>
                분석할 기업 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">기업명</Label>
                    <div className="flex gap-2">
                      <Input
                        id="companyName"
                        placeholder="예: 삼성전자"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!formData.companyName || searchMutation.isPending}
                        onClick={() => searchMutation.mutate({ 
                          companyName: formData.companyName,
                          positionType: formData.positionType 
                        })}
                        title="AI로 기업 분석"
                      >
                        {searchMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      기업명 입력 후 검색 버튼을 누르면 AI가 기업 단계를 자동 분석합니다
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyStage">기업 단계</Label>
                    <Select
                      value={formData.companyStage}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, companyStage: value as CompanyStage }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="introduction">도입기 - 시장 진입 단계</SelectItem>
                        <SelectItem value="growth">성장기 - 급성장 단계</SelectItem>
                        <SelectItem value="maturity">성숙기 - 안정화 단계</SelectItem>
                        <SelectItem value="decline">쇠퇴기 - 재정비 단계</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="positionType">지원 직무</Label>
                    <Input
                      id="positionType"
                      placeholder="예: 마케팅"
                      value={formData.positionType}
                      onChange={(e) => setFormData(prev => ({ ...prev, positionType: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    취소
                  </Button>
                  <Button type="submit" disabled={generateMutation.isPending}>
                    {generateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    분석 시작
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 분석 목록 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold">분석 목록</h2>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : analyses && analyses.length > 0 ? (
              <div className="space-y-2">
                {analyses.map((analysis) => (
                  <Card 
                    key={analysis.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${
                      selectedAnalysis === analysis.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedAnalysis(analysis.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{analysis.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {stageLabels[analysis.companyStage as CompanyStage]} · {analysis.positionType}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>아직 분석 내역이 없습니다</p>
                  <Button variant="link" onClick={() => setShowForm(true)}>
                    첫 분석 시작하기
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 분석 상세 */}
          <div className="lg:col-span-2">
            {selectedData ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{selectedData.companyName}</CardTitle>
                        <CardDescription>
                          {stageLabels[selectedData.companyStage as CompanyStage]} · {selectedData.positionType}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {selectedData.situationAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        기업 상황 분석
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Streamdown>{selectedData.situationAnalysis}</Streamdown>
                    </CardContent>
                  </Card>
                )}

                {selectedData.practicalTasks && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        실무자로서 해야할 일
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Streamdown>{selectedData.practicalTasks}</Streamdown>
                    </CardContent>
                  </Card>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {selectedData.relatedDepartments && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          유관부서
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Streamdown>{selectedData.relatedDepartments}</Streamdown>
                      </CardContent>
                    </Card>
                  )}

                  {selectedData.partners && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          협력사
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Streamdown>{selectedData.partners}</Streamdown>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 업무 주기별 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      주기별 업무 아이템
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedData.weeklyTasks && (
                      <div>
                        <p className="font-medium text-sm mb-2">주간 업무</p>
                        <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                          <Streamdown>{selectedData.weeklyTasks}</Streamdown>
                        </div>
                      </div>
                    )}
                    {selectedData.monthlyTasks && (
                      <div>
                        <p className="font-medium text-sm mb-2">월간 업무</p>
                        <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                          <Streamdown>{selectedData.monthlyTasks}</Streamdown>
                        </div>
                      </div>
                    )}
                    {selectedData.quarterlyTasks && (
                      <div>
                        <p className="font-medium text-sm mb-2">분기 업무</p>
                        <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                          <Streamdown>{selectedData.quarterlyTasks}</Streamdown>
                        </div>
                      </div>
                    )}
                    {selectedData.annualTasks && (
                      <div>
                        <p className="font-medium text-sm mb-2">연간 업무</p>
                        <div className="bg-secondary/30 p-3 rounded-lg text-sm">
                          <Streamdown>{selectedData.annualTasks}</Streamdown>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 직무 적합성 */}
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedData.jobFitness && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          직무적합성
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Streamdown>{selectedData.jobFitness}</Streamdown>
                      </CardContent>
                    </Card>
                  )}

                  {selectedData.jobExpertise && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          직무전문성
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Streamdown>{selectedData.jobExpertise}</Streamdown>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 저장 및 공유 버튼 */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">이 분석 결과가 도움이 되셨나요?</p>
                        <p className="text-sm text-muted-foreground">분석 결과를 저장하거나 공유해보세요</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowShareModal(true)}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          공유하기
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            toast.success("분석 결과가 저장되었습니다");
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          저장하기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>분석 결과를 선택하거나 새 분석을 시작하세요</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 공유 모달 */}
      {selectedData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={`${selectedData.companyName} 기업 분석`}
          content={`기업 단계: ${stageLabels[selectedData.companyStage as CompanyStage]}\n지원 직무: ${selectedData.positionType}\n\n기업 상황 분석:\n${selectedData.situationAnalysis || ''}\n\n실무자로서 해야할 일:\n${selectedData.practicalTasks || ''}`}
          type="company_analysis"
        />
      )}
    </DashboardLayout>
  );
}
