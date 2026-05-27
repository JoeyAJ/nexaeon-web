const CONTENT = {
  zh: {
    nav: {
      research: '研究',
      teaching: '教學',
      knowledge: '知識庫',
      essays: '文章',
    },
    hero: {
      eyebrow: 'AI 時代的數位研究所',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub: '一座正在生長的知識系統。\n它把靈感變成研究，把研究變成教學，把教學變成影響力。',
      cta1: '探索研究',
      cta2: '合作洽詢',
      meta: ['第 11 號實驗室', '建立於 2026', '大田 / 又鬆大'],
    },
    what: {
      label: '關於 / About',
      title: '一個由 Joey 建立的\nAI 教育研究品牌',
      body: 'NexAeon 不是一個個人網站，而是一座正在運轉的研究所。它連接四件事：研究、教學、知識管理、與未來合作 — 透過 AI 工具讓三者互相生長。',
      pillars: [
        { num: '01', t: '研究', d: '把日常思考轉為可驗證的命題' },
        { num: '02', t: '教學', d: '把研究結論轉為可被理解的語言' },
        { num: '03', t: '知識', d: '把教學沉澱為可被檢索的系統' },
        { num: '04', t: '合作', d: '把系統開放給學校、企業、研究者' },
      ],
    },
    forWhom: {
      label: 'For Whom',
      title: '為五種觀眾而生',
      sub: '同一座研究所，五種閱讀方式',
      items: [
        { id: '01', who: '學校', goal: '展示研究能力', desc: '完整的研究脈絡、方法論與輸出物，讓學術機構看見可被合作的能量。' },
        { id: '02', who: '學生', goal: '建立信任感', desc: '透明的學習路徑與真實案例，讓學習者知道他們將與誰一同前行。' },
        { id: '03', who: '教授', goal: '展示學術方向', desc: '可被引用的研究筆記與論文草稿，標示明確的研究主軸。' },
        { id: '04', who: '企業', goal: '呈現合作價值', desc: 'AI 教育落地的具體場景與專案結構，可直接展開合作對話。' },
        { id: '05', who: '自己', goal: '成為第二大腦', desc: '一座可被檢索、被連結、被持續編輯的個人知識系統。' },
      ],
    },
    labs: {
      label: 'Core Labs',
      title: '三個入口\n一個系統',
      items: [
        { tag: 'LAB · 01', name: 'Research Lab', desc: 'AI、教育、認知科學交界處的長期研究。論文、實驗、田野筆記。', stat: '12 篇進行中' },
        { tag: 'LAB · 02', name: 'Teaching Studio', desc: '把抽象研究翻譯成課程、工作坊、AI Tutor 原型。', stat: '4 堂公開課' },
        { tag: 'LAB · 03', name: 'Knowledge Lab', desc: '個人知識系統的建構、第二大腦的方法論與工具實驗。', stat: '300+ 筆記節點' },
      ],
    },
    essays: {
      label: 'Featured Essays',
      title: '在思考中',
      sub: '研究筆記、長文、未完成的想法',
      items: [
        {
          num: '№ 001', date: '2026.03', read: '12 min',
          title: 'AI 時代，教授應該變成什麼？',
          excerpt: '當大型模型能講課、改作業、回答問題，教授的不可被取代性，正在從「知識的擁有者」轉向「問題的設計者」。',
          tags: ['Education', 'Future of Work'],
        },
        {
          num: '№ 002', date: '2026.02', read: '9 min',
          title: '為什麼 AI Tutor 不只是工具？',
          excerpt: '把 AI Tutor 當作工具是低估它。它是一種新的學習關係 — 一個會問你問題的、永遠在線的、近乎透明的對話夥伴。',
          tags: ['AI', 'Pedagogy'],
        },
        {
          num: '№ 003', date: '2026.01', read: '15 min',
          title: 'NexAeon：從第二大腦到數位研究所',
          excerpt: '個人知識管理的下一步，不是更整齊的筆記，而是讓你的思考變成一個可被別人走進來的空間。',
          tags: ['Manifesto', 'Knowledge Systems'],
        },
      ],
    },
    collab: {
      label: 'Collaboration',
      title: '一起把問題\n做得更深一點',
      sub: '研究合作、課程設計、企業 AI 教育落地、學術引用 — 都歡迎',
      cta: '開啟合作對話',
      contact: 'AJ_Joey@nexaeon.studio',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      links: ['Research', 'Teaching', 'Knowledge', 'Essays', 'Contact'],
      tagline: 'A digital institute for the age of AI',
    },
  },

  en: {
    nav: {
      research: 'Research',
      teaching: 'Teaching',
      knowledge: 'Knowledge',
      essays: 'Essays',
    },
    hero: {
      eyebrow: 'A Digital Institute for the Age of AI',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub: 'A living knowledge system —\nturning ideas into research,\nresearch into teaching,\nteaching into influence.',
      cta1: 'Explore Research',
      cta2: 'Collaboration',
      meta: ['Lab № 11', 'Est. 2026', 'Daejeon / Woosong Univ.'],
    },
    what: {
      label: 'About',
      title: 'An AI education\nstudio by Joey',
      body: 'NexAeon is not a personal site — it is an institute in motion. It binds four things: research, teaching, knowledge management, and future collaboration — letting each grow into the others through AI.',
      pillars: [
        { num: '01', t: 'Research', d: 'Turning daily thoughts into testable propositions.' },
        { num: '02', t: 'Teaching', d: 'Translating findings into language students can hold.' },
        { num: '03', t: 'Knowledge', d: 'Distilling teaching into a system you can search.' },
        { num: '04', t: 'Collab', d: 'Opening that system to schools, firms, and peers.' },
      ],
    },
    forWhom: {
      label: 'For Whom',
      title: 'Built for five readers',
      sub: 'One institute, five ways to enter.',
      items: [
        { id: '01', who: 'Schools', goal: 'See research capacity', desc: 'A full trail of methodology, output, and citations — proof there is something worth partnering with.' },
        { id: '02', who: 'Students', goal: 'Earn trust', desc: 'Transparent learning paths and case studies, so they know who they are walking with.' },
        { id: '03', who: 'Faculty', goal: 'Read direction', desc: 'Citable notes and drafts, labeled with the questions actually being pursued.' },
        { id: '04', who: 'Industry', goal: 'Map collaboration', desc: 'Concrete scenarios for AI in education — ready for a real conversation.' },
        { id: '05', who: 'Myself', goal: 'A second brain', desc: 'A searchable, linkable, perpetually editable system of one.' },
      ],
    },
    labs: {
      label: 'Core Labs',
      title: 'Three doors\none system',
      items: [
        { tag: 'LAB · 01', name: 'Research Lab', desc: 'Long studies at the seams of AI, education, and cognition. Papers, experiments, field notes.', stat: '12 in progress' },
        { tag: 'LAB · 02', name: 'Teaching Studio', desc: 'Translating abstract research into courses, workshops, and AI tutor prototypes.', stat: '4 open courses' },
        { tag: 'LAB · 03', name: 'Knowledge Lab', desc: 'Building a personal knowledge system. Method and tooling for a second brain.', stat: '300+ nodes' },
      ],
    },
    essays: {
      label: 'Featured Essays',
      title: 'Thinking, in motion',
      sub: 'Research notes, long-form, half-finished ideas.',
      items: [
        {
          num: '№ 001', date: '2026.03', read: '12 min',
          title: 'What should a professor become, in the age of AI?',
          excerpt: 'When models can lecture, grade, and answer — what cannot be replaced shifts from owning knowledge to designing the questions worth asking.',
          tags: ['Education', 'Future of Work'],
        },
        {
          num: '№ 002', date: '2026.02', read: '9 min',
          title: 'An AI tutor is not just a tool.',
          excerpt: 'To call it a tool is to underestimate it. It is a new relationship — a partner that questions you back, always on, almost transparent.',
          tags: ['AI', 'Pedagogy'],
        },
        {
          num: '№ 003', date: '2026.01', read: '15 min',
          title: 'NexAeon: from second brain to digital institute.',
          excerpt: 'The next step for personal knowledge is not tidier notes — it is letting your thinking become a space others can walk into.',
          tags: ['Manifesto', 'Knowledge Systems'],
        },
      ],
    },
    collab: {
      label: 'Collaboration',
      title: 'Let’s make the\nquestion deeper',
      sub: 'Research partnerships, curriculum design, AI-education for industry, academic citation — all welcome.',
      cta: 'Open a conversation',
      contact: 'AJ_Joey@nexaeon.studio',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      links: ['Research', 'Teaching', 'Knowledge', 'Essays', 'Contact'],
      tagline: 'A digital institute for the age of AI',
    },
  },

  ko: {
    nav: {
      research: '리서치',
      teaching: '교육',
      knowledge: '지식',
      essays: '에세이',
    },
    hero: {
      eyebrow: 'AI 시대의 디지털 연구소',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub: '자라나는 지식 시스템.\n영감을 연구로, 연구를 교육으로,\n교육을 영향력으로.',
      cta1: '연구 살펴보기',
      cta2: '협업 문의',
      meta: ['Lab № 11', '2026 설립', '대전 / 우송대'],
    },
    what: {
      label: 'About',
      title: 'Joey가 세운\nAI 교육 리서치 스튜디오',
      body: 'NexAeon은 개인 웹사이트가 아니라, 움직이고 있는 연구소입니다. 연구·교육·지식관리·협업 — 네 가지를 AI로 엮어 서로가 서로를 키우게 합니다.',
      pillars: [
        { num: '01', t: '리서치', d: '일상의 생각을 검증 가능한 명제로.' },
        { num: '02', t: '교육', d: '결론을 학습자의 언어로 번역.' },
        { num: '03', t: '지식', d: '교육을 검색 가능한 시스템으로.' },
        { num: '04', t: '협업', d: '시스템을 외부에 열어두기.' },
      ],
    },
    forWhom: {
      label: 'For Whom',
      title: '다섯 명의 독자를 위해',
      sub: '하나의 연구소, 다섯 개의 입구.',
      items: [
        { id: '01', who: '학교', goal: '연구 역량 제시', desc: '방법론과 결과물의 흐름이 보이도록 — 협업할 만한 무게를 증명합니다.' },
        { id: '02', who: '학생', goal: '신뢰 형성', desc: '투명한 학습 경로와 사례. 누구와 함께 걷는지 알게 합니다.' },
        { id: '03', who: '교수진', goal: '연구 방향 공개', desc: '인용 가능한 노트와 초안 — 어떤 질문을 따라가는지 명시합니다.' },
        { id: '04', who: '기업', goal: '협업 가치', desc: 'AI 교육의 실제 적용 사례. 곧바로 대화로 이어갈 수 있도록.' },
        { id: '05', who: '나 자신', goal: '제2의 뇌', desc: '검색되고, 연결되고, 끝없이 다시 쓰이는 개인 지식 시스템.' },
      ],
    },
    labs: {
      label: 'Core Labs',
      title: '세 개의 문\n하나의 시스템',
      items: [
        { tag: 'LAB · 01', name: 'Research Lab', desc: 'AI · 교육 · 인지의 접점에서 진행되는 장기 연구.', stat: '진행 중 12건' },
        { tag: 'LAB · 02', name: 'Teaching Studio', desc: '추상 연구를 강의, 워크숍, AI 튜터로 옮기기.', stat: '공개 강의 4건' },
        { tag: 'LAB · 03', name: 'Knowledge Lab', desc: '개인 지식 시스템과 제2의 뇌를 위한 방법론.', stat: '노드 300+' },
      ],
    },
    essays: {
      label: 'Featured Essays',
      title: '생각하는 중',
      sub: '연구 노트, 긴 글, 미완성의 생각들.',
      items: [
        {
          num: '№ 001', date: '2026.03', read: '12 min',
          title: 'AI 시대, 교수는 무엇이 되어야 하는가?',
          excerpt: '모델이 강의하고 채점하고 답할 수 있을 때, 대체 불가능성은 「지식의 소유자」에서 「질문의 설계자」로 옮겨갑니다.',
          tags: ['Education', 'Future of Work'],
        },
        {
          num: '№ 002', date: '2026.02', read: '9 min',
          title: 'AI 튜터는 단지 도구가 아니다.',
          excerpt: '도구라고 부르면 과소평가입니다. 그것은 새로운 학습 관계 — 늘 켜져 있고, 거의 투명한, 되묻는 동반자.',
          tags: ['AI', 'Pedagogy'],
        },
        {
          num: '№ 003', date: '2026.01', read: '15 min',
          title: 'NexAeon: 제2의 뇌에서 디지털 연구소로.',
          excerpt: '개인 지식의 다음 단계는 더 단정한 노트가 아니라, 타인이 걸어 들어올 수 있는 공간이 되는 것입니다.',
          tags: ['Manifesto', 'Knowledge Systems'],
        },
      ],
    },
    collab: {
      label: 'Collaboration',
      title: '질문을 더 깊게,\n함께',
      sub: '연구 협력, 커리큘럼 설계, 기업 AI 교육, 학술 인용 — 모두 환영합니다.',
      cta: '대화 시작하기',
      contact: 'AJ_Joey@nexaeon.studio',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      links: ['Research', 'Teaching', 'Knowledge', 'Essays', 'Contact'],
      tagline: 'A digital institute for the age of AI',
    },
  },
};

export default CONTENT;
