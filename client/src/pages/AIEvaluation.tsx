import DashboardLayout from "@/components/DashboardLayout";
import InterviewMediaCheck from "@/components/InterviewMediaCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle2, Info, Mic, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function AIEvaluation() {
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
        <header>
          <p className="text-sm font-semibold text-primary">Interview setup lab</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">촬영 환경 점검</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">실전 면접 전에 카메라 프레이밍과 마이크 입력을 직접 확인하세요.</p>
        </header>

        <InterviewMediaCheck />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> 분석 범위</CardTitle>
            <CardDescription>카메라와 음성으로 무엇을 판단하는지 명확히 안내합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"><Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p><strong>카메라:</strong> 셀프뷰로 얼굴 위치·밝기·배경을 사용자가 직접 확인합니다.</p></div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"><Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p><strong>마이크:</strong> 입력이 들어오는지만 기기 안에서 막대로 표시합니다.</p></div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>표정으로 감정·성격을 추론하거나, 음량으로 자신감을 채점하거나, 실제 합격 가능성을 예측하지 않습니다.</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>시작 전 체크리스트</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {["눈높이에 가까운 카메라 위치", "얼굴 앞쪽의 안정적인 조명", "알림을 끈 조용한 공간", "주민번호·계좌번호 등 민감정보 제외"].map(item => <li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}</li>)}
            </ul>
            <Link href="/interview"><Button className="mt-5 min-h-11 w-full">모의면접 설정으로 이동</Button></Link>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
