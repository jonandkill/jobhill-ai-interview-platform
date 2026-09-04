import { useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildExperienceFrame } from "@shared/interviewKnowledge";

interface InstantAnswerCorrectionProps {
  originalAnswer: string;
  correctedAnswer?: string | null;
  correctedAnswerShort?: string | null;
  correctedAnswerLong?: string | null;
  improvements?: string | null;
  question?: string | null;
}

export default function InstantAnswerCorrection({
  originalAnswer,
  correctedAnswer,
  correctedAnswerShort,
  correctedAnswerLong,
  improvements,
  question,
}: InstantAnswerCorrectionProps) {
  const hasTwoVersions = Boolean(correctedAnswerShort && correctedAnswerLong);
  const [version, setVersion] = useState<"short" | "long">("long");
  const [copied, setCopied] = useState(false);
  const correction = useMemo(() => {
    if (version === "short" && correctedAnswerShort) return correctedAnswerShort;
    return correctedAnswerLong || correctedAnswer || correctedAnswerShort || "";
  }, [correctedAnswer, correctedAnswerLong, correctedAnswerShort, version]);
  const experienceFrame = useMemo(
    () => buildExperienceFrame({
      question: question || improvements || originalAnswer,
      answer: originalAnswer,
    }),
    [improvements, originalAnswer, question],
  );

  if (!correction && !experienceFrame.applicable) return null;

  const copyCorrection = async () => {
    try {
      await navigator.clipboard.writeText(correction);
      setCopied(true);
      toast.success("교정 답변을 복사했습니다.");
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      toast.error("복사하지 못했습니다. 답변을 길게 눌러 복사해주세요.");
    }
  };

  return (
    <section
      className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5"
      aria-labelledby={correction ? "instant-correction-title" : undefined}
    >
      {correction && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="instant-correction-title" className="flex items-center gap-2 font-semibold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                즉시 답변 교정
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                답변에 포함된 사실은 유지하고 구조와 표현을 면접 답변 형태로 정리했습니다.
              </p>
            </div>
            {hasTwoVersions && (
              <div className="flex rounded-lg border bg-background p-1" aria-label="교정 답변 길이">
                <Button type="button" size="sm" variant={version === "short" ? "default" : "ghost"} className="h-8" onClick={() => setVersion("short")}>짧게</Button>
                <Button type="button" size="sm" variant={version === "long" ? "default" : "ghost"} className="h-8" onClick={() => setVersion("long")}>자세히</Button>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-semibold text-muted-foreground">내가 말한 답변</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{originalAnswer || "인식된 답변이 없습니다."}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-sm" aria-live="polite">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-primary">고쳐서 말하는 답변</p>
                <Button type="button" size="sm" variant="ghost" className="min-h-9 gap-1 px-2" onClick={copyCorrection} aria-label="교정 답변 복사">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "복사됨" : "복사"}
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6">{correction}</p>
            </div>
          </div>

          {improvements && (
            <div className="mt-3 rounded-lg bg-background/70 p-3">
              <p className="text-xs font-semibold text-muted-foreground">이번에 고친 핵심</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{improvements}</p>
            </div>
          )}
        </>
      )}

      {experienceFrame.applicable && (
        <details className={correction ? "mt-3 rounded-lg border bg-background/70 p-3" : "rounded-lg border bg-background/70 p-3"} open={!correction}>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            면접질문 30선 · 경험 근거 지도 ({experienceFrame.evidenceCount}/5)
          </summary>
          <div className="mt-3 space-y-3">
            {experienceFrame.knowledgeMatches[0] && (
              <p className="rounded-md bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-primary">{experienceFrame.knowledgeMatches[0].categoryLabel}</span>
                {" · "}{experienceFrame.knowledgeMatches[0].intent}
              </p>
            )}
            {experienceFrame.stressSituations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">답변에서 확인된 업무 스트레스 상황</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {experienceFrame.stressSituations.map(situation => (
                    <span key={situation.id} className="rounded-full border px-2.5 py-1 text-xs">
                      {situation.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {experienceFrame.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className={phase.status === "supported"
                    ? "rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
                    : "rounded-lg border border-dashed p-3"}
                >
                  <p className="text-xs font-semibold">
                    {index + 1}. {phase.label} · {phase.status === "supported" ? "확인" : "보완"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                    {phase.evidence || phase.guidance}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              없는 경험·수치·성과를 만들지 않습니다. 부족한 칸은 다음 재답변에서 본인의 실제 사실로 채우세요.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}
