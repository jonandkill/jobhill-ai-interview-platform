import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileText, Save, Loader2, Plus, X, Sparkles, ArrowRight, GraduationCap, Award, Languages, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface CoverLetterItem {
  id: string;
  title: string;
  content: string;
}

interface Certification {
  id: string;
  name: string;
  date: string;
}

interface LanguageScore {
  id: string;
  type: string;
  score: string;
}

interface Activity {
  id: string;
  name: string;
  period: string;
  description: string;
}

interface Education {
  id: string;
  schoolName: string;
  major: string;
  degree: string;
  status: string;
  graduationYear: string;
  gpa: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  
  const [formData, setFormData] = useState({
    targetCompany: "",
    targetPosition: "",
    experience: "",
    // 상세 인적사항
    university: "",
    major: "",
    gpa: "",
    degree: "",
    graduationYear: "",
    educationStatus: "",
  });

  // 학력 목록 (여러 학력 추가 가능)
  const [educationList, setEducationList] = useState<Education[]>([]);
  
  // 개별 저장 상태
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // 자격증 목록
  const [certifications, setCertifications] = useState<Certification[]>([]);
  // 어학점수 목록
  const [languageScores, setLanguageScores] = useState<LanguageScore[]>([]);
  // 대외활동 목록
  const [activities, setActivities] = useState<Activity[]>([]);
  // 자소서 항목 목록
  const [coverLetterItems, setCoverLetterItems] = useState<CoverLetterItem[]>([]);

  useEffect(() => {
    if (profile) {
      setFormData({
        targetCompany: profile.targetCompany || "",
        targetPosition: profile.targetPosition || "",
        experience: profile.experience || "",
        university: profile.university || "",
        major: profile.major || "",
        gpa: profile.gpa || "",
        degree: (profile as any).degree || "",
        graduationYear: (profile as any).graduationYear || "",
        educationStatus: (profile as any).educationStatus || "",
      });
      
      // JSON 파싱
      try {
        if (profile.certifications) {
          setCertifications(JSON.parse(profile.certifications));
        }
        if (profile.languageScores) {
          setLanguageScores(JSON.parse(profile.languageScores));
        }
        if (profile.activities) {
          setActivities(JSON.parse(profile.activities));
        }
        if (profile.coverLetterItems) {
          setCoverLetterItems(JSON.parse(profile.coverLetterItems));
        }
        if ((profile as any).educationList) {
          setEducationList(JSON.parse((profile as any).educationList));
        }
      } catch (e) {
        console.error("JSON 파싱 에러:", e);
      }
    }
  }, [profile]);

  const [, navigate] = useLocation();
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{question: string, type: string}>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInterviewPrompt, setShowInterviewPrompt] = useState(false);

  const generateQuestionsMutation = trpc.autoQuestion.generateFromProfile.useMutation({
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions || []);
      toast.success("맞춤형 면접 질문이 생성되었습니다!");
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error("질문 생성에 실패했습니다: " + error.message);
      setIsGenerating(false);
    },
  });

  const handleGenerateQuestions = () => {
    if (!formData.university && coverLetterItems.length === 0) {
      toast.error("학력 정보 또는 자기소개서를 먼저 입력해주세요.");
      return;
    }
    setIsGenerating(true);
    generateQuestionsMutation.mutate();
  };
  
  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("프로필이 저장되었습니다");
      utils.profile.get.invalidate();
      if (formData.university || coverLetterItems.length > 0) {
        setShowInterviewPrompt(true);
      }
    },
    onError: (error) => {
      toast.error("저장에 실패했습니다: " + error.message);
    },
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // 개별 섹션 저장 함수
  const handleSaveSection = async (section: string) => {
    setSavingSection(section);
    
    try {
      // 이력서 내용 조합
      const additionalEducations = educationList.length > 0 
        ? `추가 학력: ${educationList.map(e => `${e.schoolName} ${e.major} (${e.degree})`).filter(s => s.trim()).join(", ")}`
        : "";
      const resumeContent = [
        formData.university && `학교: ${formData.university}`,
        formData.major && `학과: ${formData.major}`,
        formData.degree && `학위: ${formData.degree}`,
        formData.gpa && `학점: ${formData.gpa}`,
        formData.graduationYear && `졸업년도: ${formData.graduationYear}`,
        formData.educationStatus && `상태: ${formData.educationStatus}`,
        additionalEducations,
        certifications.length > 0 && `자격증: ${certifications.map(c => c.name).join(", ")}`,
        languageScores.length > 0 && `어학점수: ${languageScores.map(l => `${l.type} ${l.score}`).join(", ")}`,
        activities.length > 0 && `대외활동: ${activities.map(a => a.name).join(", ")}`,
        formData.experience && `경력: ${formData.experience}`,
      ].filter(Boolean).join("\n");

      // 자소서 내용 조합
      const coverLetterContent = coverLetterItems.map(item => 
        `[${item.title}]\n${item.content}`
      ).join("\n\n");

      await upsertMutation.mutateAsync({
        targetCompany: formData.targetCompany,
        targetPosition: formData.targetPosition,
        experience: formData.experience,
        resume: resumeContent,
        coverLetter: coverLetterContent,
        education: `${formData.university} ${formData.major}`,
        skills: certifications.map(c => c.name).join(", "),
        // 추가 필드
        university: formData.university,
        major: formData.major,
        gpa: formData.gpa,
        degree: formData.degree,
        graduationYear: formData.graduationYear,
        educationStatus: formData.educationStatus,
        educationList: JSON.stringify(educationList),
        certifications: JSON.stringify(certifications),
        languageScores: JSON.stringify(languageScores),
        activities: JSON.stringify(activities),
        coverLetterItems: JSON.stringify(coverLetterItems),
      } as any);
      
      toast.success(`${section === 'education' ? '학력 정보' : section === 'certifications' ? '자격증' : section === 'languages' ? '어학점수' : section === 'activities' ? '대외활동' : section === 'coverLetter' ? '자기소개서' : '지원 정보'}가 저장되었습니다`);
    } catch (error) {
      toast.error("저장에 실패했습니다");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 이력서 내용 조합
    const additionalEducations = educationList.length > 0 
      ? `추가 학력: ${educationList.map(e => `${e.schoolName} ${e.major} (${e.degree})`).filter(s => s.trim()).join(", ")}`
      : "";
    const resumeContent = [
      formData.university && `학교: ${formData.university}`,
      formData.major && `학과: ${formData.major}`,
      formData.degree && `학위: ${formData.degree}`,
      formData.gpa && `학점: ${formData.gpa}`,
      formData.graduationYear && `졸업년도: ${formData.graduationYear}`,
      formData.educationStatus && `상태: ${formData.educationStatus}`,
      additionalEducations,
      certifications.length > 0 && `자격증: ${certifications.map(c => c.name).join(", ")}`,
      languageScores.length > 0 && `어학점수: ${languageScores.map(l => `${l.type} ${l.score}`).join(", ")}`,
      activities.length > 0 && `대외활동: ${activities.map(a => a.name).join(", ")}`,
      formData.experience && `경력: ${formData.experience}`,
    ].filter(Boolean).join("\n");

    // 자소서 내용 조합
    const coverLetterContent = coverLetterItems.map(item => 
      `[${item.title}]\n${item.content}`
    ).join("\n\n");

    upsertMutation.mutate({
      targetCompany: formData.targetCompany,
      targetPosition: formData.targetPosition,
      experience: formData.experience,
      resume: resumeContent,
      coverLetter: coverLetterContent,
      education: `${formData.university} ${formData.major}`,
      skills: certifications.map(c => c.name).join(", "),
      // 상세 인적사항 필드
      university: formData.university,
      major: formData.major,
      gpa: formData.gpa,
      degree: formData.degree,
      graduationYear: formData.graduationYear,
      educationStatus: formData.educationStatus,
      educationList: JSON.stringify(educationList),
      certifications: JSON.stringify(certifications),
      languageScores: JSON.stringify(languageScores),
      activities: JSON.stringify(activities),
      coverLetterItems: JSON.stringify(coverLetterItems),
    });
  };

  // 자격증 추가/삭제
  const addCertification = () => {
    setCertifications(prev => [...prev, { id: Date.now().toString(), name: "", date: "" }]);
  };
  const removeCertification = (id: string) => {
    setCertifications(prev => prev.filter(c => c.id !== id));
  };
  const updateCertification = (id: string, field: string, value: string) => {
    setCertifications(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // 어학점수 추가/삭제
  const addLanguageScore = () => {
    setLanguageScores(prev => [...prev, { id: Date.now().toString(), type: "", score: "" }]);
  };
  const removeLanguageScore = (id: string) => {
    setLanguageScores(prev => prev.filter(l => l.id !== id));
  };
  const updateLanguageScore = (id: string, field: string, value: string) => {
    setLanguageScores(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // 대외활동 추가/삭제
  const addActivity = () => {
    setActivities(prev => [...prev, { id: Date.now().toString(), name: "", period: "", description: "" }]);
  };
  const removeActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };
  const updateActivity = (id: string, field: string, value: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // 학력 추가/삭제/수정
  const addEducation = () => {
    setEducationList(prev => [...prev, {
      id: Date.now().toString(),
      schoolName: "",
      major: "",
      degree: "",
      status: "",
      graduationYear: "",
      gpa: ""
    }]);
  };
  const removeEducation = (id: string) => {
    setEducationList(prev => prev.filter(e => e.id !== id));
  };
  const updateEducation = (id: string, field: string, value: string) => {
    setEducationList(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // 자소서 항목 추가/삭제
  const addCoverLetterItem = () => {
    setCoverLetterItems(prev => [...prev, { id: Date.now().toString(), title: "", content: "" }]);
  };
  const removeCoverLetterItem = (id: string) => {
    setCoverLetterItems(prev => prev.filter(item => item.id !== id));
  };
  const updateCoverLetterItem = (id: string, field: string, value: string) => {
    setCoverLetterItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">📝 프로필(이력서/자소서) 관리</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            이력서와 자기소개서를 등록하면 맞춤형 면접 질문을 받을 수 있습니다
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 모든 정보는 입력 후 하단의 "전체 저장" 버튼을 눌러야 저장됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 지원 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                지원 정보
              </CardTitle>
              <CardDescription>
                지원하려는 회사와 직무 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetCompany">지원 회사</Label>
                  <Input
                    id="targetCompany"
                    placeholder="예: 삼성전자"
                    value={formData.targetCompany}
                    onChange={handleChange("targetCompany")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetPosition">지원 직무</Label>
                  <Input
                    id="targetPosition"
                    placeholder="예: 소프트웨어 개발"
                    value={formData.targetPosition}
                    onChange={handleChange("targetPosition")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 학력 정보 (다중 학력 지원) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="w-5 h-5" />
                  학력 정보
                </CardTitle>
                <CardDescription>
                  학교, 학과, 학위, 졸업년도 정보를 입력하세요 (여러 학력 추가 가능)
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveSection('education')}
                disabled={savingSection === 'education'}
              >
                {savingSection === 'education' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기존 단일 학력 입력 (기본 학력) */}
              <div className="p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                <div className="text-sm font-medium text-primary mb-3">대표 학력 (필수)</div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="university">학교</Label>
                    <Input
                      id="university"
                      placeholder="예: 서울대학교"
                      value={formData.university}
                      onChange={handleChange("university")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major">학과</Label>
                    <Input
                      id="major"
                      placeholder="예: 컴퓨터공학과"
                      value={formData.major}
                      onChange={handleChange("major")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="degree">학위</Label>
                    <select
                      id="degree"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.degree}
                      onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                    >
                      <option value="">선택</option>
                      <option value="고등학교">고등학교</option>
                      <option value="전문학사">전문학사</option>
                      <option value="학사">학사</option>
                      <option value="석사">석사</option>
                      <option value="박사">박사</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gpa">학점</Label>
                    <Input
                      id="gpa"
                      placeholder="예: 3.8/4.5"
                      value={formData.gpa}
                      onChange={handleChange("gpa")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear">졸업년도</Label>
                    <Input
                      id="graduationYear"
                      placeholder="예: 2024"
                      value={formData.graduationYear}
                      onChange={handleChange("graduationYear")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="educationStatus">상태</Label>
                    <select
                      id="educationStatus"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.educationStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, educationStatus: e.target.value }))}
                    >
                      <option value="">선택</option>
                      <option value="재학">재학</option>
                      <option value="휴학">휴학</option>
                      <option value="졸업예정">졸업예정</option>
                      <option value="졸업">졸업</option>
                      <option value="수료">수료</option>
                      <option value="수료예정">수료예정</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 추가 학력 목록 */}
              {educationList.length > 0 && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">추가 학력</div>
                  {educationList.map((edu, index) => (
                    <div key={edu.id} className="p-4 border rounded-lg bg-muted/30 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEducation(edu.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="text-xs text-muted-foreground mb-3">추가 학력 {index + 1}</div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>학교</Label>
                          <Input
                            placeholder="예: 서울대학교 대학원"
                            value={edu.schoolName}
                            onChange={(e) => updateEducation(edu.id, "schoolName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>학과</Label>
                          <Input
                            placeholder="예: 컴퓨터공학과"
                            value={edu.major}
                            onChange={(e) => updateEducation(edu.id, "major", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>학위</Label>
                          <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                          >
                            <option value="">선택</option>
                            <option value="고등학교">고등학교</option>
                            <option value="전문학사">전문학사</option>
                            <option value="학사">학사</option>
                            <option value="석사">석사</option>
                            <option value="박사">박사</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>학점</Label>
                          <Input
                            placeholder="예: 4.0/4.5"
                            value={edu.gpa}
                            onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>졸업년도</Label>
                          <Input
                            placeholder="예: 2026"
                            value={edu.graduationYear}
                            onChange={(e) => updateEducation(edu.id, "graduationYear", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>상태</Label>
                          <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={edu.status}
                            onChange={(e) => updateEducation(edu.id, "status", e.target.value)}
                          >
                            <option value="">선택</option>
                            <option value="재학">재학</option>
                            <option value="휴학">휴학</option>
                            <option value="졸업예정">졸업예정</option>
                            <option value="졸업">졸업</option>
                            <option value="수료">수료</option>
                            <option value="수료예정">수료예정</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 학력 추가 버튼 */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={addEducation}
              >
                <Plus className="w-4 h-4 mr-2" />
                학력 추가 (복수 학위, 편입, 대학원 등)
              </Button>
            </CardContent>
          </Card>

          {/* 자격증 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5" />
                  자격증
                </CardTitle>
                <CardDescription>
                  보유한 자격증을 추가하세요
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveSection('certifications')}
                disabled={savingSection === 'certifications'}
              >
                {savingSection === 'certifications' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="자격증명 (예: 정보처리기사)"
                      value={cert.name}
                      onChange={(e) => updateCertification(cert.id, "name", e.target.value)}
                    />
                    <Input
                      placeholder="취득일 (예: 2024.03)"
                      value={cert.date}
                      onChange={(e) => updateCertification(cert.id, "date", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCertification(cert.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCertification} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                자격증 추가
              </Button>
            </CardContent>
          </Card>

          {/* 어학점수 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Languages className="w-5 h-5" />
                  어학점수
                </CardTitle>
                <CardDescription>
                  보유한 어학점수를 추가하세요
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveSection('languages')}
                disabled={savingSection === 'languages'}
              >
                {savingSection === 'languages' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {languageScores.map((lang) => (
                <div key={lang.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="시험 종류 (예: TOEIC, OPIC)"
                      value={lang.type}
                      onChange={(e) => updateLanguageScore(lang.id, "type", e.target.value)}
                    />
                    <Input
                      placeholder="점수/등급 (예: 900점, IH)"
                      value={lang.score}
                      onChange={(e) => updateLanguageScore(lang.id, "score", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLanguageScore(lang.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addLanguageScore} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                어학점수 추가
              </Button>
            </CardContent>
          </Card>

          {/* 대외활동 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  대외활동
                </CardTitle>
                <CardDescription>
                  참여한 대외활동, 동아리, 봉사활동 등을 추가하세요
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveSection('activities')}
                disabled={savingSection === 'activities'}
              >
                {savingSection === 'activities' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="활동명 (예: 대학생 봉사단)"
                        value={activity.name}
                        onChange={(e) => updateActivity(activity.id, "name", e.target.value)}
                      />
                      <Input
                        placeholder="활동 기간 (예: 2023.03 ~ 2024.02)"
                        value={activity.period}
                        onChange={(e) => updateActivity(activity.id, "period", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActivity(activity.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="활동 내용 및 성과를 입력하세요"
                    value={activity.description}
                    onChange={(e) => updateActivity(activity.id, "description", e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addActivity} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                대외활동 추가
              </Button>
            </CardContent>
          </Card>

          {/* 경력 사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">경력 사항 (선택)</CardTitle>
              <CardDescription>
                인턴, 아르바이트, 정규직 경력이 있다면 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="experience"
                placeholder="회사명, 직책, 기간, 주요 업무 등을 입력하세요"
                rows={4}
                value={formData.experience}
                onChange={handleChange("experience")}
              />
            </CardContent>
          </Card>

          {/* 자기소개서 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  자기소개서
                </CardTitle>
                <CardDescription>
                  자기소개서 항목별로 내용을 추가하세요
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveSection('coverLetter')}
                disabled={savingSection === 'coverLetter'}
              >
                {savingSection === 'coverLetter' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverLetterItems.map((item, index) => (
                <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">항목 {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCoverLetterItem(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="항목 제목 (예: 지원동기, 성장과정, 입사 후 포부)"
                    value={item.title}
                    onChange={(e) => updateCoverLetterItem(item.id, "title", e.target.value)}
                  />
                  <Textarea
                    placeholder="항목 내용을 입력하세요"
                    value={item.content}
                    onChange={(e) => updateCoverLetterItem(item.id, "content", e.target.value)}
                    rows={6}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCoverLetterItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                자소서 항목 추가
              </Button>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-center text-muted-foreground mb-3">
              ❗ 모든 정보(지원정보, 학력, 자격증, 어학, 대외활동, 자소서)를 한 번에 저장합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={upsertMutation.isPending} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                {upsertMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                💾 전체 저장
              </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateQuestions}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI 맞춤 질문 생성
            </Button>
            </div>
          </div>

          {/* 면접 시작 안내 */}
          {showInterviewPrompt && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg">프로필이 저장되었습니다!</h3>
                    <p className="text-sm text-muted-foreground">
                      이제 맞춤형 면접 질문으로 연습을 시작해보세요
                    </p>
                  </div>
                  <Button onClick={() => navigate("/interview")} className="w-full sm:w-auto">
                    면접 시작하기
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 생성된 질문 목록 */}
          {generatedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI 생성 맞춤 질문</CardTitle>
                <CardDescription>
                  프로필 기반으로 생성된 예상 면접 질문입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {generatedQuestions.map((q, index) => (
                    <li key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-primary font-medium shrink-0">Q{index + 1}.</span>
                      <div>
                        <p>{q.question}</p>
                        <span className="text-xs text-muted-foreground">{q.type}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
