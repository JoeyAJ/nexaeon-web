import { createApiResponse } from '../../api/_response.js';

export const FALLBACK_LITERATURE_DATA = [
  {
    id: 'tam-ai-tutor-acceptance',
    title: 'TAM and AI Education Acceptance',
    authors: ['Davis', 'Venkatesh', 'AI Education Research Stream'],
    year: '1989-2026',
    theoryModels: ['TAM', 'Perceived Usefulness', 'Perceived Ease of Use'],
    researchMethod: 'Survey-based acceptance modeling',
    variables: ['Perceived usefulness', 'Perceived ease of use', 'Attitude', 'Behavioral intention'],
    summaryZh: 'TAM 可用於分析學生是否認為 AI Tutor 有用、容易使用，並進一步影響其使用態度與使用意圖。',
    summaryKo: 'TAM은 학생들이 AI 튜터를 유용하고 사용하기 쉽다고 인식하는지, 그리고 그것이 사용 태도와 의도에 어떤 영향을 주는지 분석하는 데 활용된다.',
    summaryEn: 'TAM helps analyze whether learners perceive AI tutors as useful and easy to use, and how those perceptions shape attitude and behavioral intention.',
    usage: 'Doctoral model foundation / survey construct design',
    status: 'fallback-ready',
    sourceType: 'fallback-literature',
    sourceUrl: '/api/research/literature',
    updatedAt: '2026-06-02',
  },
  {
    id: 'vark-learning-preferences',
    title: 'VARK Learning Preference',
    authors: ['Fleming', 'AI Tutoring Design Research Stream'],
    year: '1992-2026',
    theoryModels: ['VARK', 'Learning Preference Model'],
    researchMethod: 'Learner profile mapping',
    variables: ['Visual preference', 'Aural preference', 'Read/write preference', 'Kinesthetic preference'],
    summaryZh: 'VARK 可用於描述學生在不同學習形式上的偏好，協助 AI Tutor 調整提示、例子、回饋與學習路徑。',
    summaryKo: 'VARK는 학습자의 학습 형식 선호를 설명하고 AI 튜터의 힌트, 예시, 피드백, 학습 경로 조정에 활용된다.',
    summaryEn: 'VARK describes learner preferences across modes and helps AI tutors adapt hints, examples, feedback, and learning paths.',
    usage: 'Personalization variable / learner profile design',
    status: 'fallback-ready',
    sourceType: 'fallback-literature',
    sourceUrl: '/api/research/literature',
    updatedAt: '2026-06-02',
  },
  {
    id: 'srl-ai-tutor-autonomy',
    title: 'AI Tutor and Self-Regulated Learning',
    authors: ['Zimmerman', 'Pintrich', 'AI Tutor Autonomy Research Stream'],
    year: '2000-2026',
    theoryModels: ['SRL', 'Learner Autonomy'],
    researchMethod: 'Learning process and reflection analysis',
    variables: ['Goal setting', 'Strategy use', 'Monitoring', 'Behavior adjustment', 'Reflection'],
    summaryZh: 'SRL 支援分析 AI Tutor 是否能幫助學生設定目標、監控學習、調整策略並形成更強的自主學習能力。',
    summaryKo: 'SRL은 AI 튜터가 학생의 목표 설정, 학습 점검, 전략 조정, 자기주도 학습 능력 향상에 기여하는지 분석하는 기반이다.',
    summaryEn: 'SRL supports analysis of whether AI tutors help learners set goals, monitor progress, adjust strategies, and strengthen autonomy.',
    usage: 'Learner autonomy construct / reflection task design',
    status: 'fallback-ready',
    sourceType: 'fallback-literature',
    sourceUrl: '/api/research/literature',
    updatedAt: '2026-06-02',
  },
  {
    id: 'ai-tutor-personalization',
    title: 'AI Tutor Personalization',
    authors: ['Intelligent Tutoring Systems Research Stream', 'Generative AI Education Research Stream'],
    year: '2010-2026',
    theoryModels: ['Personalized Learning', 'AI Tutoring', 'Adaptive Feedback'],
    researchMethod: 'Prototype testing and interaction-log analysis',
    variables: ['Feedback relevance', 'Task fit', 'Prompt quality', 'Learner profile', 'Adaptive support'],
    summaryZh: 'AI Tutor Personalization 關注系統如何依學生程度、任務目標與學習偏好提供分層提示與可行動回饋。',
    summaryKo: 'AI Tutor Personalization은 학생 수준, 과제 목표, 학습 선호에 따라 계층형 힌트와 실행 가능한 피드백을 제공하는 방식을 다룬다.',
    summaryEn: 'AI Tutor Personalization examines how systems provide layered hints and actionable feedback based on learner level, task goals, and preferences.',
    usage: 'MVP feature logic / interaction data design',
    status: 'fallback-ready',
    sourceType: 'fallback-literature',
    sourceUrl: '/api/research/literature',
    updatedAt: '2026-06-02',
  },
  {
    id: 'learning-engagement-satisfaction',
    title: 'Learning Engagement and Continuance Intention',
    authors: ['Educational Engagement Research Stream', 'Learning Satisfaction Research Stream'],
    year: '2004-2026',
    theoryModels: ['Learning Engagement', 'Learning Satisfaction', 'Continuance Intention'],
    researchMethod: 'Questionnaire and learning-outcome analysis',
    variables: ['Behavioral engagement', 'Emotional engagement', 'Cognitive engagement', 'Satisfaction', 'Continuance intention'],
    summaryZh: '學習參與度與滿意度可連接 AI Tutor 的互動品質、學生投入、學習成果與長期持續使用意圖。',
    summaryKo: '학습 참여도와 만족도는 AI 튜터의 상호작용 품질, 학생 몰입, 학습 성과, 장기 지속 사용 의도를 연결한다.',
    summaryEn: 'Learning engagement and satisfaction connect AI tutor interaction quality, learner involvement, learning outcomes, and long-term continuance intention.',
    usage: 'Outcome measurement / doctoral questionnaire design',
    status: 'fallback-ready',
    sourceType: 'fallback-literature',
    sourceUrl: '/api/research/literature',
    updatedAt: '2026-06-02',
  },
];

export const LITERATURE_STATUS_TEXT = {
  notion: {
    sourceZh: '資料來源：Notion 研究文獻庫',
    sourceKo: '데이터 출처: Notion 연구 문헌 데이터베이스',
    sourceEn: 'Data Source: Notion Research Literature Database',
    connectionZh: '連接狀態：已連接真實資料源',
    connectionKo: '연결 상태: 실제 데이터 소스 연결 완료',
    connectionEn: 'Connection Status: Live data source connected',
  },
  fallback: {
    sourceZh: '資料來源：Fallback Literature Data',
    sourceKo: '데이터 출처: Fallback Literature Data',
    sourceEn: 'Data Source: Fallback Literature Data',
    connectionZh: '連接狀態：尚未連接 Notion，正在使用本地備用資料',
    connectionKo: '연결 상태: Notion 미연결, 로컬 예비 데이터 사용 중',
    connectionEn: 'Connection Status: Notion not connected, using local backup data',
  },
};

export const LITERATURE_UI = {
  zh: {
    title: '研究文獻資料庫',
    authorsYear: '作者與年份',
    theoryModels: '對應理論模型',
    researchMethod: '研究方法',
    variables: '關鍵變數',
    summary: '三語摘要',
    usage: '使用目的',
    status: '狀態',
    sourceType: '資料來源',
    updatedAt: '更新時間',
  },
  ko: {
    title: '연구 문헌 데이터베이스',
    authorsYear: '저자 및 연도',
    theoryModels: '대응 이론 모델',
    researchMethod: '연구 방법',
    variables: '핵심 변수',
    summary: '다국어 요약',
    usage: '사용 목적',
    status: '상태',
    sourceType: '데이터 출처',
    updatedAt: '업데이트 시간',
  },
  en: {
    title: 'Research Literature Database',
    authorsYear: 'Authors & Year',
    theoryModels: 'Theory Models',
    researchMethod: 'Research Method',
    variables: 'Key Variables',
    summary: 'Multilingual Summary',
    usage: 'Usage',
    status: 'Status',
    sourceType: 'Data Source',
    updatedAt: 'Updated At',
  },
};

export function getLiteratureSummary(item, lang = 'zh') {
  if (typeof item.summary === 'string') return item.summary;
  if (item.summary && typeof item.summary === 'object') {
    return item.summary[lang] || item.summary.zh || item.summary.en || item.summary.ko || '';
  }
  if (lang === 'ko') return item.summaryKo;
  if (lang === 'en') return item.summaryEn;
  return item.summaryZh;
}

export function getLiteratureStatusText(source = 'fallback', lang = 'zh') {
  const status = LITERATURE_STATUS_TEXT[source] || LITERATURE_STATUS_TEXT.fallback;
  const suffix = lang === 'ko' ? 'Ko' : lang === 'en' ? 'En' : 'Zh';

  return {
    source: status[`source${suffix}`],
    connection: status[`connection${suffix}`],
  };
}

export function createFallbackLiteratureResponse(reason = 'upstream_failed') {
  const data = FALLBACK_LITERATURE_DATA.map((item) => ({
    ...item,
    summary: {
      zh: item.summaryZh,
      ko: item.summaryKo,
      en: item.summaryEn,
    },
  }));

  return createApiResponse({
    source: 'fallback',
    reason,
    items: data,
  });
}
