import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

interface QAItem {
  id: number;
  question: string;
  userAnswer: string | null;
  feedback?: string | null;
  score: number | null;
  strengths: string | null;
  improvements: string | null;
  suggestedAnswer: string | null;
  questionType: string | null;
}

interface InterviewSession {
  id: number;
  company?: string;
  position?: string;
  isVoiceMode: boolean | null;
  totalQuestions: number | null;
  completedQuestions: number | null;
  overallScore: number | null;
  overallFeedback?: string | null;
  balanceAnalysis?: string | Record<string, number> | null;
  passRate: number | null;
  createdAt: Date;
}

function findFont(fileName: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), "server/assets/fonts", fileName),
    path.resolve(__dirname, "../assets/fonts", fileName),
    `/usr/share/fonts/opentype/noto/${fileName}`,
    "/usr/share/fonts/malgun.ttf",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function parseBalanceAnalysis(value: InterviewSession["balanceAnalysis"]): Record<string, number> | null {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export async function generateInterviewPDF(data: {
  session: InterviewSession;
  qaList: QAItem[];
}): Promise<Buffer> {
  const { session, qaList } = data;
  const regularFont = findFont("NotoSansCJK-Regular.ttc");
  const boldFont = findFont("NotoSansCJK-Bold.ttc") ?? regularFont;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, info: { Title: "면접 결과 보고서" } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const useFont = (fontPath: string | null, fallback: string, postscriptName: string) => {
      try {
        if (fontPath) {
          // NotoSansCJK는 TTC 컬렉션이므로 PDFKit/fontkit에 KR 폰트 face를 명시해야 합니다.
          doc.font(fontPath, postscriptName);
          return;
        }
      } catch (error) {
        console.warn("[pdf] 한글 폰트 로드 실패, 기본 폰트로 대체합니다.", error);
      }
      doc.font(fallback);
    };

    const regular = () => useFont(regularFont, "Helvetica", "NotoSansCJKkr-Regular");
    const bold = () => useFont(boldFont, "Helvetica-Bold", "NotoSansCJKkr-Bold");
    const heading = (title: string, size = 16) => {
      bold();
      doc.fontSize(size).fillColor("#0f172a").text(title);
      doc.moveDown(0.5);
    };
    const block = (label: string, value: unknown, color = "#0f172a") => {
      const text = safeText(value);
      if (!text) return;
      bold();
      doc.fontSize(10).fillColor(color).text(label);
      regular();
      doc.fontSize(10).fillColor("#111827").text(text, { width: 500 });
      doc.moveDown(0.45);
    };
    const ensureSpace = (height = 120) => {
      if (doc.y > 720 - height) doc.addPage();
    };

    bold();
    doc.fontSize(24).fillColor("#0f172a").text("면접 결과 보고서", { align: "center" });
    doc.moveDown(1.5);

    heading("면접 정보");
    regular();
    doc.fontSize(11).fillColor("#111827");
    if (session.company) doc.text(`지원 회사: ${safeText(session.company)}`);
    if (session.position) doc.text(`지원 직무: ${safeText(session.position)}`);
    doc.text(`면접 유형: ${session.isVoiceMode ? "음성 면접" : "텍스트 면접"}`);
    doc.text(`면접 일시: ${new Date(session.createdAt).toLocaleString("ko-KR")}`);
    doc.moveDown(1.2);

    heading("종합 평가");
    regular();
    doc.fontSize(11).fillColor("#111827");
    doc.text(`종합 점수: ${session.overallScore ?? 0}점`);
    doc.text(`답변 준비도: ${session.passRate ?? 0}점 (실제 합격 확률이 아닌 연습 지표)`);
    doc.text(`완료한 질문: ${session.completedQuestions ?? 0}/${session.totalQuestions ?? qaList.length}`);
    doc.moveDown(0.7);
    block("종합 피드백", session.overallFeedback);

    const balance = parseBalanceAnalysis(session.balanceAnalysis);
    if (balance) {
      bold();
      doc.fontSize(10).fillColor("#0f172a").text("평가 영역별 점수");
      regular();
      doc.fontSize(10).fillColor("#111827");
      Object.entries(balance).forEach(([key, value]) => doc.text(`${key}: ${value}점`));
      doc.moveDown(1);
    }

    heading("질문별 평가");
    qaList.forEach((qa, index) => {
      ensureSpace(180);
      bold();
      doc.fontSize(14).fillColor("#0f172a").text(`질문 ${index + 1}${qa.questionType ? ` (${safeText(qa.questionType)})` : ""}`);
      doc.moveDown(0.3);
      regular();
      doc.fontSize(10).fillColor("#111827").text(safeText(qa.question), { width: 500 });
      doc.moveDown(0.45);
      block("내 답변", qa.userAnswer);
      if (qa.score !== null && qa.score !== undefined) block("점수", `${qa.score}점`);
      block("전반적인 피드백", qa.feedback);
      
      // 사용자 답변 스크립트와 AI 교정 내용 나란히 비교 섹션 추가
      ensureSpace(120);
      bold();
      doc.fontSize(10).fillColor("#4338ca").text(" [비교 분석] 사용자 답변 스크립트 vs AI 교정 가이드");
      regular();
      doc.fontSize(9).fillColor("#374151");
      doc.text(`- 원본 답변: ${safeText(qa.userAnswer) || "답변 없음"}`, { width: 500 });
      doc.text(`- AI 교정 가이드: ${safeText(qa.improvements || qa.suggestedAnswer) || "교정 내용 없음"}`, { width: 500 });
      doc.moveDown(0.3);

      block("강점", qa.strengths, "#047857");
      block("개선점", qa.improvements, "#c2410c");
      block("모범답안", qa.suggestedAnswer, "#1d4ed8");
      doc.moveDown(0.6);
    });

    doc.end();
  });
}

// 예상 질문 리스트 전용 PDF 생성 함수
export async function generateQuestionListPDF(data: {
  session: InterviewSession;
  qaList: QAItem[];
  category?: string;
}): Promise<Buffer> {
  const { session, qaList, category } = data;
  const regularFont = findFont("NotoSansCJK-Regular.ttc");
  const boldFont = findFont("NotoSansCJK-Bold.ttc") ?? regularFont;

  return new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const useQuestionListFont = (fontPath: string | null, fallback: string, postscriptName: string) => {
      try {
        if (fontPath) {
          doc.font(fontPath, postscriptName);
          return;
        }
      } catch (error) {
        console.warn("[pdf] 예상 질문 PDF 한국어 폰트 로드 실패, 기본 폰트로 대체합니다.", error);
      }
      doc.font(fallback);
    };
    const regular = () => useQuestionListFont(regularFont, "Helvetica", "NotoSansCJKkr-Regular");
    const bold = () => useQuestionListFont(boldFont, "Helvetica-Bold", "NotoSansCJKkr-Bold");

    // 제목
    bold();
    doc.fontSize(22).fillColor("#1e3a8a").text("AI 면접 맞춤 예상 질문 리스트", { align: "center" });
    doc.moveDown(0.5);

    regular();
    doc.fontSize(11).fillColor("#4b5563").text(`지원 회사: ${session.company || "미지정"} | 지원 직무: ${session.position || "미지정"}`, { align: "center" });
    doc.fontSize(10).fillColor("#6b7280").text(`카테고리 필터: ${category && category !== "all" ? category : "전체"} | 생성일시: ${new Date(session.createdAt).toLocaleDateString('ko-KR')}`, { align: "center" });
    doc.moveDown(1.5);

    // 구분선
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // 질문 목록 출력
    qaList.forEach((qa, index) => {
      if (doc.y > 700) doc.addPage();
      
      bold();
      doc.fontSize(12).fillColor("#0f172a").text(`[질문 ${index + 1}] ${qa.questionType ? `(${safeText(qa.questionType)})` : ""}`);
      doc.moveDown(0.4);

      regular();
      doc.fontSize(11).fillColor("#1f2937").text(safeText(qa.question), { width: 490 });
      doc.moveDown(0.8);

      if (qa.suggestedAnswer) {
        bold();
        doc.fontSize(10).fillColor("#2563eb").text("💡 AI 추천 모범 답변 포인트:");
        regular();
        doc.fontSize(9.5).fillColor("#4b5563").text(safeText(qa.suggestedAnswer), { width: 490 });
        doc.moveDown(1);
      }

      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
    });

    doc.end();
  });
}
