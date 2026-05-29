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
    skipIntro: '跳過',
  },
  en: {
    quickPreview: 'Quick Preview',
    viewDetail: 'View Details',
    allCategory: 'All',
    detailDescriptionLabel: 'Description',
    skipIntro: 'Skip',
  },
  ko: {
    quickPreview: '빠른 미리보기',
    viewDetail: '상세 보기',
    allCategory: '전체',
    detailDescriptionLabel: '상세 설명',
    skipIntro: '건너뛰기',
  },
};

const INTRO_STORAGE_KEY = 'nexaeon_intro_seen_v1';

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
        detailPath: '/students',
      },
      {
        id: 'professors',
        icon: '△',
        title: '教授 / 研究者 Professors & Researchers',
        value: '把研究問題、模型與合作提案整理成可展示路徑。',
        why: 'NexAeon 展示 AI 教育、個別化學習、TAM、學習參與度與滿意度研究方向。',
        features: ['AI 教育研究模型展示', '文獻與研究資料庫入口', '跨學科研究合作提案'],
        cta: '查看研究方向',
        detailPath: '/researchers',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: '學校 / 管理者 University Leaders',
        value: '以可視化方式推進校務 AI 轉型與決策節奏。',
        why: 'NexAeon 可作為學校 AI 教育轉型、招生分析、行政自動化與數位創新展示平台。',
        features: ['AI 教育轉型方案', '招生與行政流程自動化', '數據分析與決策輔助'],
        cta: '查看教育創新方案',
        detailPath: '/university',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: '企業 / 合作方 Enterprise Partners',
        value: '把 AI 教育與自動化能力轉成可共創的合作方案。',
        why: 'NexAeon 可以把 AI Agent、ESG、教育科技與自動化流程轉化為合作型解決方案。',
        features: ['AI Agent Prototype', 'ESG × AI 應用方案', '自動化與數據分析工作流'],
        cta: '探索合作可能',
        detailPath: '/enterprise',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey 的第二大腦 Joey’s Second Brain',
        value: '把研究、課程與產品資產整合成同一套知識中樞。',
        why: 'NexAeon 是 Joey 的研究、課程、AI 工具、項目與知識資產管理中心。',
        features: ['研究主題與文獻管理', '課程與教學素材管理', 'AI 項目與 MVP 管理'],
        cta: '進入知識中樞',
        detailPath: '/second-brain',
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
        detailPath: '/students',
      },
      {
        id: 'professors',
        icon: '△',
        title: 'Professors & Researchers',
        value: 'Show research directions, models, and collaboration opportunities in one flow.',
        why: 'NexAeon presents research directions across AI education, personalized learning, TAM, learning engagement, and satisfaction.',
        features: ['AI education research model showcase', 'Literature and research database gateway', 'Interdisciplinary collaboration proposals'],
        cta: 'View Research Directions',
        detailPath: '/researchers',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: 'University Leaders',
        value: 'Drive AI transformation with clear operational and strategic visibility.',
        why: 'NexAeon can serve as a platform for AI education transformation, admissions analytics, administrative automation, and digital innovation.',
        features: ['AI education transformation plans', 'Admissions and admin process automation', 'Data analytics and decision support'],
        cta: 'View Innovation Plans',
        detailPath: '/university',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: 'Enterprise Partners',
        value: 'Translate AI, ESG, and EdTech ideas into partnership-ready solutions.',
        why: 'NexAeon transforms AI Agents, ESG, educational technology, and automation workflows into collaboration-based solutions.',
        features: ['AI Agent prototype', 'ESG × AI application plan', 'Automation and analytics workflow'],
        cta: 'Explore Partnership Potential',
        detailPath: '/enterprise',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey’s Second Brain',
        value: 'Unify research, courses, and AI projects in one knowledge hub.',
        why: 'NexAeon is Joey’s management center for research, courses, AI tools, projects, and long-term knowledge assets.',
        features: ['Research themes and literature management', 'Course and teaching material management', 'AI project and MVP management'],
        cta: 'Enter the Knowledge Hub',
        detailPath: '/second-brain',
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
        detailPath: '/students',
      },
      {
        id: 'professors',
        icon: '△',
        title: '교수 / 연구자 Professors & Researchers',
        value: '연구 모델과 협업 제안을 한 흐름으로 보여줍니다.',
        why: 'NexAeon은 AI 교육, 개인화 학습, TAM, 학습 참여도와 만족도 연구 방향을 제시합니다.',
        features: ['AI 교육 연구 모델 전시', '문헌 및 연구 데이터베이스 진입', '융합 연구 협업 제안'],
        cta: '연구 방향 보기',
        detailPath: '/researchers',
      },
      {
        id: 'leaders',
        icon: '◻',
        title: '학교 / 관리자 University Leaders',
        value: 'AI 전환 전략을 운영 데이터와 함께 명확하게 시각화합니다.',
        why: 'NexAeon은 학교의 AI 교육 전환, 입학 분석, 행정 자동화, 디지털 혁신을 보여주는 플랫폼으로 활용됩니다.',
        features: ['AI 교육 전환 솔루션', '입학 및 행정 프로세스 자동화', '데이터 분석 및 의사결정 지원'],
        cta: '교육 혁신안 보기',
        detailPath: '/university',
      },
      {
        id: 'enterprise',
        icon: '◆',
        title: '기업 / 파트너 Enterprise Partners',
        value: 'AI Agent, ESG, EdTech 역량을 협력형 솔루션으로 전환합니다.',
        why: 'NexAeon은 AI Agent, ESG, 교육기술, 자동화 흐름을 실제 협업 솔루션으로 연결합니다.',
        features: ['AI Agent Prototype', 'ESG × AI 적용안', '자동화 및 데이터 분석 워크플로'],
        cta: '협업 가능성 탐색',
        detailPath: '/enterprise',
      },
      {
        id: 'joey',
        icon: '◎',
        title: 'Joey의 두 번째 뇌 Joey’s Second Brain',
        value: '연구, 수업, AI 프로젝트 자산을 하나의 지식 허브로 통합합니다.',
        why: 'NexAeon은 Joey의 연구, 수업, AI 도구, 프로젝트, 지식 자산을 관리하는 중심 플랫폼입니다.',
        features: ['연구 주제 및 문헌 관리', '수업 및 교육 자료 관리', 'AI 프로젝트 및 MVP 관리'],
        cta: '지식 허브로 이동',
        detailPath: '/second-brain',
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

const ADVISOR_CONTENT = {
  zh: {
    eyebrow: 'NexAeon Advisor / 智能導覽 / 지능형 안내',
    introTitle: '讓 NexAeon 幫你找到入口',
    introSubtitle: '回答三個問題，獲得一條適合你的學習、研究或合作路徑。',
    questions: {
      identity: '你的身份是什麼？',
      goal: '你現在最想解決什麼？',
      support: '你希望 NexAeon 提供什麼？',
    },
    options: {
      identity: [
        { id: 'students', label: '學生' },
        { id: 'researchers', label: '教授 / 研究者' },
        { id: 'university', label: '學校 / 管理者' },
        { id: 'enterprise', label: '企業 / 合作方' },
        { id: 'second-brain', label: 'Joey 的第二大腦' },
      ],
      goal: [
        { id: 'learn', label: '使用 AI 學習', role: 'students' },
        { id: 'research', label: '建立研究方向', role: 'researchers' },
        { id: 'transform', label: '推動教育轉型', role: 'university' },
        { id: 'automate', label: '自動化工作流程', role: 'enterprise' },
        { id: 'organize', label: '整理知識資產', role: 'second-brain' },
      ],
      support: [
        { id: 'learning-path', label: '學習路徑', role: 'students' },
        { id: 'research-model', label: '研究模型', role: 'researchers' },
        { id: 'ai-plan', label: 'AI 轉型方案', role: 'university' },
        { id: 'mvp', label: 'MVP 原型', role: 'enterprise' },
        { id: 'knowledge-hub', label: '知識中樞', role: 'second-brain' },
      ],
    },
    results: {
      recommendedPath: '推薦入口',
      whyPath: '為什麼推薦這條路徑',
      recommendedCapabilities: '推薦能力模組',
      nextAction: '下一步行動',
      conflictNote: '你也可以從「{goal}」對應模組開始探索。',
      cta: '前往推薦入口',
      reset: '重新開始',
      pending: '完成三個問題後，這裡會自動顯示推薦結果。',
      roleName: {
        students: '學生',
        researchers: '教授 / 研究者',
        university: '學校 / 管理者',
        enterprise: '企業 / 合作方',
        'second-brain': 'Joey 的第二大腦',
      },
      capabilityLabels: {
        'AI Tutoring Lab': 'AI 助教實驗室',
        'Prompt Engineering Course': 'Prompt Engineering 課程',
        'Personalized Feedback System': '個別化回饋系統',
        'Research Hub': '研究中樞',
        'TAM / Learning Engagement Model': 'TAM / 學習參與模型',
        'Literature Knowledge Base': '文獻知識庫',
        'University AI Transformation': '大學 AI 轉型',
        'Admissions & Admin Automation': '招生與行政自動化',
        'Learning Analytics': '學習分析',
        'Enterprise AI Solution': '企業 AI 解決方案',
        'ESG × AI Project': 'ESG × AI 專案',
        'n8n Workflow': 'n8n 自動化工作流',
        'Knowledge Base': '知識庫',
        'Project Studio': '專案工作室',
      },
      why: {
        students: '你目前最適合先建立 AI 學習方法與個別化回饋節奏。',
        researchers: '你目前最適合先聚焦研究方向、模型展示與文獻整合。',
        university: '你目前最適合先規劃校務與教學場景的 AI 轉型路徑。',
        enterprise: '你目前最適合先驗證可落地的合作方案與自動化工作流。',
        'second-brain': '你目前最適合先整合知識資產，建立可持續累積的中樞。',
      },
      next: {
        students: '開始你的 AI 學習路徑。',
        researchers: '探索 NexAeon 研究方向。',
        university: '查看一份 AI 轉型方案。',
        enterprise: '探索合作可能性。',
        'second-brain': '進入知識中樞。',
      },
    },
  },
  en: {
    eyebrow: 'NexAeon Advisor / 智能導覽 / 지능형 안내',
    introTitle: 'Let NexAeon find your starting point',
    introSubtitle: 'Answer three questions and get a tailored path for learning, research, or collaboration.',
    questions: {
      identity: 'What is your current role?',
      goal: 'What do you want to solve right now?',
      support: 'What do you want from NexAeon?',
    },
    options: {
      identity: [
        { id: 'students', label: 'Student' },
        { id: 'researchers', label: 'Researcher' },
        { id: 'university', label: 'University Leader' },
        { id: 'enterprise', label: 'Enterprise Partner' },
        { id: 'second-brain', label: 'Joey / Second Brain' },
      ],
      goal: [
        { id: 'learn', label: 'Learn with AI', role: 'students' },
        { id: 'research', label: 'Build research direction', role: 'researchers' },
        { id: 'transform', label: 'Transform education', role: 'university' },
        { id: 'automate', label: 'Automate workflows', role: 'enterprise' },
        { id: 'organize', label: 'Organize knowledge', role: 'second-brain' },
      ],
      support: [
        { id: 'learning-path', label: 'Learning Path', role: 'students' },
        { id: 'research-model', label: 'Research Model', role: 'researchers' },
        { id: 'ai-plan', label: 'AI Transformation Plan', role: 'university' },
        { id: 'mvp', label: 'MVP Prototype', role: 'enterprise' },
        { id: 'knowledge-hub', label: 'Knowledge Hub', role: 'second-brain' },
      ],
    },
    results: {
      recommendedPath: 'Recommended Path',
      whyPath: 'Why this path',
      recommendedCapabilities: 'Recommended Capabilities',
      nextAction: 'Next Action',
      conflictNote: 'You can also start from modules mapped to "{goal}".',
      cta: 'Go to recommended path',
      reset: 'Start over',
      pending: 'Select all three answers to see your recommendation panel.',
      roleName: {
        students: 'Students',
        researchers: 'Professors & Researchers',
        university: 'University Leaders',
        enterprise: 'Enterprise Partners',
        'second-brain': "Joey's Second Brain",
      },
      capabilityLabels: {
        'AI Tutoring Lab': 'AI Tutoring Lab',
        'Prompt Engineering Course': 'Prompt Engineering Course',
        'Personalized Feedback System': 'Personalized Feedback System',
        'Research Hub': 'Research Hub',
        'TAM / Learning Engagement Model': 'TAM / Learning Engagement Model',
        'Literature Knowledge Base': 'Literature Knowledge Base',
        'University AI Transformation': 'University AI Transformation',
        'Admissions & Admin Automation': 'Admissions & Admin Automation',
        'Learning Analytics': 'Learning Analytics',
        'Enterprise AI Solution': 'Enterprise AI Solution',
        'ESG × AI Project': 'ESG × AI Project',
        'n8n Workflow': 'n8n Workflow',
        'Knowledge Base': 'Knowledge Base',
        'Project Studio': 'Project Studio',
      },
      why: {
        students: 'Your best first move is building AI learning habits and personalized feedback loops.',
        researchers: 'Your best first move is clarifying research direction, model framing, and evidence structure.',
        university: 'Your best first move is designing a practical AI transformation path for education operations.',
        enterprise: 'Your best first move is validating collaboration-ready use cases and automation workflows.',
        'second-brain': 'Your best first move is unifying knowledge assets into a compounding personal hub.',
      },
      next: {
        students: 'Start your AI learning path.',
        researchers: 'Explore NexAeon research direction.',
        university: 'View an AI transformation plan.',
        enterprise: 'Explore collaboration possibilities.',
        'second-brain': 'Enter the knowledge hub.',
      },
    },
  },
  ko: {
    eyebrow: 'NexAeon Advisor / 智能導覽 / 지능형 안내',
    introTitle: 'NexAeon이 시작 지점을 찾아준다',
    introSubtitle: '세 가지 질문에 답하면 학습, 연구, 협업에 맞는 경로를 추천받을 수 있다.',
    questions: {
      identity: '당신의 역할은 무엇인가요?',
      goal: '지금 가장 해결하고 싶은 것은 무엇인가요?',
      support: 'NexAeon에서 무엇을 원하나요?',
    },
    options: {
      identity: [
        { id: 'students', label: '학생' },
        { id: 'researchers', label: '교수 / 연구자' },
        { id: 'university', label: '대학 / 관리자' },
        { id: 'enterprise', label: '기업 / 협력 파트너' },
        { id: 'second-brain', label: 'Joey의 세컨드 브레인' },
      ],
      goal: [
        { id: 'learn', label: 'AI로 학습하기', role: 'students' },
        { id: 'research', label: '연구 방향 구축', role: 'researchers' },
        { id: 'transform', label: '교육 전환 추진', role: 'university' },
        { id: 'automate', label: '업무 흐름 자동화', role: 'enterprise' },
        { id: 'organize', label: '지식 자산 정리', role: 'second-brain' },
      ],
      support: [
        { id: 'learning-path', label: '학습 경로', role: 'students' },
        { id: 'research-model', label: '연구 모델', role: 'researchers' },
        { id: 'ai-plan', label: 'AI 전환 방안', role: 'university' },
        { id: 'mvp', label: 'MVP 프로토타입', role: 'enterprise' },
        { id: 'knowledge-hub', label: '지식 허브', role: 'second-brain' },
      ],
    },
    results: {
      recommendedPath: '추천 경로',
      whyPath: '이 경로를 추천하는 이유',
      recommendedCapabilities: '추천 역량 모듈',
      nextAction: '다음 행동',
      conflictNote: '"{goal}"에 해당하는 모듈부터 탐색해도 좋습니다.',
      cta: '추천 경로로 이동',
      reset: '다시 시작',
      pending: '세 가지 질문을 모두 선택하면 추천 결과가 자동으로 표시됩니다.',
      roleName: {
        students: '학생',
        researchers: '교수 / 연구자',
        university: '대학 / 관리자',
        enterprise: '기업 / 협력 파트너',
        'second-brain': 'Joey의 세컨드 브레인',
      },
      capabilityLabels: {
        'AI Tutoring Lab': 'AI 튜터링 랩',
        'Prompt Engineering Course': '프롬프트 엔지니어링 과정',
        'Personalized Feedback System': '개인화 피드백 시스템',
        'Research Hub': '연구 허브',
        'TAM / Learning Engagement Model': 'TAM / 학습 참여 모델',
        'Literature Knowledge Base': '문헌 지식베이스',
        'University AI Transformation': '대학 AI 전환',
        'Admissions & Admin Automation': '입학·행정 자동화',
        'Learning Analytics': '학습 분석',
        'Enterprise AI Solution': '기업 AI 솔루션',
        'ESG × AI Project': 'ESG × AI 프로젝트',
        'n8n Workflow': 'n8n 자동화 워크플로',
        'Knowledge Base': '지식베이스',
        'Project Studio': '프로젝트 스튜디오',
      },
      why: {
        students: '지금은 AI 학습 방식과 개인화 피드백 루프를 먼저 구축하는 것이 가장 효과적입니다.',
        researchers: '지금은 연구 방향, 모델 구조, 문헌 근거를 명확히 정리하는 것이 가장 효과적입니다.',
        university: '지금은 교육 및 행정 현장에 맞는 AI 전환 경로를 설계하는 것이 가장 효과적입니다.',
        enterprise: '지금은 협업 가능한 시나리오와 자동화 워크플로를 빠르게 검증하는 것이 가장 효과적입니다.',
        'second-brain': '지금은 지식 자산을 통합해 장기적으로 축적되는 개인 허브를 만드는 것이 가장 효과적입니다.',
      },
      next: {
        students: 'AI 학습 경로를 시작하세요.',
        researchers: 'NexAeon 연구 방향을 탐색하세요.',
        university: 'AI 전환 계획을 확인하세요.',
        enterprise: '협업 가능성을 탐색하세요.',
        'second-brain': '지식 허브로 들어가세요.',
      },
    },
  },
};

const ADVISOR_ROLE_RULES = {
  students: {
    path: '/students',
    capabilities: ['AI Tutoring Lab', 'Prompt Engineering Course', 'Personalized Feedback System'],
  },
  researchers: {
    path: '/researchers',
    capabilities: ['Research Hub', 'TAM / Learning Engagement Model', 'Literature Knowledge Base'],
  },
  university: {
    path: '/university',
    capabilities: ['University AI Transformation', 'Admissions & Admin Automation', 'Learning Analytics'],
  },
  enterprise: {
    path: '/enterprise',
    capabilities: ['Enterprise AI Solution', 'ESG × AI Project', 'n8n Workflow'],
  },
  'second-brain': {
    path: '/second-brain',
    capabilities: ['Knowledge Base', 'Project Studio', 'Research Hub'],
  },
};

const ACTION_CENTER_CONTENT = {
  zh: {
    eyebrow: 'NexAeon Action Center / 行動轉化中心 / 액션 센터',
    title: '把你的想法轉成第一份 NexAeon Brief',
    subtitle: '選擇身份、需求與方向，生成一份可複製的學習、研究或合作摘要。',
    questions: {
      role: '我是誰？',
      need: '我目前最需要什麼？',
      action: '我希望下一步是什麼？',
    },
    options: {
      role: [
        { id: 'student', label: '學生' },
        { id: 'researcher', label: '教授 / 研究者' },
        { id: 'university', label: '學校 / 管理者' },
        { id: 'enterprise', label: '企業 / 合作方' },
        { id: 'secondBrain', label: 'Joey 的第二大腦' },
      ],
      need: [
        { id: 'learningSupport', label: '學習支持' },
        { id: 'researchCollaboration', label: '研究協作' },
        { id: 'transformationPlan', label: '轉型方案' },
        { id: 'mvpPrototype', label: 'MVP 原型' },
        { id: 'knowledgeSystem', label: '知識系統' },
      ],
      action: [
        { id: 'explorePath', label: '探索路徑' },
        { id: 'discussResearch', label: '討論研究方向' },
        { id: 'reviewSolution', label: '檢視解決方案' },
        { id: 'buildPrototype', label: '打造原型' },
        { id: 'organizeKnowledge', label: '整理知識' },
      ],
    },
    panel: {
      pending: '完成三個問題後，這裡會自動生成 NexAeon Brief。',
      briefTitleLabel: 'Brief 標題',
      generatedBriefLabel: '生成 Brief',
      suggestedNextStepLabel: '建議下一步',
      recommendedPageLabel: '推薦頁面',
      briefTitleTemplate: 'NexAeon Brief｜{roleLabel}',
      suggestedTemplate: '建議先從「{actionLabel}」開始，並前往 {roleLabel} 入口查看完整路徑。',
      briefTemplate:
        '我是一名{roleLabel}，目前主要需求是{needLabel}。我希望透過 NexAeon 進一步{actionLabel}。我特別關注 NexAeon 在{capability1}、{capability2}與{capability3}方面的能力，並希望以此作為學習、研究或合作的起點。',
      copyBrief: '複製 Brief',
      copySuccess: '已複製 Brief',
      goToPage: '前往推薦頁面',
      contact: '聯絡 NexAeon',
      reset: '重新開始',
    },
  },
  ko: {
    eyebrow: 'NexAeon Action Center / 行動轉化中心 / 액션 센터',
    title: '당신의 아이디어를 첫 번째 NexAeon Brief로 전환한다',
    subtitle: '역할, 니즈, 방향을 선택해 학습·연구·협업을 위한 요약문을 생성한다.',
    questions: {
      role: '나는 누구인가요?',
      need: '지금 가장 필요한 것은 무엇인가요?',
      action: '다음 단계로 무엇을 원하나요?',
    },
    options: {
      role: [
        { id: 'student', label: '학생' },
        { id: 'researcher', label: '교수 / 연구자' },
        { id: 'university', label: '대학 / 관리자' },
        { id: 'enterprise', label: '기업 / 협력 파트너' },
        { id: 'secondBrain', label: 'Joey의 세컨드 브레인' },
      ],
      need: [
        { id: 'learningSupport', label: '학습 지원' },
        { id: 'researchCollaboration', label: '연구 협업' },
        { id: 'transformationPlan', label: '전환 계획' },
        { id: 'mvpPrototype', label: 'MVP 프로토타입' },
        { id: 'knowledgeSystem', label: '지식 시스템' },
      ],
      action: [
        { id: 'explorePath', label: '경로 탐색' },
        { id: 'discussResearch', label: '연구 방향 논의' },
        { id: 'reviewSolution', label: '솔루션 검토' },
        { id: 'buildPrototype', label: '프로토타입 구축' },
        { id: 'organizeKnowledge', label: '지식 정리' },
      ],
    },
    panel: {
      pending: '세 가지 질문을 모두 선택하면 NexAeon Brief가 자동 생성됩니다.',
      briefTitleLabel: 'Brief 제목',
      generatedBriefLabel: '생성된 Brief',
      suggestedNextStepLabel: '추천 다음 단계',
      recommendedPageLabel: '추천 페이지',
      briefTitleTemplate: 'NexAeon Brief｜{roleLabel}',
      suggestedTemplate: '"{actionLabel}"부터 시작하고 {roleLabel} 경로에서 상세 내용을 확인하세요.',
      briefTemplate:
        '나는 {roleLabel}이며, 현재 주요 니즈는 {needLabel}이다. NexAeon을 통해 {actionLabel}하고자 한다. 특히 {capability1}, {capability2}, {capability3} 역량에 관심이 있으며, 이를 학습·연구·협업의 출발점으로 삼고자 한다.',
      copyBrief: 'Brief 복사',
      copySuccess: 'Brief가 복사되었습니다',
      goToPage: '추천 페이지로 이동',
      contact: 'NexAeon 문의하기',
      reset: '다시 시작',
    },
  },
  en: {
    eyebrow: 'NexAeon Action Center / 行動轉化中心 / 액션 센터',
    title: 'Turn your idea into a NexAeon Brief',
    subtitle: 'Select your role, need, and direction to generate a copy-ready brief for learning, research, or collaboration.',
    questions: {
      role: 'Who am I?',
      need: 'What do I need most right now?',
      action: 'What do I want as the next step?',
    },
    options: {
      role: [
        { id: 'student', label: 'Student' },
        { id: 'researcher', label: 'Researcher' },
        { id: 'university', label: 'University Leader' },
        { id: 'enterprise', label: 'Enterprise Partner' },
        { id: 'secondBrain', label: 'Joey / Second Brain' },
      ],
      need: [
        { id: 'learningSupport', label: 'Learning Support' },
        { id: 'researchCollaboration', label: 'Research Collaboration' },
        { id: 'transformationPlan', label: 'Transformation Plan' },
        { id: 'mvpPrototype', label: 'MVP Prototype' },
        { id: 'knowledgeSystem', label: 'Knowledge System' },
      ],
      action: [
        { id: 'explorePath', label: 'Explore Path' },
        { id: 'discussResearch', label: 'Discuss Research' },
        { id: 'reviewSolution', label: 'Review Solution' },
        { id: 'buildPrototype', label: 'Build Prototype' },
        { id: 'organizeKnowledge', label: 'Organize Knowledge' },
      ],
    },
    panel: {
      pending: 'Select all three answers to generate your NexAeon Brief automatically.',
      briefTitleLabel: 'Brief Title',
      generatedBriefLabel: 'Generated Brief',
      suggestedNextStepLabel: 'Suggested Next Step',
      recommendedPageLabel: 'Recommended Page',
      briefTitleTemplate: 'NexAeon Brief | {roleLabel}',
      suggestedTemplate: 'Start with "{actionLabel}" and continue on the {roleLabel} path.',
      briefTemplate:
        'I am a {roleLabel}, and my current need is {needLabel}. I would like to use NexAeon to {actionLabel}. I am especially interested in NexAeon’s capabilities in {capability1}, {capability2}, and {capability3}, and I would like to use them as a starting point for learning, research, or collaboration.',
      copyBrief: 'Copy Brief',
      copySuccess: 'Brief copied',
      goToPage: 'Go to Page',
      contact: 'Contact NexAeon',
      reset: 'Reset',
    },
  },
};

const ACTION_CENTER_ROLE_RULES = {
  student: {
    page: '/students',
    capabilities: ['AI Tutoring Lab', 'Prompt Engineering Course', 'Personalized Feedback System'],
  },
  researcher: {
    page: '/researchers',
    capabilities: ['Research Hub', 'TAM / Learning Engagement Model', 'Literature Knowledge Base'],
  },
  university: {
    page: '/university',
    capabilities: ['University AI Transformation', 'Admissions & Admin Automation', 'Learning Analytics'],
  },
  enterprise: {
    page: '/enterprise',
    capabilities: ['Enterprise AI Solution', 'ESG × AI Project', 'n8n Workflow'],
  },
  secondBrain: {
    page: '/second-brain',
    capabilities: ['Knowledge Base', 'Project Studio', 'Research Hub'],
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
      className="main-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--bg-0) 75%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div
        className="container main-nav-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <button
          className="main-logo-link"
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

function IntroOverlay({ skipLabel, phase, onSkip, onEnded }) {
  return (
    <div className={`intro-overlay ${phase === 'fading' ? 'is-fading' : ''}`} aria-hidden={phase === 'done'}>
      <video
        className="intro-video"
        src="/assets/nexaeon-hero-v1.3.mov"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={onEnded}
      />
      <div className="intro-overlay-gradient" />
      <button className="intro-skip-btn" onClick={onSkip} aria-label={skipLabel}>
        {skipLabel}
      </button>
    </div>
  );
}

function Hero({ t }) {
  const navigatorTitle = t.forWhom?.title?.split('\n')[0] || 'Explore the next section';

  return (
    <section id="home" className="hero-shell" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div className="hero-atmosphere" aria-hidden="true">
        <div className="hero-parallax hero-parallax-a" />
        <div className="hero-parallax hero-parallax-b" />
      </div>
      <div
        className="hero-padding"
        style={{ textAlign: 'center', padding: '108px 32px 54px', position: 'relative', zIndex: 2 }}
      >
        <div
          className="hero-eyebrow"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 15px',
            borderRadius: 999,
            border: '1px solid var(--line-2)',
            background: 'color-mix(in srgb, var(--bg-1) 80%, transparent)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-2)',
            marginBottom: 30,
            fontSize: 12,
            fontWeight: 560,
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
            fontSize: 'clamp(58px, 9.4vw, 152px)',
            lineHeight: 0.93,
            margin: 0,
            fontWeight: 460,
            letterSpacing: '-0.03em',
          }}
        >
          {t.hero.titleSerif}
        </h1>
        <div
          className="hero-title-subline"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(22px, 3vw, 44px)',
            color: 'var(--fg-2)',
            marginTop: 10,
            fontWeight: 400,
            lineHeight: 1.18,
          }}
        >
          {t.hero.titleSerifSub}{' '}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontStyle: 'normal',
              fontWeight: 430,
              color: 'var(--fg-2)',
            }}
          >
            — {t.hero.titleSans}
          </span>
        </div>

        <p
          className="hero-sub"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 430,
            fontSize: 20,
            color: 'color-mix(in srgb, var(--fg-1) 85%, var(--fg-2))',
            maxWidth: 760,
            margin: '32px auto 0',
            whiteSpace: 'pre-line',
            lineHeight: 1.72,
            letterSpacing: '0.005em',
          }}
        >
          {t.hero.sub}
        </p>

        <div className="hero-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40 }}>
          <button
            className="btn btn-glass hero-cta-main"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('modules')}
          >
            {t.hero.cta1} <ArrowIcon />
          </button>
          <button
            className="btn btn-ghost hero-cta-secondary"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('research')}
          >
            {t.hero.cta2}
          </button>
        </div>

        <button className="hero-scroll-cue" onClick={() => scrollToSection('navigator')}>
          <span>{t.hero.scrollCue}</span>
          <span className="hero-scroll-cue-arrow" aria-hidden="true">↓</span>
        </button>
      </div>

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
          paddingBottom: 22,
        }}
      >
        {t.hero.meta.map((m, i) => (
          <span key={i}>{renderMetaLabel(m)}</span>
        ))}
      </div>

      <button className="hero-next-peek" onClick={() => scrollToSection('navigator')}>
        <span className="hero-next-peek-label">{t.forWhom?.label || 'Next Section'}</span>
        <span className="hero-next-peek-title">{navigatorTitle}</span>
        <span className="hero-next-peek-arrow" aria-hidden="true">↓</span>
      </button>
    </section>
  );
}

function RoleNavigatorSection({ content, navigate }) {
  const [activeRoleId, setActiveRoleId] = useState(content.roles[0]?.id || '');
  const activeRole = content.roles.find((role) => role.id === activeRoleId) || content.roles[0];

  return (
    <section
      id="navigator"
      className="section navigator-section"
      style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80, marginTop: -52, paddingTop: 112, position: 'relative', zIndex: 3 }}
    >
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
            className="panel-switch-in navigator-detail-panel"
            style={{
              borderRadius: 18,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: '22px clamp(16px, 3vw, 26px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.2 }}>{activeRole.title}</div>
              <button className="btn btn-gradient" style={{ padding: '10px 16px', fontSize: 14 }} onClick={() => navigate(activeRole.detailPath || '/')}>
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
                data-active={isActive ? 'true' : 'false'}
                aria-pressed={isActive}
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
                className="capability-card"
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

function AdvisorSection({ content, navigate }) {
  const [identity, setIdentity] = useState('');
  const [goal, setGoal] = useState('');
  const [support, setSupport] = useState('');

  const findOption = (group, id) => content.options[group].find((option) => option.id === id);
  const selectedIdentity = identity ? findOption('identity', identity) : null;
  const selectedGoal = goal ? findOption('goal', goal) : null;
  const selectedSupport = support ? findOption('support', support) : null;
  const isComplete = Boolean(selectedIdentity && selectedGoal && selectedSupport);

  const recommendation = useMemo(() => {
    if (!isComplete || !selectedIdentity || !selectedGoal || !selectedSupport) return null;

    const roleId = selectedIdentity.id;
    const baseRule = ADVISOR_ROLE_RULES[roleId];
    if (!baseRule) return null;

    const hasConflict = selectedGoal.role !== roleId || selectedSupport.role !== roleId;
    const conflictNote = hasConflict
      ? content.results.conflictNote.replace('{goal}', selectedGoal.label)
      : '';

    return {
      roleId,
      roleLabel: content.results.roleName[roleId],
      path: baseRule.path,
      capabilities: baseRule.capabilities.map(
        (capability) => content.results.capabilityLabels?.[capability] || capability
      ),
      why: content.results.why[roleId],
      next: content.results.next[roleId],
      conflictNote,
    };
  }, [content.results, isComplete, selectedGoal, selectedIdentity, selectedSupport]);

  const renderOptionGroup = (questionKey, selectedValue, onSelect, options) => (
    <div
      className="question-group"
      style={{
        borderRadius: 16,
        border: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
        padding: 16,
      }}
    >
      <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 10 }}>
        {content.questions[questionKey]}
      </div>
      <div className="advisor-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {options.map((option) => {
          const isActive = selectedValue === option.id;
          return (
            <button
              key={option.id}
              className="option-chip"
              onClick={() => onSelect(option.id)}
              style={{
                borderRadius: 12,
                border: '1px solid ' + (isActive ? 'var(--fg-2)' : 'var(--line-1)'),
                background: isActive ? 'var(--bg-2)' : 'transparent',
                color: isActive ? 'var(--fg-1)' : 'var(--fg-2)',
                padding: '11px 12px',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                lineHeight: 1.4,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.22s var(--ease-out)',
                minHeight: 72,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section id="advisor" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
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
          {content.introTitle}
        </h2>
        <p style={{ margin: '14px auto 0', maxWidth: 860, color: 'var(--fg-2)', lineHeight: 1.7 }}>{content.introSubtitle}</p>
      </div>

      <div className="container" style={{ marginTop: 34, display: 'grid', gap: 12 }}>
        {renderOptionGroup('identity', identity, setIdentity, content.options.identity)}
        {renderOptionGroup('goal', goal, setGoal, content.options.goal)}
        {renderOptionGroup('support', support, setSupport, content.options.support)}

        <div
          className="advisor-result-panel"
          style={{
            borderRadius: 18,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: '20px clamp(16px, 3vw, 24px)',
          }}
        >
          {!recommendation ? (
            <div style={{ color: 'var(--fg-3)', lineHeight: 1.7 }}>{content.results.pending}</div>
          ) : (
            <div className="panel-switch-in" style={{ display: 'grid', gap: 14 }}>
              <div className="advisor-result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>{content.results.recommendedPath}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, lineHeight: 1.2 }}>
                    {recommendation.roleLabel}
                  </div>
                  <div style={{ marginTop: 6, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {recommendation.path}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>{content.results.whyPath}</div>
                  <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{recommendation.why}</div>
                  {recommendation.conflictNote ? (
                    <div style={{ marginTop: 8, color: 'var(--fg-3)', lineHeight: 1.7 }}>{recommendation.conflictNote}</div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>{content.results.recommendedCapabilities}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recommendation.capabilities.map((capability) => (
                    <span key={capability} className="content-tag">
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>{content.results.nextAction}</div>
                <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{recommendation.next}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-gradient" onClick={() => navigate(recommendation.path)}>
                  {content.results.cta}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setIdentity('');
                    setGoal('');
                    setSupport('');
                  }}
                >
                  {content.results.reset}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActionCenterSection({ content, capabilityLabels, navigate }) {
  const [role, setRole] = useState('');
  const [need, setNeed] = useState('');
  const [action, setAction] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const fillTemplate = (template, values) =>
    template.replace(/\{(\w+)\}/g, (_, key) => values[key] || '');

  const findOption = (group, id) => content.options[group].find((option) => option.id === id);
  const selectedRole = role ? findOption('role', role) : null;
  const selectedNeed = need ? findOption('need', need) : null;
  const selectedAction = action ? findOption('action', action) : null;
  const isComplete = Boolean(selectedRole && selectedNeed && selectedAction);

  const briefData = useMemo(() => {
    if (!isComplete || !selectedRole || !selectedNeed || !selectedAction) return null;
    const roleRule = ACTION_CENTER_ROLE_RULES[selectedRole.id];
    if (!roleRule) return null;

    const localizedCapabilities = roleRule.capabilities.map(
      (capability) => capabilityLabels?.[capability] || capability
    );
    const [capability1, capability2, capability3] = localizedCapabilities;
    const briefText = fillTemplate(content.panel.briefTemplate, {
      roleLabel: selectedRole.label,
      needLabel: selectedNeed.label,
      actionLabel: selectedAction.label,
      capability1,
      capability2,
      capability3,
    });
    const briefTitle = fillTemplate(content.panel.briefTitleTemplate, {
      roleLabel: selectedRole.label,
    });
    const suggestedNextStep = fillTemplate(content.panel.suggestedTemplate, {
      roleLabel: selectedRole.label,
      actionLabel: selectedAction.label,
    });

    return {
      briefTitle,
      briefText,
      suggestedNextStep,
      recommendedPage: roleRule.page,
      capabilities: localizedCapabilities,
    };
  }, [capabilityLabels, content.panel, isComplete, selectedAction, selectedNeed, selectedRole]);

  useEffect(() => {
    setCopyStatus('');
  }, [role, need, action]);

  const renderOptionGroup = (questionKey, selectedValue, onSelect, options) => (
    <div
      className="question-group"
      style={{
        borderRadius: 16,
        border: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
        padding: 16,
      }}
    >
      <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 10 }}>
        {content.questions[questionKey]}
      </div>
      <div className="action-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {options.map((option) => {
          const isActive = selectedValue === option.id;
          return (
            <button
              key={option.id}
              className="option-chip"
              onClick={() => onSelect(option.id)}
              style={{
                borderRadius: 12,
                border: '1px solid ' + (isActive ? 'var(--fg-2)' : 'var(--line-1)'),
                background: isActive ? 'var(--bg-2)' : 'transparent',
                color: isActive ? 'var(--fg-1)' : 'var(--fg-2)',
                padding: '11px 12px',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                lineHeight: 1.4,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.22s var(--ease-out)',
                minHeight: 72,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section id="action-center" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
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
        <p style={{ margin: '14px auto 0', maxWidth: 860, color: 'var(--fg-2)', lineHeight: 1.7 }}>{content.subtitle}</p>
      </div>

      <div className="container" style={{ marginTop: 34, display: 'grid', gap: 12 }}>
        {renderOptionGroup('role', role, setRole, content.options.role)}
        {renderOptionGroup('need', need, setNeed, content.options.need)}
        {renderOptionGroup('action', action, setAction, content.options.action)}

        <div
          className="action-result-panel"
          style={{
            borderRadius: 18,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: '20px clamp(16px, 3vw, 24px)',
          }}
        >
          {!briefData ? (
            <div style={{ color: 'var(--fg-3)', lineHeight: 1.7 }}>{content.panel.pending}</div>
          ) : (
            <div className="panel-switch-in" style={{ display: 'grid', gap: 14 }}>
              <div className="action-result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>{content.panel.briefTitleLabel}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, lineHeight: 1.2 }}>{briefData.briefTitle}</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>{content.panel.recommendedPageLabel}</div>
                  <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{briefData.recommendedPage}</div>
                </div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>{content.panel.generatedBriefLabel}</div>
                <div style={{ color: 'var(--fg-2)', lineHeight: 1.75 }}>{briefData.briefText}</div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>{content.panel.suggestedNextStepLabel}</div>
                <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{briefData.suggestedNextStep}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {briefData.capabilities.map((capability) => (
                  <span key={capability} className="content-tag">
                    {capability}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${briefData.briefTitle}\n\n${briefData.briefText}\n\n${content.panel.suggestedNextStepLabel}: ${briefData.suggestedNextStep}\n${content.panel.recommendedPageLabel}: ${briefData.recommendedPage}`
                      );
                      setCopyStatus(content.panel.copySuccess);
                    } catch {
                      setCopyStatus(content.panel.copySuccess);
                    }
                  }}
                >
                  {content.panel.copyBrief}
                </button>
                <button className="btn btn-gradient" onClick={() => navigate(briefData.recommendedPage)}>
                  {content.panel.goToPage}
                </button>
                <button className="btn btn-ghost" onClick={() => scrollToSection('contact')}>
                  {content.panel.contact}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setRole('');
                    setNeed('');
                    setAction('');
                    setCopyStatus('');
                  }}
                >
                  {content.panel.reset}
                </button>
              </div>
              {copyStatus ? <div style={{ color: 'var(--fg-2)', fontSize: 14 }}>{copyStatus}</div> : null}
            </div>
          )}
        </div>
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
            className="module-card"
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
                className="research-focus-card"
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
            className="research-focus-detail"
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
              className="research-card"
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
            className="glass-input"
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
                className="filter-chip"
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
                className="knowledge-card"
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
              className="project-card"
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
          className="assistant-panel"
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
              className={`assistant-bubble ${message.role === 'user' ? 'assistant-bubble-user' : 'assistant-bubble-ai'}`}
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
            className="glass-input"
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
          className="contact-panel"
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
  const advisorContent = ADVISOR_CONTENT[lang] || ADVISOR_CONTENT.en;
  const actionCenterContent = ACTION_CENTER_CONTENT[lang] || ACTION_CENTER_CONTENT.en;
  const [introPhase, setIntroPhase] = useState(() => {
    try {
      return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1' ? 'done' : 'playing';
    } catch {
      return 'playing';
    }
  });
  const [detail, setDetail] = useState(null);
  const researchItems = useMemo(() => getResearchItems(lang), [lang]);
  const knowledgeItems = useMemo(() => getKnowledgeItems(lang), [lang]);
  const projectItems = useMemo(() => getProjectItems(lang), [lang]);

  const closeIntro = () => {
    if (introPhase !== 'playing') return;
    setIntroPhase('fading');
    window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
      } catch {}
      setIntroPhase('done');
    }, 420);
  };

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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (introPhase !== 'done') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [introPhase]);

  return (
    <div ref={rootRef} className="direction-shell">
      {introPhase !== 'done' ? (
        <IntroOverlay
          skipLabel={uiText.skipIntro}
          phase={introPhase}
          onSkip={closeIntro}
          onEnded={closeIntro}
        />
      ) : null}
      <NeuralBackground />
      <Nav locale={locale} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <RoleNavigatorSection key={`navigator-${lang}`} content={navigatorContent} navigate={navigate} />
      <CapabilityMapSection key={`capability-${lang}`} content={capabilityMapContent} />
      <AdvisorSection key={`advisor-${lang}`} content={advisorContent} navigate={navigate} />
      <ActionCenterSection
        key={`action-center-${lang}`}
        content={actionCenterContent}
        capabilityLabels={advisorContent.results.capabilityLabels}
        navigate={navigate}
      />
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
      <AssistantSection key={`assistant-${lang}`} locale={locale} />
      <ContactSection key={`contact-${lang}`} locale={locale} />
      <Footer t={t} />
      <DetailModal detail={detail} locale={locale} uiText={uiText} onClose={() => setDetail(null)} />
    </div>
  );
}
