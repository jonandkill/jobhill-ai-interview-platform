import { AlertTriangle, CheckCircle2, Gauge, Lightbulb } from "lucide-react";
import { analyzeAnswerEmphasis } from "../../../shared/interviewFramework";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckpointAnswer {
  question: string;
  questionType: string;
  userAnswer?: string | null;
  score?: number | null;
}

export default function InterviewCheckpoint({ answers }: { answers: CheckpointAnswer[] }) {
  if (answers.length === 0 || answers.length % 3 !== 0) return null;
  const latest = answers.slice(-3);
  const scored = latest.filter((answer) => typeof answer.score === "number");
  const average = scored.length
    ? Math.round(scored.reduce((sum, answer) => sum + (answer.score ?? 0), 0) / scored.length)
    : null;
  const emphasis = analyzeAnswerEmphasis(latest.map((answer) => answer.userAnswer ?? ""));
  const strongest = emphasis.strongest?.count ? emphasis.strongest : null;
  const nextFocus = emphasis.missing.slice(0, 3);

  return (
    <Card className="border-blue-300/40 bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-5 w-5 text-blue-400" />
          3문항 중간 점검
          {average !== null && <Badge variant="secondary">평균 {average}점</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          {latest.map((answer, index) => (
            <div key={`${answer.question}-${index}`} className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">문항 {answers.length - 2 + index}</p>
              <p className="mt-1 line-clamp-2 font-medium">{answer.question}</p>
              <p className="mt-2 text-lg font-bold text-primary">{answer.score ?? "–"}점</p>
            </div>
          ))}
        </div>
        {strongest ? (
          <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>
              최근 답변은 <strong>{strongest.label}</strong> 표현이 {strongest.share}%로 가장 많이 나타났습니다.
              역량의 우열이 아니라 답변 내용의 강조 비중이며, 다음 답변에서는 다른 근거도 함께 제시해 균형을 맞추세요.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 rounded-lg border p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <p>강조 축을 판단할 표현이 아직 충분하지 않습니다. 역할·행동·결과와 확인 기준을 구체적으로 말해보세요.</p>
          </div>
        )}
        <div className="flex gap-2 rounded-lg bg-primary/5 p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            다음 답변 보완 순서: 결론 한 문장 → 본인 역할 → 실제 행동 → 확인 가능한 결과
            {nextFocus.length ? ` → 아직 적게 다룬 축(${nextFocus.join(", ")}) 연결` : ""}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          이 점검은 답변 텍스트만 분석합니다. 표정·시선·감정·성격이나 실제 합격 가능성을 추론하지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}

