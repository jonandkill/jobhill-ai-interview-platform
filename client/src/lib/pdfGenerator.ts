import { escapeHtml, escapeHtmlWithBreaks } from "./safeHtml";

// PDF 생성 유틸리티 (클라이언트 사이드)
// jsPDF 라이브러리 대신 HTML을 PDF로 변환하는 방식 사용

interface QAItem {
  questionOrder: number;
  questionType: string;
  question: string;
  userAnswer: string | null;
  feedback: string | null;
  score: number | null;
  strengths: string | null;
  improvements: string | null;
  suggestedAnswer: string | null;
  suggestedAnswerShort: string | null;
  suggestedAnswerLong: string | null;
}

interface PdfData {
  session: {
    id: number;
    status: string;
    totalScore: number | null;
    overallFeedback: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  profile: {
    targetCompany: string;
    targetPosition: string;
  };
  qas: QAItem[];
  userName: string;
}

const questionTypeNames: Record<string, string> = {
  personality: "인성 질문",
  experience: "경험 질문",
  technical: "기술 질문",
  situational: "상황 질문",
  company: "회사 관련 질문",
};

const getScoreGrade = (score: number): string => {
  if (score >= 90) return "우수";
  if (score >= 70) return "양호";
  if (score >= 50) return "보통";
  return "개선 필요";
};

export function generateInterviewPdfHtml(data: PdfData): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const avgScore = data.session.totalScore || 0;
  const grade = getScoreGrade(avgScore);

  let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>면접 연습 결과 - ${escapeHtml(data.profile.targetCompany)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6; 
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 2px solid #1a365d;
    }
    .header h1 { 
      color: #1a365d; 
      font-size: 24px; 
      margin-bottom: 10px;
    }
    .header .subtitle { 
      color: #666; 
      font-size: 14px;
    }
    .summary { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
    }
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 15px;
    }
    .summary-item { }
    .summary-label { 
      font-size: 12px; 
      color: #666; 
      margin-bottom: 4px;
    }
    .summary-value { 
      font-size: 16px; 
      font-weight: bold; 
      color: #1a365d;
    }
    .score-box { 
      text-align: center; 
      background: #1a365d; 
      color: white; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
    }
    .score-box .score { 
      font-size: 48px; 
      font-weight: bold;
    }
    .score-box .grade { 
      font-size: 18px; 
      opacity: 0.9;
    }
    .overall-feedback { 
      background: #fffbeb; 
      border-left: 4px solid #f59e0b; 
      padding: 15px; 
      margin-bottom: 30px;
    }
    .overall-feedback h3 { 
      color: #92400e; 
      margin-bottom: 10px;
    }
    .qa-section { 
      margin-bottom: 30px; 
      page-break-inside: avoid;
    }
    .qa-header { 
      background: #e2e8f0; 
      padding: 12px 15px; 
      border-radius: 8px 8px 0 0;
    }
    .qa-header .q-number { 
      font-weight: bold; 
      color: #1a365d;
    }
    .qa-header .q-type { 
      font-size: 12px; 
      color: #666; 
      margin-left: 10px;
    }
    .qa-content { 
      border: 1px solid #e2e8f0; 
      border-top: none; 
      padding: 15px; 
      border-radius: 0 0 8px 8px;
    }
    .question { 
      font-weight: bold; 
      color: #1a365d; 
      margin-bottom: 15px;
      font-size: 16px;
    }
    .answer-section { 
      margin-bottom: 15px;
    }
    .section-title { 
      font-size: 12px; 
      color: #666; 
      margin-bottom: 5px; 
      font-weight: bold;
    }
    .answer-text { 
      background: #f1f5f9; 
      padding: 10px; 
      border-radius: 4px;
      font-size: 14px;
    }
    .feedback-box { 
      background: #f0fdf4; 
      border: 1px solid #86efac; 
      padding: 10px; 
      border-radius: 4px; 
      margin-bottom: 10px;
    }
    .strengths { 
      background: #f0fdf4; 
      border-left: 3px solid #22c55e;
    }
    .improvements { 
      background: #fef2f2; 
      border-left: 3px solid #ef4444;
    }
    .suggested { 
      background: #eff6ff; 
      border-left: 3px solid #3b82f6;
    }
    .score-badge { 
      display: inline-block; 
      background: #1a365d; 
      color: white; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 14px; 
      font-weight: bold;
    }
    .footer { 
      text-align: center; 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e2e8f0; 
      color: #666; 
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .qa-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 AI 면접 연습 결과</h1>
    <p class="subtitle">${escapeHtml(data.profile.targetCompany)} | ${escapeHtml(data.profile.targetPosition)}</p>
    <p class="subtitle">${formatDate(data.session.createdAt)}</p>
  </div>

  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">지원자</div>
        <div class="summary-value">${escapeHtml(data.userName)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">지원 회사</div>
        <div class="summary-value">${escapeHtml(data.profile.targetCompany)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">지원 직무</div>
        <div class="summary-value">${escapeHtml(data.profile.targetPosition)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">총 질문 수</div>
        <div class="summary-value">${data.qas.length}개</div>
      </div>
    </div>
  </div>

  <div class="score-box">
    <div class="score">${avgScore}점</div>
    <div class="grade">${grade}</div>
  </div>

  ${data.session.overallFeedback ? `
  <div class="overall-feedback">
    <h3>📝 종합 피드백</h3>
    <p>${escapeHtmlWithBreaks(data.session.overallFeedback)}</p>
  </div>
  ` : ''}

  <h2 style="margin-bottom: 20px; color: #1a365d;">📋 질문별 상세 결과</h2>
`;

  data.qas.forEach((qa, index) => {
    html += `
  <div class="qa-section">
    <div class="qa-header">
      <span class="q-number">Q${index + 1}</span>
      <span class="q-type">${escapeHtml(questionTypeNames[qa.questionType] || qa.questionType)}</span>
      ${qa.score !== null ? `<span class="score-badge" style="float: right;">${qa.score}점</span>` : ''}
    </div>
    <div class="qa-content">
      <div class="question">${escapeHtmlWithBreaks(qa.question)}</div>
      
      ${qa.userAnswer ? `
      <div class="answer-section">
        <div class="section-title">💬 내 답변</div>
        <div class="answer-text">${escapeHtmlWithBreaks(qa.userAnswer)}</div>
      </div>
      ` : ''}
      
      ${qa.feedback ? `
      <div class="answer-section feedback-box">
        <div class="section-title">🤖 AI 피드백</div>
        <p>${escapeHtmlWithBreaks(qa.feedback)}</p>
      </div>
      ` : ''}
      
      ${qa.strengths ? `
      <div class="answer-section feedback-box strengths">
        <div class="section-title">✅ 강점</div>
        <p>${escapeHtmlWithBreaks(qa.strengths)}</p>
      </div>
      ` : ''}
      
      ${qa.improvements ? `
      <div class="answer-section feedback-box improvements">
        <div class="section-title">⚠️ 개선점</div>
        <p>${escapeHtmlWithBreaks(qa.improvements)}</p>
      </div>
      ` : ''}
      
      ${qa.suggestedAnswerShort || qa.suggestedAnswer ? `
      <div class="answer-section feedback-box suggested">
        <div class="section-title">💡 모범 답안</div>
        <p>${escapeHtmlWithBreaks(qa.suggestedAnswerShort || qa.suggestedAnswer)}</p>
      </div>
      ` : ''}
    </div>
  </div>
`;
  });

  html += `
  <div class="footer">
    <p>이 문서는 다음 면접 코치에서 생성되었습니다.</p>
    <p>생성일: ${formatDate(new Date().toISOString())}</p>
  </div>
</body>
</html>
`;

  return html;
}

export function downloadPdf(data: PdfData): void {
  const html = generateInterviewPdfHtml(data);
  
  // 새 창에서 HTML 열기 (인쇄/PDF 저장 가능)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // 잠시 후 인쇄 다이얼로그 열기
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export function downloadHtmlFile(data: PdfData): void {
  const html = generateInterviewPdfHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `면접결과_${data.profile.targetCompany}_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
