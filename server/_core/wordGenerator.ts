import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface QAItem {
  id: number;
  question: string;
  userAnswer: string | null;
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
  passRate: number | null;
  createdAt: Date;
}

export async function generateInterviewWord(data: {
  session: InterviewSession;
  qaList: QAItem[];
}): Promise<Buffer> {
  const { session, qaList } = data;
  
  const sections: Paragraph[] = [];
  
  // 제목
  sections.push(
    new Paragraph({
      text: '면접 결과 보고서',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // 면접 정보
  sections.push(
    new Paragraph({
      text: '면접 정보',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );
  
  if (session.company) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '지원 회사: ', bold: true }),
          new TextRun(session.company),
        ],
        spacing: { after: 100 },
      })
    );
  }
  
  if (session.position) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '지원 직무: ', bold: true }),
          new TextRun(session.position),
        ],
        spacing: { after: 100 },
      })
    );
  }
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: '면접 유형: ', bold: true }),
        new TextRun(session.isVoiceMode ? '음성 면접' : '텍스트 면접'),
      ],
      spacing: { after: 100 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: '면접 일시: ', bold: true }),
        new TextRun(new Date(session.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })),
      ],
      spacing: { after: 300 },
    })
  );
  
  // 종합 평가
  sections.push(
    new Paragraph({
      text: '종합 평가',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: '종합 점수: ', bold: true }),
        new TextRun(`${session.overallScore || 0}점`),
      ],
      spacing: { after: 100 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: '답변 준비도: ', bold: true }),
        new TextRun(`${session.passRate || 0}점 (연습 지표)`),
      ],
      spacing: { after: 100 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: '완료한 질문: ', bold: true }),
        new TextRun(`${session.completedQuestions}/${session.totalQuestions}`),
      ],
      spacing: { after: 300 },
    })
  );
  
  // 질문별 평가
  sections.push(
    new Paragraph({
      text: '질문별 평가',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );
  
  qaList.forEach((qa, index) => {
    sections.push(
      new Paragraph({
        text: `질문 ${index + 1}${qa.questionType ? ` (${qa.questionType})` : ''}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );
    
    sections.push(
      new Paragraph({
        text: qa.question,
        spacing: { after: 150 },
      })
    );
    
    if (qa.userAnswer) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '내 답변: ', bold: true, italics: true }),
          ],
          spacing: { after: 50 },
        })
      );
      
      sections.push(
        new Paragraph({
          text: qa.userAnswer,
          spacing: { after: 150 },
        })
      );
    }
    
    if (qa.score !== null && qa.score !== undefined) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `점수: ${qa.score}점`, bold: true }),
          ],
          spacing: { after: 150 },
        })
      );
    }
    
    if (qa.strengths) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '✅ 강점: ', bold: true, color: '059669' }),
          ],
          spacing: { after: 50 },
        })
      );
      
      sections.push(
        new Paragraph({
          text: qa.strengths,
          spacing: { after: 150 },
        })
      );
    }
    
    if (qa.improvements) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '⚠️ 개선점: ', bold: true, color: 'EA580C' }),
          ],
          spacing: { after: 50 },
        })
      );
      
      sections.push(
        new Paragraph({
          text: qa.improvements,
          spacing: { after: 150 },
        })
      );
    }
    
    if (qa.suggestedAnswer) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '💡 모범답안: ', bold: true, color: '2563EB' }),
          ],
          spacing: { after: 50 },
        })
      );
      
      sections.push(
        new Paragraph({
          text: qa.suggestedAnswer,
          spacing: { after: 300 },
        })
      );
    }
  });
  
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
  
  return await Packer.toBuffer(doc);
}
