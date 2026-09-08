/**
 * 음성 인식 정확도 향상을 위한 커스텀 사전
 * 전문 용어, 기업명, 직무 관련 용어를 포함
 */

// 대기업 및 주요 기업명 사전
export const companyNames: Record<string, string> = {
  // 대기업
  '삼성': '삼성',
  '삼성전자': '삼성전자',
  '삼성 전자': '삼성전자',
  '삼성에스디에스': '삼성SDS',
  '삼성 에스디에스': '삼성SDS',
  '엘지': 'LG',
  '엘 지': 'LG',
  '엘지전자': 'LG전자',
  '엘지 전자': 'LG전자',
  '엘지씨엔에스': 'LG CNS',
  '에스케이': 'SK',
  '에스 케이': 'SK',
  '에스케이하이닉스': 'SK하이닉스',
  '에스케이 하이닉스': 'SK하이닉스',
  '현대': '현대',
  '현대자동차': '현대자동차',
  '현대 자동차': '현대자동차',
  '기아': '기아',
  '기아자동차': '기아자동차',
  '포스코': 'POSCO',
  '롯데': '롯데',
  '한화': '한화',
  '네이버': '네이버',
  '카카오': '카카오',
  '쿠팡': '쿠팡',
  '배달의민족': '배달의민족',
  '배민': '배달의민족',
  '토스': '토스',
  '당근마켓': '당근마켓',
  '라인': 'LINE',
  '야놀자': '야놀자',
  '직방': '직방',
  '마켓컬리': '마켓컬리',
  '컬리': '마켓컬리',
  '무신사': '무신사',
  '오늘의집': '오늘의집',
  '리디': '리디',
  '왓챠': '왓챠',
  '버킷플레이스': '버킷플레이스',
  '비바리퍼블리카': '비바리퍼블리카',
  '우아한형제들': '우아한형제들',
  '크래프톤': '크래프톤',
  '넥슨': '넥슨',
  '엔씨소프트': 'NC소프트',
  '엔씨 소프트': 'NC소프트',
  '넷마블': '넷마블',
  '스마일게이트': '스마일게이트',
  '펄어비스': '펄어비스',
};

// IT/개발 전문 용어 사전
export const itTerms: Record<string, string> = {
  // 프로그래밍 언어
  '자바': 'Java',
  '자바스크립트': 'JavaScript',
  '타입스크립트': 'TypeScript',
  '파이썬': 'Python',
  '파이선': 'Python',
  '씨플플': 'C++',
  '씨 플러스 플러스': 'C++',
  '씨샵': 'C#',
  '씨 샵': 'C#',
  '고랭': 'Go',
  '코틀린': 'Kotlin',
  '스위프트': 'Swift',
  '러스트': 'Rust',
  
  // 프레임워크/라이브러리
  '리액트': 'React',
  '리엑트': 'React',
  '뷰': 'Vue',
  '뷰제이에스': 'Vue.js',
  '앵귤러': 'Angular',
  '노드': 'Node.js',
  '노드제이에스': 'Node.js',
  '익스프레스': 'Express',
  '스프링': 'Spring',
  '스프링부트': 'Spring Boot',
  '장고': 'Django',
  '플라스크': 'Flask',
  '넥스트': 'Next.js',
  '넥스트제이에스': 'Next.js',
  '넥스트 제이에스': 'Next.js',
  
  // 데이터베이스
  '마이에스큐엘': 'MySQL',
  '포스트그레스': 'PostgreSQL',
  '포스트그레에스큐엘': 'PostgreSQL',
  '몽고디비': 'MongoDB',
  '몽고 디비': 'MongoDB',
  '레디스': 'Redis',
  '엘라스틱서치': 'Elasticsearch',
  
  // 클라우드/인프라
  '에이더블유에스': 'AWS',
  '아마존웹서비스': 'AWS',
  '에저': 'Azure',
  '애저': 'Azure',
  '지씨피': 'GCP',
  '구글클라우드': 'GCP',
  '도커': 'Docker',
  '쿠버네티스': 'Kubernetes',
  '케이에이트에스': 'K8s',
  '젠킨스': 'Jenkins',
  '깃허브': 'GitHub',
  '깃랩': 'GitLab',
  '씨아이씨디': 'CI/CD',
  
  // 개발 방법론/개념
  '애자일': 'Agile',
  '스크럼': 'Scrum',
  '칸반': 'Kanban',
  '티디디': 'TDD',
  '테스트주도개발': 'TDD',
  '비디디': 'BDD',
  '데브옵스': 'DevOps',
  '마이크로서비스': 'Microservices',
  '모놀리식': 'Monolithic',
  '레스트': 'REST',
  '레스트풀': 'RESTful',
  '에이피아이': 'API',
  '그래프큐엘': 'GraphQL',
  
  // AI/ML
  '머신러닝': 'Machine Learning',
  '딥러닝': 'Deep Learning',
  '인공지능': 'AI',
  '에이아이': 'AI',
  '엠엘': 'ML',
  '엔엘피': 'NLP',
  '자연어처리': 'NLP',
  '컴퓨터비전': 'Computer Vision',
  '텐서플로우': 'TensorFlow',
  '텐서플로': 'TensorFlow',
  '파이토치': 'PyTorch',
  '케라스': 'Keras',
  '지피티': 'GPT',
  '챗지피티': 'ChatGPT',
  '엘엘엠': 'LLM',
};

// 마케팅/비즈니스 전문 용어 사전
export const marketingTerms: Record<string, string> = {
  '케이피아이': 'KPI',
  '오케이알': 'OKR',
  '알오아이': 'ROI',
  '씨피에이': 'CPA',
  '씨피씨': 'CPC',
  '씨피엠': 'CPM',
  '씨티알': 'CTR',
  '씨브이알': 'CVR',
  '엘티브이': 'LTV',
  '씨에이씨': 'CAC',
  '에이알피유': 'ARPU',
  '엠에이유': 'MAU',
  '디에이유': 'DAU',
  '비투비': 'B2B',
  '비투씨': 'B2C',
  '씨투씨': 'C2C',
  '디투씨': 'D2C',
  '에스이오': 'SEO',
  '에스이엠': 'SEM',
  '씨알엠': 'CRM',
  '이알피': 'ERP',
  '피엠에프': 'PMF',
  '엠브이피': 'MVP',
  '피오씨': 'POC',
  '유엑스': 'UX',
  '유아이': 'UI',
  '에이비테스트': 'A/B Test',
  '그로스해킹': 'Growth Hacking',
  '퍼널': 'Funnel',
  '리텐션': 'Retention',
  '온보딩': 'Onboarding',
  '페르소나': 'Persona',
};

// 금융 전문 용어 사전
export const financeTerms: Record<string, string> = {
  '아이피오': 'IPO',
  '엠앤에이': 'M&A',
  '피이': 'PE',
  '브이씨': 'VC',
  '피비알': 'PBR',
  '피이알': 'PER',
  '이피에스': 'EPS',
  '이비티다': 'EBITDA',
  '에비타': 'EBITDA',
  '디씨에프': 'DCF',
  '엔피브이': 'NPV',
  '아이알알': 'IRR',
  '와씨씨': 'WACC',
  '에프디아이': 'FDI',
  '에이엠씨': 'AMC',
  '에이유엠': 'AUM',
  '핀테크': 'FinTech',
  '레그테크': 'RegTech',
  '인슈어테크': 'InsurTech',
};

// 직무/역할 관련 용어
export const jobTerms: Record<string, string> = {
  '피엠': 'PM',
  '피오': 'PO',
  '씨이오': 'CEO',
  '씨티오': 'CTO',
  '씨에프오': 'CFO',
  '씨오오': 'COO',
  '씨엠오': 'CMO',
  '브이피': 'VP',
  '티엘': 'TL',
  '테크리드': 'Tech Lead',
  '프론트엔드': 'Frontend',
  '백엔드': 'Backend',
  '풀스택': 'Full Stack',
  '데브옵스': 'DevOps',
  '에스알이': 'SRE',
  '큐에이': 'QA',
  '디자이너': '디자이너',
  '유엑스디자이너': 'UX 디자이너',
  '유아이디자이너': 'UI 디자이너',
  '데이터사이언티스트': 'Data Scientist',
  '데이터엔지니어': 'Data Engineer',
  '엠엘엔지니어': 'ML Engineer',
};

// 모든 사전 통합
export const allDictionaries = {
  ...companyNames,
  ...itTerms,
  ...marketingTerms,
  ...financeTerms,
  ...jobTerms,
};

/**
 * 음성 인식 결과를 전문 용어로 교정
 * @param text 원본 텍스트
 * @returns 교정된 텍스트
 */
export function correctSpeechText(text: string): string {
  let correctedText = text;
  
  // 모든 사전을 순회하며 교정
  for (const [spoken, correct] of Object.entries(allDictionaries)) {
    // 대소문자 무시하고 전체 단어 매칭
    const regex = new RegExp(`\\b${spoken}\\b`, 'gi');
    correctedText = correctedText.replace(regex, correct);
  }
  
  return correctedText;
}

/**
 * 음성 인식 힌트 문구 생성 (SpeechRecognition grammars용)
 * @param category 카테고리 (it, marketing, finance, all)
 * @returns 힌트 문구 배열
 */
export function getSpeechHints(category: 'it' | 'marketing' | 'finance' | 'company' | 'all' = 'all'): string[] {
  switch (category) {
    case 'it':
      return Object.values(itTerms);
    case 'marketing':
      return Object.values(marketingTerms);
    case 'finance':
      return Object.values(financeTerms);
    case 'company':
      return Object.values(companyNames);
    case 'all':
    default:
      return Object.values(allDictionaries);
  }
}

/**
 * 음성 인식 전 힌트 메시지 생성
 * @param targetCompany 지원 회사
 * @param targetPosition 지원 직무
 * @returns 힌트 메시지
 */
export function generateSpeechHintMessage(targetCompany?: string, targetPosition?: string): string {
  const hints: string[] = [];
  
  if (targetCompany) {
    hints.push(`회사명: ${targetCompany}`);
  }
  
  if (targetPosition) {
    // 직무에 따른 관련 용어 추천
    const position = targetPosition.toLowerCase();
    if (position.includes('개발') || position.includes('엔지니어') || position.includes('프로그래머')) {
      hints.push('IT 용어가 자동으로 인식됩니다 (React, Python, AWS 등)');
    } else if (position.includes('마케팅') || position.includes('기획')) {
      hints.push('마케팅 용어가 자동으로 인식됩니다 (KPI, ROI, CTR 등)');
    } else if (position.includes('금융') || position.includes('투자') || position.includes('회계')) {
      hints.push('금융 용어가 자동으로 인식됩니다 (IPO, M&A, EBITDA 등)');
    }
  }
  
  return hints.length > 0 
    ? `💡 음성 인식 힌트: ${hints.join(' | ')}`
    : '💡 전문 용어와 기업명이 자동으로 인식됩니다';
}
