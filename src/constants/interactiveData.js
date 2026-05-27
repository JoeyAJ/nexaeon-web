export const INTERACTIVE_CONTENT = {
  zh: {
    navItems: [
      { id: 'home', label: '首頁' },
      { id: 'research', label: '研究方向' },
      { id: 'knowledge', label: '知識庫' },
      { id: 'projects', label: '項目展示' },
      { id: 'assistant', label: 'Nexōn 助教' },
      { id: 'contact', label: '聯絡合作' },
    ],
    common: {
      expand: '展開',
      collapse: '收合',
      details: '詳細',
      externalLink: '外部連結',
    },
    research: {
      eyebrow: 'Research Directions',
      title: '研究方向',
      items: [
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
      ],
    },
    knowledge: {
      eyebrow: 'Knowledge Base',
      title: '知識庫',
      searchPlaceholder: '搜尋關鍵字（標題、摘要、分類、標籤）',
      noResults: '找不到符合條件的資料。',
      categories: [
        { key: 'all', label: '全部' },
        { key: 'paper', label: '論文' },
        { key: 'course', label: '課程' },
        { key: 'tool', label: 'AI工具' },
        { key: 'case', label: '教學案例' },
        { key: 'note', label: '研究筆記' },
        { key: 'doc', label: '項目文檔' },
      ],
      items: [
        {
          id: 'kb-1',
          categoryKey: 'paper',
          title: 'Adaptive Learning Pathways with LLM Tutors',
          summary: '分析語言模型在個人化學習路徑中的設計與成效評估。',
          link: 'https://example.com/adaptive-learning-pathways',
          tags: ['LLM', 'adaptive learning', 'evaluation'],
        },
        {
          id: 'kb-2',
          categoryKey: 'course',
          title: 'Prompt Engineering for Educators',
          summary: '面向教育工作者的提示詞設計實作，含教案模板與互動策略。',
          link: 'https://example.com/prompt-engineering-educators',
          tags: ['prompt', 'teacher', 'curriculum'],
        },
        {
          id: 'kb-3',
          categoryKey: 'tool',
          title: 'NexAeon Prompt Lab',
          summary: '比較不同提示詞版本與輸出品質的測試工具。',
          link: 'https://example.com/nexaeon-prompt-lab',
          tags: ['tooling', 'prompt', 'workflow'],
        },
        {
          id: 'kb-4',
          categoryKey: 'case',
          title: '高中英語寫作 AI 教學案例',
          summary: '記錄 AI 助教在寫作課程中的介入流程與學習反饋。',
          link: 'https://example.com/ai-writing-case',
          tags: ['classroom', 'writing', 'student feedback'],
        },
        {
          id: 'kb-5',
          categoryKey: 'note',
          title: 'AI Ethics Reading Notes',
          summary: '彙整 AI 倫理與教育公平議題，提煉可行動設計原則。',
          link: 'https://example.com/ai-ethics-notes',
          tags: ['ethics', 'policy', 'equity'],
        },
        {
          id: 'kb-6',
          categoryKey: 'doc',
          title: 'NexAeon MVP Product Spec',
          summary: '功能定義、資料結構、驗收條件與 V1 里程碑。',
          link: 'https://example.com/nexaeon-mvp-spec',
          tags: ['spec', 'roadmap', 'mvp'],
        },
      ],
    },
    projects: {
      eyebrow: 'Projects',
      title: '項目展示',
      items: [
        {
          id: 'project-1',
          title: 'NexAeon AI Tutoring MVP',
          subtitle: '個人化 AI 助教核心原型',
          details: '整合提問理解、分層回覆與評分反饋，驗證 AI 教學輔助流程可行性。',
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
      ],
    },
    assistant: {
      eyebrow: 'Nexōn AI Tutor',
      title: 'Nexōn 助教',
      greeting: '你好，我是 Nexōn 助教。可以直接點選預設問題，或輸入你的提問。',
      userLabel: '你',
      assistantLabel: 'Nexōn',
      inputPlaceholder: '輸入你的問題...',
      send: '送出',
      fallback: '目前是 V1 mock 助教。你可以先點選上方四個預設問題，我會給你對應答案。',
      qas: [
        {
          question: 'NexAeon 是什麼？',
          answer:
            'NexAeon 是一個聚焦 AI × Education 的數位研究所型網站，結合研究、教學與知識系統，並持續把想法轉成可驗證的產品原型。',
          keywords: ['nexaeon', '是什麼', '介紹'],
        },
        {
          question: 'Joey 的研究方向是什麼？',
          answer:
            'Joey 的研究方向包含 AI × Education、AI Tutoring System、Prompt Engineering、AI Ethics & Philosophy，以及 AI Business / AI Management。',
          keywords: ['joey', '研究', '方向'],
        },
        {
          question: '這個網站能為學生提供什麼？',
          answer:
            '學生可以在這裡快速理解研究方向、搜尋知識資源、查看專案案例，並透過 Nexōn 助教先獲得即時的學習引導。',
          keywords: ['學生', '提供', '學習'],
        },
        {
          question: '企業可以如何合作？',
          answer:
            '企業可透過聯絡表單提出合作需求，例如 AI 教育顧問、內訓設計、研究共創或產品共研，我們會依目標規劃合作路徑。',
          keywords: ['企業', '合作'],
        },
      ],
    },
    contact: {
      eyebrow: 'Contact & Collaboration',
      title: '聯絡合作',
      namePlaceholder: '姓名',
      identityPlaceholder: '身份',
      directionPlaceholder: '合作方向',
      emailPlaceholder: 'Email',
      messagePlaceholder: '留言',
      submit: '送出',
      identityOptions: ['學生', '教育工作者', '研究者', '企業夥伴', '其他'],
      directionOptions: ['AI 教育顧問', '企業內訓合作', '研究合作', '產品共創', '其他'],
      requiredMessage: '請先完整填寫所有欄位。',
      successMessage: '送出成功，我們已收到你的訊息，將盡快回覆。',
    },
  },
  en: {
    navItems: [
      { id: 'home', label: 'Home' },
      { id: 'research', label: 'Research' },
      { id: 'knowledge', label: 'Knowledge Base' },
      { id: 'projects', label: 'Projects' },
      { id: 'assistant', label: 'Nexōn Tutor' },
      { id: 'contact', label: 'Contact' },
    ],
    common: {
      expand: 'Expand',
      collapse: 'Collapse',
      details: 'Details',
      externalLink: 'External Link',
    },
    research: {
      eyebrow: 'Research Directions',
      title: 'Research Directions',
      items: [
        {
          id: 'ai-education',
          title: 'AI × Education',
          summary: 'Exploring how AI can redesign learning and teaching outcomes.',
          details:
            'From learner diagnosis to instructional intervention and feedback tracking, this direction builds a repeatable AI-education implementation framework.',
        },
        {
          id: 'ai-tutoring-system',
          title: 'AI Tutoring System',
          summary: 'Building a personalized and continuously evolving AI tutoring system.',
          details:
            'Focuses on question-intent detection, layered response strategies, and learning records so students at different levels can always get a clear next step.',
        },
        {
          id: 'prompt-engineering',
          title: 'Prompt Engineering',
          summary: 'Developing stable prompting methods for educational outputs.',
          details:
            'Uses structured templates, context control, and quality checks to improve consistency and explainability in tutoring responses.',
        },
        {
          id: 'ai-ethics',
          title: 'AI Ethics & Philosophy',
          summary: 'Examining ethics and human-centered concerns in AI learning contexts.',
          details:
            'Covers data boundaries, bias risks, educational equity, and accountability, integrating ethical principles into product and curriculum design.',
        },
        {
          id: 'ai-business',
          title: 'AI Business / AI Management',
          summary: 'Connecting AI education strategy with organizational execution.',
          details:
            'From demand validation and governance to outcome metrics, this area supports schools and companies in building practical AI management models.',
        },
        {
          id: 'nexaeon-mvp',
          title: 'NexAeon MVP',
          summary: 'Validating NexAeon core value through a minimum viable product.',
          details:
            'Completes an operable V1 interaction loop first, then connects progressively with Notion, Airtable, and backend APIs.',
        },
      ],
    },
    knowledge: {
      eyebrow: 'Knowledge Base',
      title: 'Knowledge Base',
      searchPlaceholder: 'Search keywords (title, summary, category, tags)',
      noResults: 'No matching resources found.',
      categories: [
        { key: 'all', label: 'All' },
        { key: 'paper', label: 'Paper' },
        { key: 'course', label: 'Course' },
        { key: 'tool', label: 'AI Tool' },
        { key: 'case', label: 'Teaching Case' },
        { key: 'note', label: 'Research Note' },
        { key: 'doc', label: 'Project Doc' },
      ],
      items: [
        {
          id: 'kb-1',
          categoryKey: 'paper',
          title: 'Adaptive Learning Pathways with LLM Tutors',
          summary: 'Analyzes design strategies and learning outcomes for LLM-based adaptive pathways.',
          link: 'https://example.com/adaptive-learning-pathways',
          tags: ['LLM', 'adaptive learning', 'evaluation'],
        },
        {
          id: 'kb-2',
          categoryKey: 'course',
          title: 'Prompt Engineering for Educators',
          summary: 'A practical course for educators with lesson templates and interaction strategies.',
          link: 'https://example.com/prompt-engineering-educators',
          tags: ['prompt', 'teacher', 'curriculum'],
        },
        {
          id: 'kb-3',
          categoryKey: 'tool',
          title: 'NexAeon Prompt Lab',
          summary: 'A tool to compare prompt versions and evaluate response quality.',
          link: 'https://example.com/nexaeon-prompt-lab',
          tags: ['tooling', 'prompt', 'workflow'],
        },
        {
          id: 'kb-4',
          categoryKey: 'case',
          title: 'High School English Writing AI Case',
          summary: 'Documents intervention flow and student feedback in AI-assisted writing classes.',
          link: 'https://example.com/ai-writing-case',
          tags: ['classroom', 'writing', 'student feedback'],
        },
        {
          id: 'kb-5',
          categoryKey: 'note',
          title: 'AI Ethics Reading Notes',
          summary: 'Synthesizes AI ethics and educational equity issues into actionable principles.',
          link: 'https://example.com/ai-ethics-notes',
          tags: ['ethics', 'policy', 'equity'],
        },
        {
          id: 'kb-6',
          categoryKey: 'doc',
          title: 'NexAeon MVP Product Spec',
          summary: 'Defines features, data structures, acceptance criteria, and V1 milestones.',
          link: 'https://example.com/nexaeon-mvp-spec',
          tags: ['spec', 'roadmap', 'mvp'],
        },
      ],
    },
    projects: {
      eyebrow: 'Projects',
      title: 'Project Showcase',
      items: [
        {
          id: 'project-1',
          title: 'NexAeon AI Tutoring MVP',
          subtitle: 'Core prototype for personalized AI tutoring',
          details:
            'Integrates question understanding, layered replies, and feedback scoring to validate the AI tutoring flow.',
        },
        {
          id: 'project-2',
          title: 'Woosong Buddy',
          subtitle: 'Campus guidance and newcomer support assistant',
          details:
            'Provides a unified entry for course, campus, and daily-life information to reduce onboarding friction.',
        },
        {
          id: 'project-3',
          title: 'GreenTrace',
          subtitle: 'Sustainability action tracking platform',
          details:
            'Visualizes sustainability actions and supports impact tracking for individuals and organizations.',
        },
        {
          id: 'project-4',
          title: 'Admissions PDF System',
          subtitle: 'Smart admissions document processing system',
          details:
            'Automates extraction and structuring of admissions files to improve review speed and consistency.',
        },
        {
          id: 'project-5',
          title: 'AI Education Research Database',
          subtitle: 'Research organization and retrieval hub',
          details:
            'Combines papers, notes, and cases into a searchable and categorized research workflow.',
        },
        {
          id: 'project-6',
          title: 'NexAeon HQ Notion System',
          subtitle: 'R&D and operations knowledge collaboration system',
          details:
            'Centralizes projects, decisions, and knowledge assets for transparent cross-role collaboration.',
        },
      ],
    },
    assistant: {
      eyebrow: 'Nexōn AI Tutor',
      title: 'Nexōn Tutor',
      greeting: 'Hi, I am Nexōn Tutor. Tap a preset question or type your own.',
      userLabel: 'You',
      assistantLabel: 'Nexōn',
      inputPlaceholder: 'Type your question...',
      send: 'Send',
      fallback: 'This is a V1 mock tutor. Try one of the four preset questions above for mapped replies.',
      qas: [
        {
          question: 'What is NexAeon?',
          answer:
            'NexAeon is a digital institute focused on AI × Education, connecting research, teaching, and knowledge systems through practical product experiments.',
          keywords: ['what is nexaeon', 'nexaeon', 'about nexaeon'],
        },
        {
          question: "What are Joey's research directions?",
          answer:
            "Joey focuses on AI × Education, AI Tutoring Systems, Prompt Engineering, AI Ethics & Philosophy, and AI Business / AI Management.",
          keywords: ['joey', 'research directions', 'research area'],
        },
        {
          question: 'What can students get from this website?',
          answer:
            'Students can quickly understand research directions, search learning resources, review project cases, and get initial guidance from Nexōn Tutor.',
          keywords: ['students', 'website', 'get from', 'learning support'],
        },
        {
          question: 'How can companies collaborate?',
          answer:
            'Companies can submit collaboration needs via the contact form, including AI education consulting, internal training, research collaboration, and product co-creation.',
          keywords: ['company', 'collaborate', 'partnership'],
        },
      ],
    },
    contact: {
      eyebrow: 'Contact & Collaboration',
      title: 'Contact',
      namePlaceholder: 'Name',
      identityPlaceholder: 'Identity',
      directionPlaceholder: 'Collaboration Direction',
      emailPlaceholder: 'Email',
      messagePlaceholder: 'Message',
      submit: 'Submit',
      identityOptions: ['Student', 'Educator', 'Researcher', 'Business Partner', 'Other'],
      directionOptions: ['AI Education Consulting', 'Corporate Training', 'Research Collaboration', 'Product Co-creation', 'Other'],
      requiredMessage: 'Please complete all fields before submitting.',
      successMessage: 'Submitted successfully. We received your message and will reply soon.',
    },
  },
  ko: {
    navItems: [
      { id: 'home', label: '홈' },
      { id: 'research', label: '연구 방향' },
      { id: 'knowledge', label: '지식베이스' },
      { id: 'projects', label: '프로젝트' },
      { id: 'assistant', label: 'Nexōn 튜터' },
      { id: 'contact', label: '협업 문의' },
    ],
    common: {
      expand: '열기',
      collapse: '닫기',
      details: '상세',
      externalLink: '외부 링크',
    },
    research: {
      eyebrow: 'Research Directions',
      title: '연구 방향',
      items: [
        {
          id: 'ai-education',
          title: 'AI × Education',
          summary: 'AI와 교육 융합을 통한 학습 설계와 성과를 탐구합니다.',
          details:
            '학습자 진단, 수업 개입, 피드백 추적까지 연결해 재현 가능한 AI 교육 실행 프레임워크를 구축합니다.',
        },
        {
          id: 'ai-tutoring-system',
          title: 'AI Tutoring System',
          summary: '개인화되고 지속적으로 진화하는 AI 튜터링 시스템을 설계합니다.',
          details:
            '질문 의도 판단, 계층형 응답 전략, 학습 기록을 중심으로 학습 수준과 상관없이 다음 행동을 제시합니다.',
        },
        {
          id: 'prompt-engineering',
          title: 'Prompt Engineering',
          summary: '교육용 출력 안정성을 높이는 프롬프트 방법을 연구합니다.',
          details:
            '템플릿, 컨텍스트 제어, 품질 검증을 통해 튜터 응답의 일관성과 설명 가능성을 개선합니다.',
        },
        {
          id: 'ai-ethics',
          title: 'AI Ethics & Philosophy',
          summary: 'AI 학습 환경의 윤리와 인간 중심 이슈를 다룹니다.',
          details:
            '데이터 경계, 편향 위험, 교육 형평성, 책임성 문제를 제품·커리큘럼 설계에 반영합니다.',
        },
        {
          id: 'ai-business',
          title: 'AI Business / AI Management',
          summary: 'AI 교육 전략과 조직 실행을 연결합니다.',
          details:
            '수요 검증, 운영 거버넌스, 성과 지표를 통해 학교와 기업의 실전형 AI 관리 모델을 만듭니다.',
        },
        {
          id: 'nexaeon-mvp',
          title: 'NexAeon MVP',
          summary: '최소 기능 제품으로 NexAeon 핵심 가치를 검증합니다.',
          details:
            '먼저 작동하는 V1 상호작용 루프를 완성하고, 이후 Notion·Airtable·API와 단계적으로 연동합니다.',
        },
      ],
    },
    knowledge: {
      eyebrow: 'Knowledge Base',
      title: '지식베이스',
      searchPlaceholder: '키워드 검색 (제목, 요약, 분류, 태그)',
      noResults: '조건에 맞는 자료가 없습니다.',
      categories: [
        { key: 'all', label: '전체' },
        { key: 'paper', label: '논문' },
        { key: 'course', label: '코스' },
        { key: 'tool', label: 'AI 도구' },
        { key: 'case', label: '수업 사례' },
        { key: 'note', label: '연구 노트' },
        { key: 'doc', label: '프로젝트 문서' },
      ],
      items: [
        {
          id: 'kb-1',
          categoryKey: 'paper',
          title: 'Adaptive Learning Pathways with LLM Tutors',
          summary: 'LLM 기반 적응형 학습 경로 설계와 성과를 분석합니다.',
          link: 'https://example.com/adaptive-learning-pathways',
          tags: ['LLM', 'adaptive learning', 'evaluation'],
        },
        {
          id: 'kb-2',
          categoryKey: 'course',
          title: 'Prompt Engineering for Educators',
          summary: '교사를 위한 프롬프트 실습 코스로 수업 템플릿과 상호작용 전략을 포함합니다.',
          link: 'https://example.com/prompt-engineering-educators',
          tags: ['prompt', 'teacher', 'curriculum'],
        },
        {
          id: 'kb-3',
          categoryKey: 'tool',
          title: 'NexAeon Prompt Lab',
          summary: '프롬프트 버전별 출력 품질을 비교·평가하는 도구입니다.',
          link: 'https://example.com/nexaeon-prompt-lab',
          tags: ['tooling', 'prompt', 'workflow'],
        },
        {
          id: 'kb-4',
          categoryKey: 'case',
          title: '고등 영어 쓰기 AI 수업 사례',
          summary: 'AI 튜터 개입 흐름과 학생 피드백을 기록한 수업 사례입니다.',
          link: 'https://example.com/ai-writing-case',
          tags: ['classroom', 'writing', 'student feedback'],
        },
        {
          id: 'kb-5',
          categoryKey: 'note',
          title: 'AI Ethics Reading Notes',
          summary: 'AI 윤리와 교육 형평성 이슈를 실천 가능한 원칙으로 정리합니다.',
          link: 'https://example.com/ai-ethics-notes',
          tags: ['ethics', 'policy', 'equity'],
        },
        {
          id: 'kb-6',
          categoryKey: 'doc',
          title: 'NexAeon MVP Product Spec',
          summary: '기능 정의, 데이터 구조, 검수 기준, V1 마일스톤을 문서화합니다.',
          link: 'https://example.com/nexaeon-mvp-spec',
          tags: ['spec', 'roadmap', 'mvp'],
        },
      ],
    },
    projects: {
      eyebrow: 'Projects',
      title: '프로젝트',
      items: [
        {
          id: 'project-1',
          title: 'NexAeon AI Tutoring MVP',
          subtitle: '개인화 AI 튜터 핵심 프로토타입',
          details: '질문 이해, 계층형 응답, 피드백 점수를 통합해 AI 튜터링 흐름을 검증합니다.',
        },
        {
          id: 'project-2',
          title: 'Woosong Buddy',
          subtitle: '캠퍼스 안내 및 신입생 지원 도우미',
          details: '수업·캠퍼스·생활 정보를 한곳에서 제공해 초기 적응 부담을 줄입니다.',
        },
        {
          id: 'project-3',
          title: 'GreenTrace',
          subtitle: '지속가능성 행동 추적 플랫폼',
          details: '지속가능성 활동을 시각화하고 개인·조직의 영향 추적을 지원합니다.',
        },
        {
          id: 'project-4',
          title: 'Admissions PDF System',
          subtitle: '입학 문서 지능형 처리 시스템',
          details: '입학 문서 추출·정리를 자동화해 심사 속도와 일관성을 높입니다.',
        },
        {
          id: 'project-5',
          title: 'AI 교육 연구 데이터베이스',
          subtitle: '연구 정리 및 검색 허브',
          details: '논문·노트·사례를 통합해 검색 가능한 연구 워크플로를 구축합니다.',
        },
        {
          id: 'project-6',
          title: 'NexAeon HQ Notion System',
          subtitle: 'R&D·운영 지식 협업 시스템',
          details: '프로젝트, 의사결정, 지식 자산을 중앙화해 협업 투명성을 높입니다.',
        },
      ],
    },
    assistant: {
      eyebrow: 'Nexōn AI Tutor',
      title: 'Nexōn 튜터',
      greeting: '안녕하세요, Nexōn 튜터입니다. 추천 질문을 누르거나 직접 입력해 보세요.',
      userLabel: '사용자',
      assistantLabel: 'Nexōn',
      inputPlaceholder: '질문을 입력하세요...',
      send: '보내기',
      fallback: '현재는 V1 목업 튜터입니다. 위의 4가지 추천 질문을 먼저 사용해 보세요.',
      qas: [
        {
          question: 'NexAeon은 무엇인가요?',
          answer:
            'NexAeon은 AI × Education에 초점을 둔 디지털 연구소형 웹사이트로, 연구·교육·지식 시스템을 실제 제품 실험과 연결합니다.',
          keywords: ['nexaeon', '무엇', '소개'],
        },
        {
          question: 'Joey의 연구 방향은 무엇인가요?',
          answer:
            'Joey의 연구 방향은 AI × Education, AI Tutoring System, Prompt Engineering, AI Ethics & Philosophy, AI Business / AI Management입니다.',
          keywords: ['joey', '연구', '방향'],
        },
        {
          question: '이 웹사이트는 학생에게 무엇을 제공하나요?',
          answer:
            '학생은 연구 방향 파악, 학습 자료 검색, 프로젝트 사례 확인, Nexōn 튜터의 초기 학습 가이드를 얻을 수 있습니다.',
          keywords: ['학생', '제공', '웹사이트'],
        },
        {
          question: '기업은 어떻게 협업할 수 있나요?',
          answer:
            '기업은 문의 폼을 통해 AI 교육 컨설팅, 사내 교육, 연구 협업, 제품 공동 개발 등의 협업 수요를 제안할 수 있습니다.',
          keywords: ['기업', '협업', '파트너십'],
        },
      ],
    },
    contact: {
      eyebrow: 'Contact & Collaboration',
      title: '협업 문의',
      namePlaceholder: '이름',
      identityPlaceholder: '신분',
      directionPlaceholder: '협업 방향',
      emailPlaceholder: '이메일',
      messagePlaceholder: '메시지',
      submit: '제출',
      identityOptions: ['학생', '교육자', '연구자', '기업 파트너', '기타'],
      directionOptions: ['AI 교육 컨설팅', '기업 교육 협업', '연구 협업', '제품 공동개발', '기타'],
      requiredMessage: '모든 항목을 입력해 주세요.',
      successMessage: '제출이 완료되었습니다. 확인 후 빠르게 연락드리겠습니다.',
    },
  },
};
