import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MAX_PAGES = 20;
export const DOCUMENT_MAX_TEXT = 12_000;

export type DocumentIntakeCode =
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_UNSUPPORTED"
  | "PDF_SIGNATURE_INVALID"
  | "PDF_PASSWORD_REQUIRED"
  | "PDF_PAGE_LIMIT"
  | "PDF_SCANNED"
  | "PDF_MALFORMED"
  | "DOCUMENT_EMPTY";

export class DocumentIntakeError extends Error {
  constructor(public readonly code: DocumentIntakeCode) {
    super(code);
    this.name = "DocumentIntakeError";
  }
}

export interface ExtractedDocument {
  text: string;
  pageCount: number | null;
  truncated: boolean;
  needsReview: boolean;
}

export function documentIntakeMessage(code: DocumentIntakeCode): string {
  const messages: Record<DocumentIntakeCode, string> = {
    FILE_TOO_LARGE: "파일은 10MB 이하만 사용할 수 있습니다.",
    FILE_TYPE_UNSUPPORTED: "PDF·TXT·MD 파일만 사용할 수 있습니다.",
    PDF_SIGNATURE_INVALID: "PDF 형식이 확인되지 않습니다. 파일을 다시 저장해 주세요.",
    PDF_PASSWORD_REQUIRED: "암호가 설정된 PDF는 읽을 수 없습니다. 암호를 해제한 사본을 사용해 주세요.",
    PDF_PAGE_LIMIT: "PDF는 20쪽 이하만 사용할 수 있습니다. 필요한 쪽만 새 PDF로 저장해 주세요.",
    PDF_SCANNED: "이미지로만 된 스캔 PDF라 텍스트를 찾지 못했습니다. 텍스트 검색이 가능한 PDF로 다시 저장하거나 직접 입력해 주세요.",
    PDF_MALFORMED: "PDF가 손상되었거나 지원되지 않는 형식입니다.",
    DOCUMENT_EMPTY: "읽을 수 있는 문서 내용이 없습니다.",
  };
  return messages[code];
}

export function isPdfSignature(bytes: Uint8Array): boolean {
  return new TextDecoder("latin1").decode(bytes.slice(0, 1024)).includes("%PDF-");
}

export function maskDocumentText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\b\d{6}\s*[- ]?\s*[1-4]\d{6}\b/g, "[주민번호 마스킹]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 마스킹]")
    .replace(/\b(?:01[016789]|02|0[3-6][1-5])[- .]?\d{3,4}[- .]?\d{4}\b/g, "[연락처 마스킹]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extension(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

async function extractPdf(file: File): Promise<ExtractedDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfSignature(bytes)) throw new DocumentIntakeError("PDF_SIGNATURE_INVALID");
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      useWorkerFetch: false,
      stopAtErrors: true,
    });
    const document = await loadingTask.promise;
    try {
      if (document.numPages > DOCUMENT_MAX_PAGES) throw new DocumentIntakeError("PDF_PAGE_LIMIT");
      const pages: string[] = [];
      let sparsePages = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent({ disableNormalization: false });
        const parts: string[] = [];
        for (const item of content.items) {
          if (!("str" in item) || !item.str) continue;
          parts.push(item.str);
          if (item.hasEOL) parts.push("\n");
        }
        const pageText = maskDocumentText(parts.join(" "));
        if (pageText.replace(/\s/g, "").length < 20) sparsePages += 1;
        if (pageText) pages.push(`[${pageNumber}쪽]\n${pageText}`);
      }
      const fullText = maskDocumentText(pages.join("\n\n"));
      if (fullText.replace(/\s/g, "").length < 20) throw new DocumentIntakeError("PDF_SCANNED");
      return {
        text: fullText.slice(0, DOCUMENT_MAX_TEXT),
        pageCount: document.numPages,
        truncated: fullText.length > DOCUMENT_MAX_TEXT,
        needsReview: sparsePages > 0,
      };
    } finally {
      await document.destroy();
    }
  } catch (error) {
    if (error instanceof DocumentIntakeError) throw error;
    if (error instanceof Error && error.name === "PasswordException") {
      throw new DocumentIntakeError("PDF_PASSWORD_REQUIRED");
    }
    throw new DocumentIntakeError("PDF_MALFORMED");
  }
}

export async function extractDocumentLocally(file: File): Promise<ExtractedDocument> {
  if (file.size > DOCUMENT_MAX_BYTES) throw new DocumentIntakeError("FILE_TOO_LARGE");
  const suffix = extension(file.name);
  if (suffix === "pdf") return extractPdf(file);
  if (suffix !== "txt" && suffix !== "md") throw new DocumentIntakeError("FILE_TYPE_UNSUPPORTED");
  const fullText = maskDocumentText(await file.text());
  if (!fullText) throw new DocumentIntakeError("DOCUMENT_EMPTY");
  return {
    text: fullText.slice(0, DOCUMENT_MAX_TEXT),
    pageCount: null,
    truncated: fullText.length > DOCUMENT_MAX_TEXT,
    needsReview: false,
  };
}
