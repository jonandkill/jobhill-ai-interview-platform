/**
 * 음성 인식 후처리 유틸리티
 * 자주 잘못 인식되는 단어를 자동으로 교정
 */

// 자주 잘못 인식되는 단어 사전
const CORRECTION_DICTIONARY: Record<string, string> = {
  // 회사명
  "삼성": "삼성",
  "삼성전자": "삼성전자",
  "네이버": "네이버",
  "카카오": "카카오",
  "엘지": "LG",
  "에스케이": "SK",
  "현대": "현대",
  "기아": "기아",
  
  // 직무 관련
  "프론트엔드": "프론트엔드",
  "백엔드": "백엔드",
  "풀스택": "풀스택",
  "데브옵스": "DevOps",
  "유아이": "UI",
  "유엑스": "UX",
  "에이아이": "AI",
  "머신러닝": "머신러닝",
  "딥러닝": "딥러닝",
  
  // 기술 용어
  "리액트": "React",
  "뷰": "Vue",
  "앵귤러": "Angular",
  "노드": "Node.js",
  "파이썬": "Python",
  "자바": "Java",
  "자바스크립트": "JavaScript",
  "타입스크립트": "TypeScript",
  "깃": "Git",
  "깃허브": "GitHub",
  "도커": "Docker",
  "쿠버네티스": "Kubernetes",
  "에이더블유에스": "AWS",
  "애저": "Azure",
  
  // 비즈니스 용어
  "케이피아이": "KPI",
  "알오아이": "ROI",
  "비투비": "B2B",
  "비투씨": "B2C",
  "에스디지에스": "SDGs",
  
  // 자주 틀리는 표현
  "그래가지고": "그래서",
  "막": "많이",
  "되게": "매우",
  "완전": "매우",
  "엄청": "매우",
};

/**
 * 음성 인식 결과를 후처리하여 교정
 * @param text 원본 음성 인식 텍스트
 * @returns 교정된 텍스트
 */
export function postProcessTranscription(text: string): string {
  if (!text) return text;
  
  let correctedText = text;
  
  // 사전 기반 교정
  for (const [wrong, correct] of Object.entries(CORRECTION_DICTIONARY)) {
    // 대소문자 구분 없이 교정
    const regex = new RegExp(wrong, 'gi');
    correctedText = correctedText.replace(regex, correct);
  }
  
  // 연속된 공백 제거
  correctedText = correctedText.replace(/\s+/g, ' ');
  
  // 앞뒤 공백 제거
  correctedText = correctedText.trim();
  
  return correctedText;
}

/**
 * 교정 사전에 새로운 단어 추가
 * @param wrong 잘못된 표현
 * @param correct 올바른 표현
 */
export function addCorrectionEntry(wrong: string, correct: string): void {
  CORRECTION_DICTIONARY[wrong] = correct;
}

/**
 * 현재 교정 사전 가져오기
 */
export function getCorrectionDictionary(): Record<string, string> {
  return { ...CORRECTION_DICTIONARY };
}
