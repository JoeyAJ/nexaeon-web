export const NAV_ITEMS = [
  { id: 'home', label: '首頁' },
  { id: 'research', label: '研究方向' },
  { id: 'knowledge', label: '知識庫' },
  { id: 'projects', label: '項目展示' },
  { id: 'assistant', label: 'Nexōn 助教' },
  { id: 'contact', label: '聯絡合作' },
];

export const RESEARCH_DIRECTIONS = [
  {
    id: 'ai-education',
    title: 'AI × Education',
    summary: '探索 AI 與教育融合的教學設計與學習成效。',
    details:
      '從學習者診斷、教學介入到回饋追蹤，建立可重複驗證的 AI 教育實作框架。',
  },
  {
    id: 'ai-tutoring-system',
    title: 'AI Tutoring System',
    summary: '打造個人化、可持續迭代的 AI 助教系統。',
    details:
      '聚焦提問意圖判斷、回應分層策略與學習記錄，讓學生在不同程度都能取得可執行的下一步。',
  },
  {
    id: 'prompt-engineering',
    title: 'Prompt Engineering',
    summary: '建立穩定輸出的教學提示詞方法。',
    details:
      '透過模板化、上下文控制與品質評估機制，提升教學回覆的一致性與可解釋性。',
  },
  {
    id: 'ai-ethics',
    title: 'AI Ethics & Philosophy',
    summary: '關注 AI 教學中的倫理與人本議題。',
    details:
      '涵蓋資料邊界、偏誤風險、教育公平與責任歸屬，將倫理原則納入產品與課程設計。',
  },
  {
    id: 'ai-business',
    title: 'AI Business / AI Management',
    summary: '連結 AI 教育產品策略與組織導入。',
    details:
      '從需求驗證、流程治理到成效指標，協助學校與企業建立可落地的 AI 管理模型。',
  },
  {
    id: 'nexaeon-mvp',
    title: 'NexAeon MVP',
    summary: '以最小可行產品驗證 NexAeon 核心價值。',
    details:
      '先完成可操作的 V1 互動循環，再逐步對接 Notion、Airtable 與後端 API。',
  },
];

export const KNOWLEDGE_CATEGORIES = ['全部', '論文', '課程', 'AI工具', '教學案例', '研究筆記', '項目文檔'];

export const KNOWLEDGE_ITEMS = [
  {
    id: 'kb-1',
    title: 'Adaptive Learning Pathways with LLM Tutors',
    category: '論文',
    summary: '分析語言模型在個人化學習路徑中的設計與成效評估。',
    link: 'https://example.com/adaptive-learning-pathways',
    tags: ['LLM', 'adaptive learning', 'evaluation'],
  },
  {
    id: 'kb-2',
    title: 'Prompt Engineering for Educators',
    category: '課程',
    summary: '面向教育工作者的提示詞設計實作，含教案模板與互動策略。',
    link: 'https://example.com/prompt-engineering-educators',
    tags: ['prompt', 'teacher', 'curriculum'],
  },
  {
    id: 'kb-3',
    title: 'NexAeon Prompt Lab',
    category: 'AI工具',
    summary: '比較不同提示詞版本與輸出品質的測試工具。',
    link: 'https://example.com/nexaeon-prompt-lab',
    tags: ['tooling', 'prompt', 'workflow'],
  },
  {
    id: 'kb-4',
    title: '高中英語寫作 AI 教學案例',
    category: '教學案例',
    summary: '記錄 AI 助教在寫作課程中的介入流程與學習反饋。',
    link: 'https://example.com/ai-writing-case',
    tags: ['classroom', 'writing', 'student feedback'],
  },
  {
    id: 'kb-5',
    title: 'AI Ethics Reading Notes',
    category: '研究筆記',
    summary: '彙整 AI 倫理與教育公平議題，提煉可行動設計原則。',
    link: 'https://example.com/ai-ethics-notes',
    tags: ['ethics', 'policy', 'equity'],
  },
  {
    id: 'kb-6',
    title: 'NexAeon MVP Product Spec',
    category: '項目文檔',
    summary: '功能定義、資料結構、驗收條件與 V1 里程碑。',
    link: 'https://example.com/nexaeon-mvp-spec',
    tags: ['spec', 'roadmap', 'mvp'],
  },
];

export const PROJECT_ITEMS = [
  {
    id: 'project-1',
    title: 'NexAeon AI Tutoring MVP',
    subtitle: '個人化 AI 助教核心原型',
    details:
      '整合提問理解、分層回覆與評分反饋，驗證 AI 教學輔助流程可行性。',
  },
  {
    id: 'project-2',
    title: 'Woosong Buddy',
    subtitle: '校園導覽與新生支持助手',
    details: '提供課程、校園與生活資訊入口，降低新生資訊焦慮與適應成本。',
  },
  {
    id: 'project-3',
    title: 'GreenTrace',
    subtitle: '永續行動追蹤平台',
    details: '將永續行動資料可視化，支援個人與組織追蹤影響成效。',
  },
  {
    id: 'project-4',
    title: 'Admissions PDF System',
    subtitle: '招生文件智慧處理系統',
    details: '自動抽取與整理招生資料，改善審查效率與一致性。',
  },
  {
    id: 'project-5',
    title: 'AI 教育研究資料庫',
    subtitle: '研究資料整理與檢索中台',
    details: '整合論文、筆記、案例，建立可搜尋與分類的研究工作流。',
  },
  {
    id: 'project-6',
    title: 'NexAeon HQ Notion System',
    subtitle: '研發與營運知識協作系統',
    details: '集中管理專案、決策與知識沉澱，提升跨角色協作透明度。',
  },
];

export const ASSISTANT_PRESET_QUESTIONS = [
  'NexAeon 是什麼？',
  'Joey 的研究方向是什麼？',
  '這個網站能為學生提供什麼？',
  '企業可以如何合作？',
];

export const ASSISTANT_REPLIES = {
  'NexAeon 是什麼？':
    'NexAeon 是一個聚焦 AI × Education 的數位研究所型網站，結合研究、教學與知識系統，並持續把想法轉成可驗證的產品原型。',
  'Joey 的研究方向是什麼？':
    'Joey 的研究方向包含 AI × Education、AI Tutoring System、Prompt Engineering、AI Ethics & Philosophy，以及 AI Business / AI Management。',
  '這個網站能為學生提供什麼？':
    '學生可以在這裡快速理解研究方向、搜尋知識資源、查看專案案例，並透過 Nexōn 助教先獲得即時的學習引導。',
  '企業可以如何合作？':
    '企業可透過聯絡表單提出合作需求，例如 AI 教育顧問、內訓設計、研究共創或產品共研，我們會依目標規劃合作路徑。',
};

export const CONTACT_IDENTITIES = ['學生', '教育工作者', '研究者', '企業夥伴', '其他'];

export const CONTACT_DIRECTIONS = ['AI 教育顧問', '企業內訓合作', '研究合作', '產品共創', '其他'];
