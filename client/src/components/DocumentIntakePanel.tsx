import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DocumentIntakeError,
  documentIntakeMessage,
  extractDocumentLocally,
} from "@/lib/documentIntake";

type DocumentKind = "resume" | "coverLetter";
type SlotStatus = "idle" | "reading" | "review" | "ready" | "error";

interface SlotState {
  status: SlotStatus;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  text: string;
  message: string;
  applied: boolean;
}

const EMPTY_SLOT: SlotState = {
  status: "idle",
  fileName: "",
  fileSize: 0,
  pageCount: null,
  text: "",
  message: "",
  applied: false,
};

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function statusLabel(status: SlotStatus): string {
  if (status === "reading") return "텍스트 추출 중";
  if (status === "ready") return "인식 완료";
  if (status === "review") return "확인 필요";
  if (status === "error") return "인식 실패";
  return "파일 선택 전";
}

function IntakeSlot({
  kind,
  title,
  description,
  state,
  onFile,
  onText,
  onClear,
  onApply,
}: {
  kind: DocumentKind;
  title: string;
  description: string;
  state: SlotState;
  onFile: (file: File | undefined) => void;
  onText: (text: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const inputId = `document-${kind}`;
  const statusTone =
    state.status === "ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state.status === "review"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : state.status === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-border bg-muted/50 text-muted-foreground";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">{kind === "resume" ? "01" : "02"}</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}>
          {statusLabel(state.status)}
        </span>
      </div>

      <div
        className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          onFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={state.status === "reading"}
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {state.status === "reading" ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <UploadCloud className="h-8 w-8 text-primary" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {state.fileName ? "다른 파일로 교체" : `${title} PDF 선택`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF 10MB·20쪽 이하, TXT·MD</p>
        </div>
        <Button type="button" variant="outline" size="sm" asChild disabled={state.status === "reading"}>
          <label htmlFor={inputId} className="cursor-pointer">
            {state.status === "reading" ? "읽는 중…" : state.fileName ? "파일 교체" : "파일 선택"}
          </label>
        </Button>
      </div>

      {state.fileName && (
        <div className="mt-3 grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-[9px] font-bold text-muted-foreground">
            {state.fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "TXT"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground" title={state.fileName}>{state.fileName}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {sizeLabel(state.fileSize)}{state.pageCount ? ` · ${state.pageCount}쪽` : ""}
            </p>
          </div>
          {state.status !== "reading" && (
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={onClear} aria-label={`${title} 삭제`}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {state.message && (
        <p
          className={`mt-3 flex gap-2 rounded-xl border p-3 text-xs leading-relaxed ${statusTone}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.status === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {state.message}
        </p>
      )}

      {state.text && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`text-${kind}`} className="text-xs font-semibold text-foreground">인식 결과 확인·수정</label>
            <span className="text-[11px] text-muted-foreground">{state.text.length.toLocaleString("ko-KR")} / 12,000자</span>
          </div>
          <Textarea
            id={`text-${kind}`}
            value={state.text}
            maxLength={12_000}
            disabled={state.status === "reading"}
            onChange={(event) => onText(event.target.value)}
            className="min-h-44 resize-y text-sm leading-relaxed"
          />
          <Button type="button" className="w-full" onClick={onApply} disabled={!state.text.trim() || state.status === "reading" || state.applied}>
            {state.applied ? "프로필에 반영됨" : `${title} 내용에 반영`}
          </Button>
        </div>
      )}
    </section>
  );
}

export default function DocumentIntakePanel({
  onResumeApply,
  onCoverLetterApply,
}: {
  onResumeApply: (text: string) => void;
  onCoverLetterApply: (text: string) => void;
}) {
  const [slots, setSlots] = useState<Record<DocumentKind, SlotState>>({
    resume: { ...EMPTY_SLOT },
    coverLetter: { ...EMPTY_SLOT },
  });
  const sequence = useRef<Record<DocumentKind, number>>({ resume: 0, coverLetter: 0 });

  const readFile = async (kind: DocumentKind, file: File | undefined) => {
    if (!file) return;
    const current = sequence.current[kind] + 1;
    sequence.current[kind] = current;
    setSlots((previous) => ({
      ...previous,
      [kind]: {
        status: "reading",
        fileName: file.name.slice(0, 180),
        fileSize: file.size,
        pageCount: null,
        text: previous[kind].text,
        message: "원본을 업로드하지 않고 이 브라우저에서 텍스트를 읽고 있습니다.",
        applied: false,
      },
    }));
    try {
      const result = await extractDocumentLocally(file);
      if (sequence.current[kind] !== current) return;
      setSlots((previous) => ({
        ...previous,
        [kind]: {
          ...previous[kind],
          status: result.truncated || result.needsReview ? "review" : "ready",
          pageCount: result.pageCount,
          text: result.text,
          applied: false,
          message: result.truncated
            ? "12,000자까지만 인식했습니다. 중요한 후반 내용이 빠졌는지 확인해 주세요."
            : result.needsReview
              ? "텍스트가 거의 없는 쪽이 있습니다. 인식 결과를 반드시 확인해 주세요."
              : "기기 안에서 인식을 마쳤습니다. 내용을 확인한 뒤 프로필에 반영하세요.",
        },
      }));
    } catch (error) {
      if (sequence.current[kind] !== current) return;
      const message = error instanceof DocumentIntakeError
        ? documentIntakeMessage(error.code)
        : "문서를 읽지 못했습니다. 다른 파일을 선택하거나 기존 입력란에 직접 붙여 넣어 주세요.";
      setSlots((previous) => ({
        ...previous,
        [kind]: { ...previous[kind], status: "error", pageCount: null, message, applied: false },
      }));
    }
  };

  const clearSlot = (kind: DocumentKind) => {
    sequence.current[kind] += 1;
    setSlots((previous) => ({ ...previous, [kind]: { ...EMPTY_SLOT } }));
  };

  const updateText = (kind: DocumentKind, text: string) => {
    setSlots((previous) => ({
      ...previous,
      [kind]: { ...previous[kind], text: text.slice(0, 12_000), applied: false },
    }));
  };

  const apply = (kind: DocumentKind) => {
    const text = slots[kind].text.trim();
    if (!text) return;
    if (kind === "resume") onResumeApply(text);
    else onCoverLetterApply(text);
    setSlots((previous) => ({ ...previous, [kind]: { ...previous[kind], applied: true } }));
  };

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <FileText className="h-4 w-4" />
              PDF 자동 인식
            </div>
            <CardTitle className="text-xl sm:text-2xl">이력서·자기소개서를 바로 불러오세요.</CardTitle>
            <CardDescription className="mt-2 max-w-2xl leading-relaxed">
              원본 파일은 서버에 올리지 않습니다. 브라우저에서 읽은 내용을 확인·수정한 뒤 프로필에 반영합니다.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            원본 비저장
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <IntakeSlot
            kind="resume"
            title="이력서"
            description="경력·프로젝트·성과의 실제 역할을 질문에 사용합니다."
            state={slots.resume}
            onFile={(file) => void readFile("resume", file)}
            onText={(text) => updateText("resume", text)}
            onClear={() => clearSlot("resume")}
            onApply={() => apply("resume")}
          />
          <IntakeSlot
            kind="coverLetter"
            title="자기소개서"
            description="지원동기·강조 경험·학습 전이를 질문에 사용합니다."
            state={slots.coverLetter}
            onFile={(file) => void readFile("coverLetter", file)}
            onText={(text) => updateText("coverLetter", text)}
            onClear={() => clearSlot("coverLetter")}
            onApply={() => apply("coverLetter")}
          />
        </div>
        <p className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">텍스트 검색이 가능한 PDF를 지원합니다.</strong> 이미지로만 된 스캔 PDF는 내용을 추측하지 않고 다시 저장 또는 직접 입력 경로를 안내합니다.
        </p>
      </CardContent>
    </Card>
  );
}
