import { CheckCircle2, Gauge, Lightbulb } from "lucide-react";
import {
  INTERVIEW_RUBRIC_GUIDE,
  INTERVIEW_RUBRIC_KEYS,
  summarizeRubricCheckpoint,
  type InterviewRubricScores,
} from "@shared/interviewFramework";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckpointAnswer {
  question: string;
  questionType: string;
  score?: number | null;
  rubricScores?: InterviewRubricScores | null;
}

export default function InterviewCheckpoint({ answers }: { answers: CheckpointAnswer[] }) {
  if (answers.length === 0 || answers.length % 3 !== 0) return null;
  const latest = answers.slice(-3);
  const scored = latest.filter((answer) => typeof answer.score === "number");
  const average = scored.length
    ? Math.round(scored.reduce((sum, answer) => sum + (answer.score ?? 0), 0) / scored.length)
    : null;
  const summary = summarizeRubricCheckpoint(latest);

  return (
    <Card className="border-blue-300/40 bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Gauge className="h-5 w-5 text-blue-400" />
          3문항 중간 점검
          {average !== null && <Badge variant="secondary">최근 3문항 평균 {average}점</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          {latest.map((answer, index) => (
            <div key={answer.question + "-" + index} className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">문항 {answers.length - 2 + index}</p>
              <p className="mt-1 line-clamp-2 font-medium">{answer.question}</p>
              <p className="mt-2 text-lg font-bold text-primary">{answer.score ?? "–"}점</p>
            </div>
          ))}
        </div>

        {summary.insufficientData || !summary.averages || !summary.weakest ? (
          <div className="flex gap-2 rounded-lg border p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <p>새 5축 루브릭 평가가 3건 쌓이면 가장 먼저 보완할 답변 기준을 보여드립니다. 키워드 빈도로 능력을 추정하지 않습니다.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-5">
              {INTERVIEW_RUBRIC_KEYS.map((key) => (
                <div
                  key={key}
                  className={
                    "rounded-lg border p-3 " +
                    (key === summary.weakest?.key ? "border-amber-400/50 bg-amber-500/10" : "bg-background/60")
                  }
                >
                  <p className="text-xs text-muted-foreground">{INTERVIEW_RUBRIC_GUIDE[key].label}</p>
                  <p className="mt-1 text-lg font-bold">{summary.averages?.[key]}/20</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="font-semibold">최근 3문항에서 먼저 보완할 축: {summary.weakest.label} {summary.weakest.score}/20</p>
              <p className="mt-1 text-muted-foreground">{summary.weakest.nextAction}</p>
            </div>
          </>
        )}

        <div className="flex gap-2 rounded-lg bg-primary/5 p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>다음 답변에서는 한 번에 한 축만 고쳐 말한 뒤, 교정 전·후 점수를 같은 기준으로 비교하세요.</p>
        </div>
        <p className="text-xs text-muted-foreground">
          이 점검은 답변 내용의 관련성·근거·구조·직무 연결·명료성만 봅니다. 표정·시선·말투·감정·성격이나 합격 가능성을 추론하지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}
