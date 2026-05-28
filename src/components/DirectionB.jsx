import { useMemo, useRef, useState, useEffect } from 'react';
import { NexLogo, NexWordmark, LangSwitcher, ArrowIcon } from './Logo.jsx';
import { INTERACTIVE_CONTENT } from '../constants/interactiveData.js';
import {
  getKnowledgeItems,
  getProjectItems,
  getResearchItems,
} from '../lib/contentSource.js';
import { toDetailPath } from '../utils/router.js';

const UI_TEXT = {
  zh: {
    quickPreview: '快速預覽',
    viewDetail: '查看詳情',
    allCategory: '全部',
    detailDescriptionLabel: '詳細說明',
  },
  en: {
    quickPreview: 'Quick Preview',
    viewDetail: 'View Details',
    allCategory: 'All',
    detailDescriptionLabel: 'Description',
  },
  ko: {
    quickPreview: '빠른 미리보기',
    viewDetail: '상세 보기',
    allCategory: '전체',
    detailDescriptionLabel: '상세 설명',
  },
};

const CORE_INTERACTION_CONTENT = {
  zh: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: '核心模組入口',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: '以學習診斷與分層回覆設計可持續迭代的 AI 助教能力。',
          status: 'Prototype',
          purpose: '支援提問理解、回覆結構化與可追蹤的學習回饋。',
          stage: '原型測試中',
          future: '接入學習歷程記憶、難度調節與教師協作面板。',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: '集中管理研究主題、方法路徑與驗證進度的研究中台。',
          status: 'Active',
          purpose: '把研究方向轉為可追蹤節點，便於對外展示與內部迭代。',
          stage: '主結構已上線',
          future: '擴充研究問題圖譜與跨專案證據鏈結。',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: '可搜尋、可分類、可累積的知識節點系統。',
          status: 'Active',
          purpose: '支援研究筆記沉澱、快速檢索與主題再利用。',
          stage: '內容持續更新',
          future: '新增多來源同步與知識節點關聯視圖。',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: '串連研究假設到產品原型的專案實驗工作室。',
          status: 'Coming Soon',
          purpose: '管理專案節奏、設計取捨與里程碑復盤。',
          stage: '流程設計中',
          future: '接入任務追蹤、風險看板與自動彙整報告。',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: '研究互動卡片',
      hint: '點擊卡片即可切換說明',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: '建立可因應學習者程度與節奏的對話策略，讓每次回應都能導向可執行下一步。',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: '聚焦 AI 重新定義教學流程、評量邏輯與課堂互動模式的可行框架。',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: '把學習行為、反思深度與參與品質轉為可追蹤指標，支撐教學決策。',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: '探索教師、學生與 AI 的協作邊界，建立兼顧效率與人本價值的設計原則。',
        },
      ],
    },
  },
  en: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: 'Core Module Entry',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: 'Builds an iteratable AI tutoring capability through learner diagnosis and layered responses.',
          status: 'Prototype',
          purpose: 'Supports question understanding, structured replies, and trackable learning feedback.',
          stage: 'Prototype validation in progress',
          future: 'Add learning-memory context, adaptive difficulty, and teacher collaboration tools.',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: 'A central layer for managing research themes, method tracks, and validation progress.',
          status: 'Active',
          purpose: 'Turns research directions into trackable nodes for public clarity and internal iteration.',
          stage: 'Core structure is live',
          future: 'Expand question maps and cross-project evidence linking.',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: 'A searchable, classifiable, and cumulative knowledge node system.',
          status: 'Active',
          purpose: 'Supports note retention, fast retrieval, and cross-topic reuse.',
          stage: 'Continuously updated',
          future: 'Add multi-source sync and relationship views across knowledge nodes.',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: 'An experiment studio connecting research hypotheses to product prototypes.',
          status: 'Coming Soon',
          purpose: 'Manages project cadence, design trade-offs, and milestone retrospectives.',
          stage: 'Workflow design phase',
          future: 'Integrate task tracking, risk boards, and automated summary reports.',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: 'Research Focus Cards',
      hint: 'Click a card to switch the brief',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: 'Design dialogue strategies that adapt to learner level and pace so each response leads to a clear next action.',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: 'Defines practical frameworks for redesigning teaching flow, assessment logic, and classroom interaction with AI.',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: 'Converts behavior signals, reflection depth, and engagement quality into actionable teaching metrics.',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: 'Explores collaboration boundaries among teachers, learners, and AI with human-centered design principles.',
        },
      ],
    },
  },
  ko: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: '핵심 모듈 입구',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: '학습 진단과 계층형 응답을 기반으로 지속 개선 가능한 AI 튜터 역량을 구축합니다.',
          status: 'Prototype',
          purpose: '질문 이해, 구조화된 응답, 추적 가능한 학습 피드백을 지원합니다.',
          stage: '프로토타입 검증 중',
          future: '학습 이력 메모리, 난이도 조절, 교사 협업 패널을 연동합니다.',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: '연구 주제, 방법 경로, 검증 진행을 통합 관리하는 연구 허브입니다.',
          status: 'Active',
          purpose: '연구 방향을 추적 가능한 노드로 전환해 대외 전달력과 내부 반복을 강화합니다.',
          stage: '핵심 구조 운영 중',
          future: '질문 맵과 프로젝트 간 증거 연결을 확장합니다.',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: '검색·분류·축적이 가능한 지식 노드 시스템입니다.',
          status: 'Active',
          purpose: '연구 노트 축적, 빠른 검색, 주제 간 재활용을 지원합니다.',
          stage: '지속 업데이트 중',
          future: '다중 소스 동기화와 지식 노드 관계 뷰를 추가합니다.',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: '연구 가설을 제품 프로토타입으로 연결하는 프로젝트 실험 스튜디오입니다.',
          status: 'Coming Soon',
          purpose: '프로젝트 리듬, 설계 트레이드오프, 마일스톤 회고를 관리합니다.',
          stage: '프로세스 설계 단계',
          future: '태스크 추적, 리스크 보드, 자동 요약 리포트를 연동합니다.',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: '연구 인터랙션 카드',
      hint: '카드를 클릭하면 설명이 전환됩니다',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: '학습 수준과 속도에 맞춰 대화 전략을 조정해, 모든 응답이 실행 가능한 다음 행동으로 이어지게 합니다.',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: 'AI 기반으로 수업 흐름, 평가 논리, 교실 상호작용을 재설계하는 실전 프레임워크를 구축합니다.',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: '학습 행동 신호, 성찰 깊이, 참여 품질을 추적 지표로 전환해 수업 의사결정을 지원합니다.',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: '교사·학습자·AI의 협업 경계를 탐색하고 인간 중심 원칙을 설계 기준으로 정립합니다.',
        },
      ],
    },
  },
};

const ROLE_NAVIGATOR_CONTENT = {
  zh: {
    eyebrow: 'NexAeon 互動導航',
    title: '選擇你的入口身份',
    subtitle: 'NexAeon Navigator',
    panelWhyLabel: '為什麼需要 NexAeon',
    panelFeaturesLabel: 'NexAeon 可以提供的三個功能',
    roles: [
      {
        id: 'students',
        icon: '◉',
        title: '學生 Students',
        value: '把 AI 變成可持續的學習夥伴，而不是一次性工具。',
        why: 'NexAeon 協助學生進行個別化學習、Prompt 訓練、學習回饋與研究能力提升。',
        features: ['AI Tutor 個別化學習輔助', 'Prompt Engineering 基礎訓練', '學習風格與任務回饋'],
        cta: '探索 AI 學習路徑',
        ctaTarget: 'research',
      },
      {
        id: 'professors',
        icon: '△',
        title: '教授 / 研究者 Professors & Researchers',
        value: '把研究問題、模型與合作提案整理成可展示路徑。',
        why: 'NexAeon 展示 AI 教育、個別化學習、TAM、學習參與度與滿意度研究方向。',
        features: ['AI 教育研究模型展示', '文獻與研究資料庫入口', '跨學科研究合作提案'],
        cta: '查看研究方向',
        ctaTarget: 'research',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: '學校 / 管理者 University Leaders',
        value: '以可視化方式推進校務 AI 轉型與決策節奏。',
        why: 'NexAeon 可作為學校 AI 教育轉型、招生分析、行政自動化與數位創新展示平台。',
        features: ['AI 教育轉型方案', '招生與行政流程自動化', '數據分析與決策輔助'],
        cta: '查看教育創新方案',
        ctaTarget: 'projects',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: '企業 / 合作方 Enterprise Partners',
        value: '把 AI 教育與自動化能力轉成可共創的合作方案。',
        why: 'NexAeon 可以把 AI Agent、ESG、教育科技與自動化流程轉化為合作型解決方案。',
        features: ['AI Agent Prototype', 'ESG × AI 應用方案', '自動化與數據分析工作流'],
        cta: '探索合作可能',
        ctaTarget: 'contact',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey 的第二大腦 Joey’s Second Brain',
        value: '把研究、課程與產品資產整合成同一套知識中樞。',
        why: 'NexAeon 是 Joey 的研究、課程、AI 工具、項目與知識資產管理中心。',
        features: ['研究主題與文獻管理', '課程與教學素材管理', 'AI 項目與 MVP 管理'],
        cta: '進入知識中樞',
        ctaTarget: 'knowledge',
      },
    ],
  },
  en: {
    eyebrow: 'NexAeon Navigator',
    title: 'Choose Your Role',
    subtitle: 'NexAeon Interactive Navigation',
    panelWhyLabel: 'Why This Role Needs NexAeon',
    panelFeaturesLabel: 'Three Capabilities NexAeon Provides',
    roles: [
      {
        id: 'students',
        icon: '◉',
        title: 'Students',
        value: 'Turn AI into an ongoing learning partner, not a one-off tool.',
        why: 'NexAeon helps students with personalized learning, prompt training, learning feedback, and research skill growth.',
        features: ['AI Tutor for personalized support', 'Prompt Engineering foundation training', 'Learning-style and task feedback'],
        cta: 'Explore the AI Learning Path',
        ctaTarget: 'research',
      },
      {
        id: 'professors',
        icon: '△',
        title: 'Professors & Researchers',
        value: 'Show research directions, models, and collaboration opportunities in one flow.',
        why: 'NexAeon presents research directions across AI education, personalized learning, TAM, learning engagement, and satisfaction.',
        features: ['AI education research model showcase', 'Literature and research database gateway', 'Interdisciplinary collaboration proposals'],
        cta: 'View Research Directions',
        ctaTarget: 'research',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: 'University Leaders',
        value: 'Drive AI transformation with clear operational and strategic visibility.',
        why: 'NexAeon can serve as a platform for AI education transformation, admissions analytics, administrative automation, and digital innovation.',
        features: ['AI education transformation plans', 'Admissions and admin process automation', 'Data analytics and decision support'],
        cta: 'View Innovation Plans',
        ctaTarget: 'projects',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: 'Enterprise Partners',
        value: 'Translate AI, ESG, and EdTech ideas into partnership-ready solutions.',
        why: 'NexAeon transforms AI Agents, ESG, educational technology, and automation workflows into collaboration-based solutions.',
        features: ['AI Agent prototype', 'ESG × AI application plan', 'Automation and analytics workflow'],
        cta: 'Explore Partnership Potential',
        ctaTarget: 'contact',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey’s Second Brain',
        value: 'Unify research, courses, and AI projects in one knowledge hub.',
        why: 'NexAeon is Joey’s management center for research, courses, AI tools, projects, and long-term knowledge assets.',
        features: ['Research themes and literature management', 'Course and teaching material management', 'AI project and MVP management'],
        cta: 'Enter the Knowledge Hub',
        ctaTarget: 'knowledge',
      },
    ],
  },
  ko: {
    eyebrow: 'NexAeon 인터랙션 내비게이터',
    title: '당신의 역할로 시작하세요',
    subtitle: 'NexAeon Navigator',
    panelWhyLabel: '왜 NexAeon이 필요한가',
    panelFeaturesLabel: 'NexAeon이 제공하는 3가지 기능',
    roles: [
      {
        id: 'students',
        icon: '◉',
        title: '학생 Students',
        value: 'AI를 일회성 도구가 아닌 지속형 학습 파트너로 만듭니다.',
        why: 'NexAeon은 학생의 개인화 학습, 프롬프트 훈련, 학습 피드백, 연구 역량 향상을 지원합니다.',
        features: ['AI Tutor 개인화 학습 보조', 'Prompt Engineering 기초 훈련', '학습 스타일 및 과제 피드백'],
        cta: 'AI 학습 경로 탐색',
        ctaTarget: 'research',
      },
      {
        id: 'professors',
        icon: '△',
        title: '교수 / 연구자 Professors & Researchers',
        value: '연구 모델과 협업 제안을 한 흐름으로 보여줍니다.',
        why: 'NexAeon은 AI 교육, 개인화 학습, TAM, 학습 참여도와 만족도 연구 방향을 제시합니다.',
        features: ['AI 교육 연구 모델 전시', '문헌 및 연구 데이터베이스 진입', '융합 연구 협업 제안'],
        cta: '연구 방향 보기',
        ctaTarget: 'research',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: '학교 / 관리자 University Leaders',
        value: 'AI 전환 전략을 운영 데이터와 함께 명확하게 시각화합니다.',
        why: 'NexAeon은 학교의 AI 교육 전환, 입학 분석, 행정 자동화, 디지털 혁신을 보여주는 플랫폼으로 활용됩니다.',
        features: ['AI 교육 전환 솔루션', '입학 및 행정 프로세스 자동화', '데이터 분석 및 의사결정 지원'],
        cta: '교육 혁신안 보기',
        ctaTarget: 'projects',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: '기업 / 파트너 Enterprise Partners',
        value: 'AI Agent, ESG, EdTech 역량을 협력형 솔루션으로 전환합니다.',
        why: 'NexAeon은 AI Agent, ESG, 교육기술, 자동화 흐름을 실제 협업 솔루션으로 연결합니다.',
        features: ['AI Agent Prototype', 'ESG × AI 적용안', '자동화 및 데이터 분석 워크플로'],
        cta: '협업 가능성 탐색',
        ctaTarget: 'contact',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey의 두 번째 뇌 Joey’s Second Brain',
        value: '연구, 수업, AI 프로젝트 자산을 하나의 지식 허브로 통합합니다.',
        why: 'NexAeon은 Joey의 연구, 수업, AI 도구, 프로젝트, 지식 자산을 관리하는 중심 플랫폼입니다.',
        features: ['연구 주제 및 문헌 관리', '수업 및 교육 자료 관리', 'AI 프로젝트 및 MVP 관리'],
        cta: '지식 허브로 이동',
        ctaTarget: 'knowledge',
      },
    ],
  },
};

const CAPABILITY_MAP_CONTENT = {
  zh: {
    eyebrow: '功能模組地圖',
    title: 'Capability Map',
    tabs: [
      {
        id: 'research',
        label: 'Research 研究',
        cards: [
          { title: 'AI Tutoring Research', summary: '個別化 AI 輔學模型與研究方法設計。' },
          { title: 'TAM / Learning Engagement Model', summary: '科技接受與學習參與度的分析框架。' },
          { title: 'Literature Knowledge Base', summary: '研究文獻、理論框架與證據節點管理。' },
        ],
      },
      {
        id: 'education',
        label: 'Education 教育',
        cards: [
          { title: 'Prompt Engineering Course', summary: '從基礎到應用的教學型 Prompt 訓練。' },
          { title: 'AI Learning Coach', summary: '以任務導向提供學習節奏與策略建議。' },
          { title: 'Personalized Feedback System', summary: '依學習風格與成果提供可行動回饋。' },
        ],
      },
      {
        id: 'automation',
        label: 'Automation 自動化',
        cards: [
          { title: 'n8n Workflow', summary: '串接任務流程與重複性作業自動化。' },
          { title: 'Notion / Airtable Knowledge Pipeline', summary: '知識資料收集、整理、同步的一致化管線。' },
          { title: 'Admissions & Admin Automation', summary: '招生與行政流程的智能化與效率提升。' },
        ],
      },
      {
        id: 'collaboration',
        label: 'Collaboration 合作',
        cards: [
          { title: 'University AI Transformation', summary: '學校場域 AI 轉型與導入路徑設計。' },
          { title: 'Enterprise AI Solution', summary: '企業合作型 AI 解決方案與原型共創。' },
          { title: 'ESG × AI Project', summary: '以 ESG 場景結合 AI 的跨域合作計畫。' },
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Capability Map',
    title: 'Functional Modules by Category',
    tabs: [
      {
        id: 'research',
        label: 'Research',
        cards: [
          { title: 'AI Tutoring Research', summary: 'Designs methods and models for personalized AI tutoring studies.' },
          { title: 'TAM / Learning Engagement Model', summary: 'Maps technology acceptance and learning engagement indicators.' },
          { title: 'Literature Knowledge Base', summary: 'Organizes literature, frameworks, and evidence nodes for research.' },
        ],
      },
      {
        id: 'education',
        label: 'Education',
        cards: [
          { title: 'Prompt Engineering Course', summary: 'Builds prompt skills from foundational principles to classroom practice.' },
          { title: 'AI Learning Coach', summary: 'Guides learner pace and strategy through goal-based coaching.' },
          { title: 'Personalized Feedback System', summary: 'Provides actionable feedback by learning style and task outcomes.' },
        ],
      },
      {
        id: 'automation',
        label: 'Automation',
        cards: [
          { title: 'n8n Workflow', summary: 'Automates repeatable flows and connective operations across tools.' },
          { title: 'Notion / Airtable Knowledge Pipeline', summary: 'Maintains a consistent pipeline for collecting and syncing knowledge assets.' },
          { title: 'Admissions & Admin Automation', summary: 'Improves admissions and administrative productivity with AI workflows.' },
        ],
      },
      {
        id: 'collaboration',
        label: 'Collaboration',
        cards: [
          { title: 'University AI Transformation', summary: 'Plans and executes AI transformation pathways for universities.' },
          { title: 'Enterprise AI Solution', summary: 'Co-builds practical AI solutions with enterprise partners.' },
          { title: 'ESG × AI Project', summary: 'Shapes cross-domain ESG initiatives powered by AI.' },
        ],
      },
    ],
  },
  ko: {
    eyebrow: '기능 모듈 맵',
    title: 'Capability Map',
    tabs: [
      {
        id: 'research',
        label: 'Research 연구',
        cards: [
          { title: 'AI Tutoring Research', summary: '개인화 AI 튜터링 연구 모델과 방법론을 설계합니다.' },
          { title: 'TAM / Learning Engagement Model', summary: '기술수용과 학습 참여도를 연결한 분석 모델을 구축합니다.' },
          { title: 'Literature Knowledge Base', summary: '문헌, 이론 프레임, 근거 노드를 체계적으로 관리합니다.' },
        ],
      },
      {
        id: 'education',
        label: 'Education 교육',
        cards: [
          { title: 'Prompt Engineering Course', summary: '기초부터 실전까지 이어지는 교육형 프롬프트 코스입니다.' },
          { title: 'AI Learning Coach', summary: '목표 기반 학습 코칭으로 학습 전략과 페이스를 안내합니다.' },
          { title: 'Personalized Feedback System', summary: '학습 스타일과 과제 결과에 맞춘 실행형 피드백을 제공합니다.' },
        ],
      },
      {
        id: 'automation',
        label: 'Automation 자동화',
        cards: [
          { title: 'n8n Workflow', summary: '반복 업무와 도구 간 연동 흐름을 자동화합니다.' },
          { title: 'Notion / Airtable Knowledge Pipeline', summary: '지식 자산 수집·정리·동기화를 일관된 파이프라인으로 운영합니다.' },
          { title: 'Admissions & Admin Automation', summary: '입학 및 행정 프로세스를 지능화해 효율을 높입니다.' },
        ],
      },
      {
        id: 'collaboration',
        label: 'Collaboration 협업',
        cards: [
          { title: 'University AI Transformation', summary: '대학의 AI 전환 전략과 도입 경로를 설계합니다.' },
          { title: 'Enterprise AI Solution', summary: '기업 파트너와 실전형 AI 솔루션을 공동 설계합니다.' },
          { title: 'ESG × AI Project', summary: 'AI를 접목한 ESG 협력 프로젝트를 기획·실행합니다.' },
        ],
      },
    ],
  },
};

function renderMetaLabel(label) {
  if (!label.includes('№')) return label;
  const [left, ...rest] = label.split('№');
  const right = rest.join('№');
  return (
    <>
      {left}
      <span
        style={{
          fontSize: '1em',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: '0.1em',
          opacity: 0.9,
          margin: '0 0.02em',
        }}
      >
        No.
      </span>
      {right}
    </>
  );
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createDetailItem(item, locale) {
  return {
    title: item.title,
    subtitle: item.subtitle || '',
    summary: item.summary || item.subtitle || item.description || '',
    description: item.description || item.details || '',
    category: item.category || '',
    type: item.type || '',
    status: item.status || locale.common.detailFallback.status,
    nextAction: item.nextStep || item.nextAction || locale.common.detailFallback.nextAction,
    link: item.link || '',
    tags: item.tags || [],
  };
}

function DetailModal({ detail, locale, uiText, onClose }) {
  if (!detail) return null;

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div
        className="detail-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>{detail.title}</div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 14px' }}>
            {locale.common.close}
          </button>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          {detail.subtitle ? (
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.subtitle}</div>
          ) : null}
          {(detail.category || detail.type) ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detail.category ? <span className="content-tag">{detail.category}</span> : null}
              {detail.type ? <span className="content-tag">{detail.type}</span> : null}
            </div>
          ) : null}
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.summaryLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.summary}</div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.statusLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.status}</div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.nextActionLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.nextAction}</div>
          </div>
          {detail.description ? (
            <div>
              <div className="label" style={{ marginBottom: 4 }}>
                {uiText.detailDescriptionLabel}
              </div>
              <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.description}</div>
            </div>
          ) : null}
          {detail.tags.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {detail.tags.map((tag) => (
                <span key={tag} className="content-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {detail.link ? (
          <a href={detail.link} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginTop: 20 }}>
            {locale.common.externalLink}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function NeuralBackground() {
  return (
    <div className="neural-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="neural-orbits">
          <path d="M-120 470 C 160 260, 510 240, 860 310 C 1160 370, 1500 340, 1620 210" />
          <path d="M-80 730 C 290 580, 690 510, 1100 620 C 1320 680, 1520 720, 1630 610" />
          <path d="M150 120 C 420 200, 700 360, 980 320 C 1230 280, 1430 190, 1620 120" />
          <path d="M10 840 C 320 760, 620 720, 880 760 C 1170 810, 1390 860, 1620 800" />
          <path d="M260 70 C 490 280, 560 560, 470 850" />
          <path d="M1130 50 C 1240 250, 1240 520, 1080 850" />
          <path d="M-120 210 C 140 180, 390 260, 580 470 C 770 680, 1060 760, 1540 760" />
        </g>

        <g className="neural-nodes">
          <circle cx="120" cy="420" r="4" />
          <circle cx="420" cy="260" r="4" />
          <circle cx="630" cy="540" r="5" />
          <circle cx="900" cy="250" r="5" />
          <circle cx="1120" cy="510" r="4" />
          <circle cx="1310" cy="350" r="4" />
          <circle cx="1360" cy="690" r="5" />
          <circle cx="1050" cy="760" r="4" />
          <circle cx="720" cy="760" r="4" />
          <circle cx="450" cy="690" r="4" />
          <circle cx="230" cy="610" r="4" />
          <circle cx="70" cy="770" r="3.5" />
          <circle cx="980" cy="110" r="4" />
        </g>
      </svg>
    </div>
  );
}

function Nav({ locale, lang, setLang, theme, setTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileMenuOpen(false);
      }
    };

    closeOnResize();
    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  const handleNavClick = (id) => {
    scrollToSection(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--bg-0) 75%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <button
          onClick={() => {
            scrollToSection('home');
            setIsMobileMenuOpen(false);
          }}
          aria-label="Back to home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
          }}
        >
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </button>

        <div
          className="nav-links"
          style={{
            display: isMobileMenuOpen ? 'flex' : undefined,
            alignItems: 'center',
            gap: 26,
            fontSize: 14,
            color: 'var(--fg-2)',
            fontWeight: 400,
          }}
        >
          {locale.navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'var(--font-sans)',
                padding: 0,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: '1px solid var(--line-2)',
              borderRadius: 999,
              padding: '5px 12px',
              cursor: 'pointer',
              color: 'var(--fg-3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
            }}
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? '×' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function HeroCenterpiece() {
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, []);

  return (
    <div
      className="hero-centerpiece"
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -20,
        marginBottom: 80,
        height: 500,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 480,
          background:
            'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(91,61,214,0.28) 30%, transparent 65%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          width: 420,
          height: 40,
          background: 'radial-gradient(ellipse, rgba(40,20,90,0.6) 0%, transparent 70%)',
          filter: 'blur(14px)',
          transform: 'rotateX(70deg)',
        }}
      />

      <video
        ref={videoRef}
        src="/assets/nexaeon-hero-v1.3.mov"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        style={{
          position: 'absolute',
          zIndex: 2,
          height: 460,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter:
            'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.4))',
          opacity: ended ? 0 : 1,
          transition: 'opacity 800ms ease',
          pointerEvents: ended ? 'none' : 'auto',
        }}
      />

      <img
        src="/assets/nexaeon-eye.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          zIndex: 3,
          height: 380,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter:
            'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.45))',
          opacity: ended ? 1 : 0,
          transform: ended ? 'scale(1)' : 'scale(0.94)',
          transition:
            'opacity 900ms ease 120ms, transform 1200ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function Hero({ t }) {
  return (
    <section id="home" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div
        className="hero-padding"
        style={{ textAlign: 'center', padding: '120px 32px 80px', position: 'relative', zIndex: 2 }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            border: '2px double var(--line-2)',
            background: 'var(--bg-1)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--fg-2)',
            marginBottom: 32,
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-violet)',
              boxShadow: '0 0 10px var(--accent-violet)',
            }}
          />
          {t.hero.eyebrow}
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(72px, 11vw, 176px)',
            lineHeight: 0.92,
            margin: 0,
            fontWeight: 400,
            letterSpacing: '-0.035em',
          }}
        >
          {t.hero.titleSerif}
        </h1>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(24px, 3.2vw, 48px)',
            color: 'var(--fg-2)',
            marginTop: 8,
            fontWeight: 400,
          }}
        >
          {t.hero.titleSerifSub}{' '}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontStyle: 'normal',
              fontWeight: 300,
              color: 'var(--fg-3)',
            }}
          >
            — {t.hero.titleSans}
          </span>
        </div>

        <p
          className="hero-sub"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 300,
            fontSize: 18,
            color: 'var(--fg-2)',
            maxWidth: 620,
            margin: '40px auto 0',
            whiteSpace: 'pre-line',
            lineHeight: 1.65,
          }}
        >
          {t.hero.sub}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48 }}>
          <button
            className="btn btn-gradient"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('modules')}
          >
            {t.hero.cta1} <ArrowIcon />
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('research')}
          >
            {t.hero.cta2}
          </button>
        </div>
      </div>

      <HeroCenterpiece />

      <div
        className="container meta-strip"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
          paddingBottom: 48,
        }}
      >
        {t.hero.meta.map((m, i) => (
          <span key={i}>{renderMetaLabel(m)}</span>
        ))}
      </div>
    </section>
  );
}

function RoleNavigatorSection({ content }) {
  const [activeRoleId, setActiveRoleId] = useState(content.roles[0]?.id || '');
  const activeRole = content.roles.find((role) => role.id === activeRoleId) || content.roles[0];

  return (
    <section id="navigator" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {content.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(36px, 4.6vw, 62px)',
            lineHeight: 1.08,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {content.title}
        </h2>
        <div style={{ marginTop: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>
          {content.subtitle}
        </div>
      </div>

      <div
        className="container navigator-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginTop: 36 }}
      >
        {content.roles.map((role) => {
          const isActive = role.id === activeRole?.id;
          return (
            <button
              key={role.id}
              className="navigator-card"
              onClick={() => setActiveRoleId(role.id)}
              style={{
                textAlign: 'left',
                borderRadius: 16,
                border: '1px solid ' + (isActive ? 'var(--fg-2)' : 'var(--line-1)'),
                background: isActive ? 'var(--bg-2)' : 'var(--bg-1)',
                color: 'var(--fg-1)',
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.28s var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-fg)' }}>{role.icon}</span>
                <span className="label" style={{ letterSpacing: '0.08em', color: isActive ? 'var(--fg-2)' : 'var(--fg-3)' }}>
                  {isActive ? 'ACTIVE' : 'ROLE'}
                </span>
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.25 }}>{role.title}</div>
              <p style={{ margin: '10px 0 0', color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 14 }}>{role.value}</p>
            </button>
          );
        })}
      </div>

      {activeRole ? (
        <div className="container" style={{ marginTop: 18 }}>
          <div
            key={activeRole.id}
            className="panel-switch-in"
            style={{
              borderRadius: 18,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: '22px clamp(16px, 3vw, 26px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.2 }}>{activeRole.title}</div>
              <button className="btn btn-gradient" style={{ padding: '10px 16px', fontSize: 14 }} onClick={() => scrollToSection(activeRole.ctaTarget || 'contact')}>
                {activeRole.cta}
              </button>
            </div>

            <div className="navigator-panel-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 16 }}>
              <div>
                <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 8 }}>
                  {content.panelWhyLabel}
                </div>
                <div style={{ color: 'var(--fg-2)', lineHeight: 1.72 }}>{activeRole.why}</div>
              </div>
              <div>
                <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 8 }}>
                  {content.panelFeaturesLabel}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--fg-2)', lineHeight: 1.75 }}>
                  {activeRole.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CapabilityMapSection({ content }) {
  const [activeTabId, setActiveTabId] = useState(content.tabs[0]?.id || '');
  const activeTab = content.tabs.find((tab) => tab.id === activeTabId) || content.tabs[0];

  return (
    <section id="capability" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {content.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(36px, 4.5vw, 62px)',
            lineHeight: 1.08,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {content.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 34 }}>
        <div className="capability-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {content.tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className="capability-tab"
                style={{
                  borderRadius: 999,
                  border: '1px solid ' + (isActive ? 'var(--fg-1)' : 'var(--line-2)'),
                  background: isActive ? 'var(--fg-1)' : 'transparent',
                  color: isActive ? 'var(--bg-0)' : 'var(--fg-2)',
                  padding: '9px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.25s var(--ease-out)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab ? (
          <div
            key={activeTab.id}
            className="panel-switch-in capability-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 20 }}
          >
            {activeTab.cards.map((card) => (
              <article
                key={card.title}
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--line-1)',
                  background: 'var(--bg-1)',
                  padding: 18,
                  minHeight: 140,
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.24 }}>{card.title}</div>
                <p style={{ margin: '10px 0 0', color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.65 }}>{card.summary}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ModulesSection({ content, onOpenDetail }) {
  return (
    <section id="modules" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {content.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {content.title}
        </h2>
      </div>

      <div className="container grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 56 }}>
        {content.cards.map((card) => (
          <button
            key={card.id}
            onClick={() =>
              onOpenDetail({
                title: card.title,
                subtitle: card.summary,
                summary: card.purpose,
                status: card.status,
                nextAction: card.future,
                description: card.stage,
                category: content.eyebrow,
                type: 'Module',
                tags: [],
              })
            }
            style={{
              textAlign: 'left',
              borderRadius: 18,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: 18,
              color: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.25s var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.25 }}>{card.title}</div>
              <span className="content-tag">{card.status}</span>
            </div>
            <p style={{ margin: '12px 0 0', color: 'var(--fg-2)', lineHeight: 1.65, fontSize: 14 }}>{card.summary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResearchDirectionsSection({ locale, items, onOpenDetail, navigate, uiText, researchFocusContent }) {
  const [activeFocusId, setActiveFocusId] = useState(researchFocusContent.cards[0]?.id || '');
  const activeFocus =
    researchFocusContent.cards.find((card) => card.id === activeFocusId) || researchFocusContent.cards[0];

  return (
    <section id="research" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.research.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.research.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 40 }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 14 }}>
          — {researchFocusContent.eyebrow}
        </div>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {researchFocusContent.cards.map((card) => {
            const isActive = card.id === activeFocus?.id;
            return (
              <button
                key={card.id}
                onClick={() => setActiveFocusId(card.id)}
                style={{
                  textAlign: 'left',
                  borderRadius: 14,
                  border: '1px solid ' + (isActive ? 'var(--fg-2)' : 'var(--line-1)'),
                  background: isActive ? 'var(--bg-2)' : 'var(--bg-1)',
                  color: 'var(--fg-1)',
                  padding: 14,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.35 }}>{card.title}</div>
              </button>
            );
          })}
        </div>
        {activeFocus ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: 16,
              color: 'var(--fg-2)',
              lineHeight: 1.7,
            }}
          >
            <div className="label" style={{ marginBottom: 8 }}>{researchFocusContent.hint}</div>
            {activeFocus.description}
          </div>
        ) : null}
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 44 }}>
        {items.map((item) => {
          return (
            <article
              key={item.id}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 24,
                color: 'inherit',
                transition: 'all 0.3s var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>{item.subtitle}</p>
              <p style={{ marginTop: 10, color: 'var(--fg-3)', lineHeight: 1.6, fontSize: 14 }}>{item.summary}</p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '9px 14px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                  {uiText.quickPreview}
                </button>
                <button
                  className="btn btn-gradient"
                  style={{ padding: '9px 14px' }}
                  onClick={() => navigate(toDetailPath('research', item.id))}
                >
                  {uiText.viewDetail}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeSection({ locale, items, onOpenDetail, navigate, uiText }) {
  const [keyword, setKeyword] = useState('');
  const [categoryKey, setCategoryKey] = useState('all');

  const categories = useMemo(() => {
    const keys = Array.from(new Set(items.map((item) => item.category)));
    return [{ key: 'all', label: uiText.allCategory }, ...keys.map((category) => ({ key: category, label: category }))];
  }, [items, uiText.allCategory]);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatched = categoryKey === 'all' || item.category === categoryKey;
      if (!categoryMatched) return false;
      if (!lower) return true;
      return `${item.title} ${item.subtitle} ${item.summary} ${item.tags.join(' ')} ${item.category}`
        .toLowerCase()
        .includes(lower);
    });
  }, [categoryKey, items, keyword]);

  return (
    <section id="knowledge" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.knowledge.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.knowledge.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={locale.knowledge.searchPlaceholder}
            style={{
              width: '100%',
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              borderRadius: 14,
              padding: '12px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((item) => (
              <button
                key={item.key}
                onClick={() => setCategoryKey(item.key)}
                style={{
                  borderRadius: 999,
                  border: '1px solid ' + (categoryKey === item.key ? 'var(--fg-1)' : 'var(--line-2)'),
                  background: categoryKey === item.key ? 'var(--fg-1)' : 'transparent',
                  color: categoryKey === item.key ? 'var(--bg-0)' : 'var(--fg-2)',
                  padding: '8px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ border: '1px solid var(--line-1)', borderRadius: 16, padding: 20, color: 'var(--fg-3)' }}>
              {locale.knowledge.noResults}
            </div>
          ) : (
            filtered.map((item) => (
              <article
                key={item.id}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  border: '1px solid var(--line-1)',
                  background: 'var(--bg-1)',
                  padding: 20,
                  color: 'inherit',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.25 }}>{item.title}</div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--accent-fg)',
                  }}
                >
                  {item.category}
                </div>
                <div style={{ marginTop: 12, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.6 }}>{item.subtitle}</div>
                <div style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 13 }}>{item.tags.join(' · ')}</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                    {uiText.quickPreview}
                  </button>
                  <button
                    className="btn btn-gradient"
                    style={{ padding: '8px 12px' }}
                    onClick={() => navigate(toDetailPath('knowledge', item.id))}
                  >
                    {uiText.viewDetail}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection({ locale, items, onOpenDetail, navigate, uiText }) {
  return (
    <section id="projects" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.projects.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.projects.title}
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 60 }}>
        {items.map((item) => {
          return (
            <article
              key={item.id}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 22,
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{item.subtitle}</p>
              <p style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 14, lineHeight: 1.6 }}>{item.summary}</p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                  {uiText.quickPreview}
                </button>
                <button
                  className="btn btn-gradient"
                  style={{ padding: '8px 12px' }}
                  onClick={() => navigate(toDetailPath('projects', item.id))}
                >
                  {uiText.viewDetail}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// Internal placeholder for future external data integration.
// Keep this metadata out of visitor-facing UI until backend connectors are active.
const INTERNAL_DATA_LAYER_CONFIG = {
  currentSource: 'Local Static Content',
  futureSource: 'Notion / Airtable / n8n',
  status: 'Ready for Integration',
};

function IntegrationRoadmapSection() {
  const phases = [
    'Phase 1：Local Content Layer',
    'Phase 2：Notion Knowledge Database',
    'Phase 3：Airtable Research / Project Tracker',
    'Phase 4：n8n Auto Sync Workflow',
    'Phase 5：AI Agent / RAG Query Layer',
  ];

  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
            NexAeon Integration Roadmap｜外部接入路線
          </div>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {phases.map((phase) => (
            <article
              key={phase}
              style={{
                borderRadius: 16,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 18,
                color: 'var(--fg-2)',
                lineHeight: 1.7,
              }}
            >
              {phase}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[?？!！.,，。'"“”]/g, '').trim();
}

function AssistantSection({ locale }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: locale.assistant.greeting },
  ]);
  const [input, setInput] = useState('');

  const qaMap = useMemo(() => {
    const map = new Map();
    locale.assistant.qas.forEach((item) => map.set(item.question, item));
    return map;
  }, [locale.assistant.qas]);

  const answerQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const exact = qaMap.get(trimmed);
    const normalizedInput = normalizeText(trimmed);

    const fallbackMatch = locale.assistant.qas.find((item) =>
      item.keywords.some((keyword) => normalizedInput.includes(normalizeText(keyword)))
    );

    const answer = exact?.answer || fallbackMatch?.answer || locale.assistant.fallback;

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: answer },
    ]);
    setInput('');
  };

  return (
    <section id="assistant" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.assistant.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.assistant.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {locale.assistant.qas.map((item) => (
            <button
              key={item.question}
              onClick={() => answerQuestion(item.question)}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              {item.question}
            </button>
          ))}
        </div>

        <div
          style={{
            borderRadius: 20,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 16,
            minHeight: 260,
            maxHeight: 380,
            overflowY: 'auto',
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                marginBottom: 12,
                marginLeft: message.role === 'user' ? 'auto' : 0,
                maxWidth: '80%',
                borderRadius: 14,
                padding: '10px 12px',
                background: message.role === 'user' ? 'var(--gradient-aurora-soft)' : 'var(--bg-2)',
                color: 'var(--fg-1)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <div className="label" style={{ marginBottom: 6, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                {message.role === 'assistant' ? locale.assistant.assistantLabel : locale.assistant.userLabel}
              </div>
              {message.content}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={locale.assistant.inputPlaceholder}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                answerQuestion(input);
              }
            }}
            style={{
              flex: 1,
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              borderRadius: 14,
              padding: '12px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />
          <button className="btn btn-gradient" onClick={() => answerQuestion(input)}>
            {locale.assistant.send}
          </button>
        </div>
      </div>
    </section>
  );
}

function ContactSection({ locale }) {
  const [status, setStatus] = useState('');
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(locale.contact.email);
      setStatus(locale.contact.copySuccessMessage);
    } catch {
      setStatus(locale.contact.copyFallbackMessage);
    }
  };

  return (
    <section id="contact" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.contact.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.contact.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            borderRadius: 24,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 28,
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--fg-2)', lineHeight: 1.7, margin: 0 }}>{locale.contact.description}</p>
          <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', color: 'var(--accent-fg)' }}>
            {locale.contact.email}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`mailto:${locale.contact.email}`} className="btn btn-gradient">
              {locale.contact.mailtoCta}
            </a>
            <button onClick={copyEmail} className="btn btn-ghost">
              {locale.contact.copyCta}
            </button>
          </div>
          {status ? <div style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{status}</div> : null}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }) {
  return (
    <footer style={{ borderTop: '1px solid var(--line-1)', padding: '48px 0 32px', textAlign: 'center' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <NexLogo size={36} />
          <NexWordmark size={22} />
        </div>
        <p style={{ color: 'var(--fg-3)', marginTop: 8, marginBottom: 20, fontSize: 15 }}>{t.footer.tagline}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span>{t.footer.year}</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
}

export default function DirectionB({ t, lang, setLang, theme, setTheme, navigate }) {
  const rootRef = useRef(null);
  const locale = INTERACTIVE_CONTENT[lang] || INTERACTIVE_CONTENT.en;
  const uiText = UI_TEXT[lang] || UI_TEXT.en;
  const interactiveContent = CORE_INTERACTION_CONTENT[lang] || CORE_INTERACTION_CONTENT.en;
  const navigatorContent = ROLE_NAVIGATOR_CONTENT[lang] || ROLE_NAVIGATOR_CONTENT.en;
  const capabilityMapContent = CAPABILITY_MAP_CONTENT[lang] || CAPABILITY_MAP_CONTENT.en;
  const [detail, setDetail] = useState(null);
  const researchItems = useMemo(() => getResearchItems(lang), [lang]);
  const knowledgeItems = useMemo(() => getKnowledgeItems(lang), [lang]);
  const projectItems = useMemo(() => getProjectItems(lang), [lang]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onResize = () => {
      if (window.innerWidth <= 700) {
        el.setAttribute('data-density', 'compact');
      } else {
        el.removeAttribute('data-density');
      }
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div ref={rootRef} className="direction-shell">
      <NeuralBackground />
      <Nav locale={locale} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <RoleNavigatorSection key={`navigator-${lang}`} content={navigatorContent} />
      <CapabilityMapSection key={`capability-${lang}`} content={capabilityMapContent} />
      <ModulesSection key={`modules-${lang}`} content={interactiveContent.modules} onOpenDetail={setDetail} />
      <ResearchDirectionsSection
        key={`research-${lang}`}
        locale={locale}
        items={researchItems}
        onOpenDetail={setDetail}
        navigate={navigate}
        uiText={uiText}
        researchFocusContent={interactiveContent.researchFocus}
      />
      <KnowledgeSection key={`knowledge-${lang}`} locale={locale} items={knowledgeItems} onOpenDetail={setDetail} navigate={navigate} uiText={uiText} />
      <ProjectsSection key={`projects-${lang}`} locale={locale} items={projectItems} onOpenDetail={setDetail} navigate={navigate} uiText={uiText} />
      <IntegrationRoadmapSection />
      <AssistantSection key={`assistant-${lang}`} locale={locale} />
      <ContactSection key={`contact-${lang}`} locale={locale} />
      <Footer t={t} />
      <DetailModal detail={detail} locale={locale} uiText={uiText} onClose={() => setDetail(null)} />
    </div>
  );
}
