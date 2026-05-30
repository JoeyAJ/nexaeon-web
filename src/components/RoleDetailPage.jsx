import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import NeuralBackground from './NeuralBackground.jsx';

const ROLE_DETAIL_CONTENT = {
  zh: {
    common: {
      roleDetailLabel: '身份頁面',
      backHome: '返回首頁',
      challengeTitle: '這個角色面臨的問題',
      solutionTitle: 'NexAeon 如何協助',
      capabilitiesTitle: '相關能力模組',
      futureTitle: '未來接入方向',
      futureIntro: '本頁目前為前端展示版本。下一階段可接入以下外部能力：',
      ctaLabel: '下一步行動',
      notFoundTitle: '角色頁面尚未建立',
      notFoundBody: '這個角色路由目前沒有對應內容。',
    },
    futureConnections: [
      'Notion 知識庫',
      'Airtable 研究／專案追蹤',
      'n8n 自動化工作流',
      'AI 代理／RAG 知識層',
    ],
    roles: {
      students: {
        name: '學生',
        tagline: '把 AI 變成你的學習搭檔，而不是一次性答案機。',
        description: '為學習者建立可持續成長的 AI 學習路徑，從提問、反思到任務輸出都可被追蹤與優化。',
        problems: [
          '不知道如何正確使用 AI 學習',
          '提問設計能力不足，容易得到表面答案',
          '缺少個別化回饋與學習路徑',
        ],
        solutions: [
          'AI 個別化學習輔助',
          '提示工程基礎訓練',
          '學習風格與任務回饋',
        ],
        capabilities: [
          'AI 個別化輔學實驗室',
          '個別化回饋系統',
          '提示工程課程',
        ],
        ctaText: '開始 AI 學習路徑',
        ctaPath: '/#research',
      },
      researchers: {
        name: '教授／研究者',
        tagline: '把研究問題、模型與合作提案整理成可展示路徑。',
        description: '聚焦 AI 教育研究場景，幫助研究成果從零散材料轉為可清楚溝通的知識結構。',
        problems: [
          '研究主題、文獻與模型分散',
          'AI 教育研究缺少清晰展示路徑',
          '跨學科合作難以快速理解研究價值',
        ],
        solutions: [
          'AI 教育研究模型展示',
          '文獻與研究資料庫入口',
          '跨學科研究合作提案',
        ],
        capabilities: [
          '研究中樞',
          'TAM／學習參與模型',
          '文獻知識庫',
        ],
        ctaText: '探索研究方向',
        ctaPath: '/#research',
      },
      university: {
        name: '學校／管理者',
        tagline: '用可視化與可執行方案推動校務 AI 轉型。',
        description: '把教學、招生、行政與決策流程整合為可落地的轉型路線圖，降低導入風險。',
        problems: [
          '傳統教育轉型壓力加大',
          '行政與招生流程仍高度人工',
          'AI 教育創新缺少可展示的原型',
        ],
        solutions: [
          'AI 教育轉型方案',
          '招生與行政流程自動化',
          '數據分析與決策輔助',
        ],
        capabilities: [
          '大學 AI 轉型',
          '招生與行政自動化',
          '學習分析',
        ],
        ctaText: '查看 AI 轉型方案',
        ctaPath: '/#projects',
      },
      enterprise: {
        name: '企業／合作方',
        tagline: '從概念到可驗證 MVP，縮短 AI 專案落地距離。',
        description: '協助企業把 AI、ESG、教育科技與自動化場景整合成可共創的合作方案。',
        problems: [
          'AI 應用難以從概念落地',
          'ESG、教育科技與自動化場景缺少整合方案',
          '缺少低成本 MVP 驗證方式',
        ],
        solutions: [
          'AI 代理原型',
          'ESG × AI 應用方案',
          '自動化與數據分析工作流',
        ],
        capabilities: [
          '企業 AI 解決方案',
          'ESG × AI 專案',
          'n8n 自動化工作流',
        ],
        ctaText: '探索合作可能',
        ctaPath: '/#contact',
      },
      'second-brain': {
        name: 'Joey 的第二大腦',
        tagline: '把研究、課程、工具與專案整合為長期可累積的知識中樞。',
        description: '建立個人化知識運作系統，讓教學與研究資產能持續沉澱、重組與再利用。',
        problems: [
          '研究、課程、項目、工具分散',
          '知識資產難以長期積累',
          '缺少能服務未來教學與研究的個人中樞',
        ],
        solutions: [
          '研究主題與文獻管理',
          '課程與教學素材管理',
          'AI 項目與 MVP 管理',
        ],
        capabilities: [
          '知識庫',
          '專案工作室',
          '研究中樞',
        ],
        ctaText: '進入知識中樞',
        ctaPath: '/#knowledge',
      },
    },
  },
  en: {
    common: {
      roleDetailLabel: 'Role Detail Page',
      backHome: 'Back to Home',
      challengeTitle: "This role's challenge",
      solutionTitle: 'How NexAeon helps',
      capabilitiesTitle: 'Related Capabilities',
      futureTitle: 'Future Connection',
      futureIntro: 'This page is currently a frontend showcase. The next phase can connect these layers:',
      ctaLabel: 'Primary Action',
      notFoundTitle: 'Role Page Not Found',
      notFoundBody: 'No role content is mapped for this route yet.',
    },
    futureConnections: [
      'Notion Knowledge Base',
      'Airtable Research / Project Tracker',
      'n8n Automation Workflow',
      'AI Agent / RAG Layer',
    ],
    roles: {
      students: {
        name: 'Students',
        tagline: 'Turn AI into a learning partner, not a one-off answer tool.',
        description: 'Build a sustainable AI learning path where prompting, reflection, and output can be continuously improved.',
        problems: [
          'Unclear how to use AI for real learning',
          'Weak prompt skills often lead to shallow answers',
          'Lack of personalized feedback and learning pathways',
        ],
        solutions: [
          'Personalized AI Tutor support',
          'Prompt Engineering foundation training',
          'Learning-style and task feedback',
        ],
        capabilities: [
          'AI Tutoring Lab',
          'Personalized Feedback System',
          'Prompt Engineering Course',
        ],
        ctaText: 'Start AI Learning Path',
        ctaPath: '/#research',
      },
      researchers: {
        name: 'Professors & Researchers',
        tagline: 'Turn scattered studies into a clear research communication flow.',
        description: 'Support AI-education researchers in presenting themes, models, and evidence with clearer structure.',
        problems: [
          'Research topics, literature, and models are fragmented',
          'AI-education studies lack a clear presentation path',
          'Cross-disciplinary partners struggle to see research value quickly',
        ],
        solutions: [
          'AI education model showcase',
          'Literature and research database entry point',
          'Cross-disciplinary research collaboration proposals',
        ],
        capabilities: [
          'Research Hub',
          'TAM / Learning Engagement Model',
          'Literature Knowledge Base',
        ],
        ctaText: 'Explore Research Direction',
        ctaPath: '/#research',
      },
      university: {
        name: 'University Leaders',
        tagline: 'Drive academic transformation with practical AI roadmaps.',
        description: 'Align education, admissions, administration, and data-driven decisions in one transformation narrative.',
        problems: [
          'Growing pressure to modernize traditional education',
          'Admissions and administration are still highly manual',
          'AI education innovation lacks demonstrable prototypes',
        ],
        solutions: [
          'AI education transformation plan',
          'Admissions and admin process automation',
          'Analytics-powered decision support',
        ],
        capabilities: [
          'University AI Transformation',
          'Admissions & Admin Automation',
          'Learning Analytics',
        ],
        ctaText: 'View AI Transformation Plan',
        ctaPath: '/#projects',
      },
      enterprise: {
        name: 'Enterprise Partners',
        tagline: 'Move from AI concepts to validated MVPs faster.',
        description: 'Integrate AI, ESG, EdTech, and workflow automation into collaboration-ready solutions.',
        problems: [
          'AI ideas are hard to operationalize',
          'No integrated framework for ESG, EdTech, and automation use cases',
          'Lack of low-cost ways to validate MVP ideas',
        ],
        solutions: [
          'AI Agent Prototype',
          'ESG × AI solution planning',
          'Automation and analytics workflows',
        ],
        capabilities: [
          'Enterprise AI Solution',
          'ESG × AI Project',
          'n8n Workflow',
        ],
        ctaText: 'Explore Collaboration',
        ctaPath: '/#contact',
      },
      'second-brain': {
        name: "Joey's Second Brain",
        tagline: 'Unify knowledge assets for long-term teaching and research leverage.',
        description: 'Create a personal operating hub for research, courses, tools, and projects that compounds over time.',
        problems: [
          'Research, courses, projects, and tools are scattered',
          'Knowledge assets are difficult to accumulate long term',
          'No central system to support future teaching and research',
        ],
        solutions: [
          'Research themes and literature management',
          'Course and teaching material management',
          'AI project and MVP management',
        ],
        capabilities: [
          'Knowledge Base',
          'Project Studio',
          'Research Hub',
        ],
        ctaText: 'Enter Knowledge Hub',
        ctaPath: '/#knowledge',
      },
    },
  },
  ko: {
    common: {
      roleDetailLabel: '역할 상세 페이지',
      backHome: '홈으로 돌아가기',
      challengeTitle: '이 역할의 문제',
      solutionTitle: 'NexAeon의 지원 방식',
      capabilitiesTitle: '관련 역량 모듈',
      futureTitle: '향후 연동 방향',
      futureIntro: '현재 페이지는 프론트엔드 시연 버전이며, 다음 단계에서 아래 레이어를 연동할 수 있습니다:',
      ctaLabel: '주요 액션',
      notFoundTitle: '역할 페이지를 찾을 수 없습니다',
      notFoundBody: '이 경로에 연결된 역할 콘텐츠가 아직 없습니다.',
    },
    futureConnections: [
      'Notion 지식베이스',
      'Airtable 연구／프로젝트 추적',
      'n8n 자동화 워크플로',
      'AI 에이전트／RAG 지식 레이어',
    ],
    roles: {
      students: {
        name: '학생',
        tagline: 'AI를 일회성 답변 도구가 아닌 학습 파트너로 전환합니다.',
        description: '프롬프트, 성찰, 과제 실행까지 이어지는 지속형 AI 학습 경로를 설계합니다.',
        problems: [
          'AI를 학습에 제대로 활용하는 방법이 불명확함',
          '프롬프트 역량 부족으로 피상적 답변에 머무름',
          '개인화 피드백과 학습 경로가 부족함',
        ],
        solutions: [
          'AI 개인화 학습 보조',
          '프롬프트 엔지니어링 기초 훈련',
          '학습 스타일 및 과제 피드백',
        ],
        capabilities: [
          'AI 튜터링 랩',
          '개인화 피드백 시스템',
          '프롬프트 엔지니어링 과정',
        ],
        ctaText: 'AI 학습 경로 시작',
        ctaPath: '/#research',
      },
      researchers: {
        name: '교수／연구자',
        tagline: '분산된 연구 자산을 명확한 연구 흐름으로 재구성합니다.',
        description: 'AI 교육 연구 주제와 근거를 구조화해 더 빠른 협업과 전달력을 지원합니다.',
        problems: [
          '연구 주제, 문헌, 모델이 분산되어 있음',
          'AI 교육 연구를 보여줄 명확한 경로가 부족함',
          '융합 협업에서 연구 가치 전달이 느림',
        ],
        solutions: [
          'AI 교육 연구 모델 전시',
          '문헌 및 연구 데이터베이스 진입점',
          '융합 연구 협업 제안',
        ],
        capabilities: [
          '연구 허브',
          'TAM／학습 참여 모델',
          '문헌 지식베이스',
        ],
        ctaText: '연구 방향 탐색',
        ctaPath: '/#research',
      },
      university: {
        name: '학교／관리자',
        tagline: '실행 가능한 AI 전환 플랜으로 대학 혁신을 가속합니다.',
        description: '교육, 입학, 행정, 데이터 의사결정을 하나의 전환 시나리오로 연결합니다.',
        problems: [
          '전통 교육 체계 전환 압력이 커지고 있음',
          '입학 및 행정 프로세스가 여전히 수작업 중심임',
          'AI 교육 혁신을 보여줄 프로토타입이 부족함',
        ],
        solutions: [
          'AI 교육 전환 플랜',
          '입학 및 행정 자동화',
          '데이터 기반 의사결정 지원',
        ],
        capabilities: [
          '대학 AI 전환',
          '입학·행정 자동화',
          '학습 분석',
        ],
        ctaText: 'AI 전환 계획 보기',
        ctaPath: '/#projects',
      },
      enterprise: {
        name: '기업／협력 파트너',
        tagline: 'AI 아이디어를 빠르게 MVP로 검증 가능한 형태로 전환합니다.',
        description: 'AI, ESG, 교육기술, 자동화 시나리오를 하나의 협력형 솔루션으로 통합합니다.',
        problems: [
          'AI 적용이 개념 단계에서 멈추기 쉬움',
          'ESG, 교육기술, 자동화 시나리오를 묶는 통합안이 부족함',
          '저비용 MVP 검증 방식이 부족함',
        ],
        solutions: [
          'AI 에이전트 프로토타입',
          'ESG × AI 적용 기획',
          '자동화 및 데이터 분석 워크플로',
        ],
        capabilities: [
          '기업 AI 솔루션',
          'ESG × AI 프로젝트',
          'n8n 자동화 워크플로',
        ],
        ctaText: '협업 가능성 탐색',
        ctaPath: '/#contact',
      },
      'second-brain': {
        name: 'Joey의 두 번째 두뇌',
        tagline: '연구와 수업 자산을 장기적으로 축적되는 지식 허브로 통합합니다.',
        description: '연구, 강의, 도구, 프로젝트를 연결해 미래 교육과 연구에 재사용 가능한 개인 시스템을 만듭니다.',
        problems: [
          '연구, 수업, 프로젝트, 도구가 분산됨',
          '지식 자산의 장기 축적이 어려움',
          '미래 교육과 연구를 위한 개인 허브가 부족함',
        ],
        solutions: [
          '연구 주제 및 문헌 관리',
          '수업 및 교육 자료 관리',
          'AI 프로젝트 및 MVP 관리',
        ],
        capabilities: [
          '지식베이스',
          '프로젝트 스튜디오',
          '연구 허브',
        ],
        ctaText: '지식 허브로 이동',
        ctaPath: '/#knowledge',
      },
    },
  },
};

function ListCardSection({ title, items }) {
  return (
    <section className="liquid-glass-card" style={{ marginTop: 18, borderRadius: 20, padding: '16px clamp(14px, 2.8vw, 22px)' }}>
      <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 12 }}>
        {title}
      </div>
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {items.map((item) => (
          <article
            key={item}
            className="liquid-glass-card"
            style={{
              borderRadius: 16,
              padding: 16,
              color: 'var(--fg-2)',
              lineHeight: 1.7,
              minHeight: 110,
            }}
          >
            {item}
          </article>
        ))}
      </div>
    </section>
  );
}

function NotFound({ locale, navigate, setLang, lang }) {
  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingTop: 90, paddingBottom: 120 }}>
      <NeuralBackground />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-1)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <NexLogo size={26} />
            <NexWordmark size={18} />
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
        <div
          className="content-detail-card"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            borderRadius: 24,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.1 }}>
            {locale.common.notFoundTitle}
          </div>
          <p style={{ marginTop: 16, color: 'var(--fg-2)', lineHeight: 1.7 }}>{locale.common.notFoundBody}</p>
          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate('/')}>
            {locale.common.backHome}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function RoleDetailPage({ role, navigate, lang, setLang }) {
  const locale = ROLE_DETAIL_CONTENT[lang] || ROLE_DETAIL_CONTENT.en;
  const roleContent = locale.roles[role];

  if (!roleContent) {
    return <NotFound locale={locale} navigate={navigate} setLang={setLang} lang={lang} />;
  }

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingTop: 78, paddingBottom: 100 }}>
      <NeuralBackground />
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Back to home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-1)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <NexLogo size={28} />
            <NexWordmark size={20} />
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
        </header>

        <section
          className="liquid-glass-card content-detail-card"
          style={{
            borderRadius: 24,
            padding: '28px clamp(18px, 4vw, 40px)',
          }}
        >
          <div className="label" style={{ color: 'var(--accent-fg)' }}>
            {locale.common.roleDetailLabel}
          </div>
          <h1
            style={{
              margin: '14px 0 0',
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(42px, 6vw, 76px)',
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
            }}
          >
            {roleContent.name}
          </h1>
          <p style={{ marginTop: 14, color: 'var(--fg-1)', fontSize: 20, lineHeight: 1.45 }}>{roleContent.tagline}</p>
          <p style={{ marginTop: 12, color: 'var(--fg-2)', lineHeight: 1.72, maxWidth: 900 }}>{roleContent.description}</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              {locale.common.backHome}
            </button>
          </div>
        </section>

        <ListCardSection title={locale.common.challengeTitle} items={roleContent.problems} />
        <ListCardSection title={locale.common.solutionTitle} items={roleContent.solutions} />
        <ListCardSection title={locale.common.capabilitiesTitle} items={roleContent.capabilities} />

        <section
          className="liquid-glass-card"
          style={{
            marginTop: 18,
            borderRadius: 20,
            padding: '20px clamp(16px, 3vw, 24px)',
          }}
        >
          <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 10 }}>
            {locale.common.futureTitle}
          </div>
          <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.72 }}>{locale.common.futureIntro}</p>
          <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--fg-2)', lineHeight: 1.8 }}>
            {locale.futureConnections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section
          className="liquid-glass-card"
          style={{
            marginTop: 18,
            borderRadius: 20,
            padding: '20px clamp(16px, 3vw, 24px)',
            textAlign: 'center',
          }}
        >
          <div className="label" style={{ marginBottom: 10 }}>
            {locale.common.ctaLabel}
          </div>
          <button className="btn btn-gradient" style={{ fontSize: 15 }} onClick={() => navigate(roleContent.ctaPath)}>
            {roleContent.ctaText}
          </button>
        </section>
      </div>
    </main>
  );
}
