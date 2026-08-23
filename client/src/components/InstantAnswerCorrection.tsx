import { useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InstantAnswerCorrectionProps {
  originalAnswer: string;
  correctedAnswer?: string | null;
  correctedAnswerShort?: string | null;
  correctedAnswerLong?: string | null;
  improvements?: string | null;
}

export default function InstantAnswerCorrection({
  originalAnswer,
  correctedAnswer,
  correctedAnswerShort,
  correctedAnswerLong,
  improvements,
}: InstantAnswerCorrectionProps) {
  const hasTwoVersions = Boolean(correctedAnswerShort && correctedAnswerLong);
  const [version, setVersion] = useState<"short" | "long">("long");
  const [copied, setCopied] = useState(false);
  const correction = useMemo(() => {
    if (version === "short" && correctedAnswerShort) return correctedAnswerShort;
    return correctedAnswerLong || correctedAnswer || correctedAnswerShort || "";
  }, [correctedAnswer, correctedAnswerLong, correctedAnswerShort, version]);

  if (!correction) return null;

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
      aria-labelledby="instant-correction-title"
      aria-live="polite"
    >
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
        <div className="rounded-lg border border-primary/20 bg-background p-3 shadow-sm">
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
    </section>
  );
}
