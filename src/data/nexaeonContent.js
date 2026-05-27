const CONTENT_ITEMS = {
  research: [
    {
      id: 'ai-education',
      type: 'research',
      tags: ['AI Education', 'Learning Design', 'Assessment'],
      category: { zh: '研究方向', en: 'Research', ko: '연구' },
      title: { zh: 'AI 教育', en: 'AI Education', ko: 'AI 교육' },
      subtitle: {
        zh: '以可驗證的方法重寫教與學的設計。',
        en: 'Redesign teaching and learning with testable methods.',
        ko: '검증 가능한 방법으로 가르침과 배움의 구조를 다시 설계합니다.',
      },
      status: { zh: '持續研究中', en: 'Ongoing Research', ko: '지속 연구 중' },
      summary: {
        zh: '聚焦 AI 在課堂中的實際介入點，從學習診斷到成果評估建立完整研究鏈。',
        en: 'Focuses on practical classroom intervention points and builds a full chain from diagnosis to outcome evaluation.',
        ko: '교실 내 실제 개입 지점을 중심으로 학습 진단부터 성과 평가까지 하나의 연구 체계를 구축합니다.',
      },
      description: {
        zh: '我們關注的不只是工具導入，而是教學策略是否真的提升理解、參與與遷移能力。研究範圍涵蓋課程設計、回饋機制與教師決策支援。',
        en: 'We go beyond tool adoption and examine whether instructional strategy truly improves understanding, engagement, and transfer. Scope includes curriculum design, feedback systems, and teacher decision support.',
        ko: '단순 도구 도입을 넘어서 수업 전략이 이해도·참여도·전이 능력을 실제로 높이는지 검증합니다. 커리큘럼 설계, 피드백 구조, 교사 의사결정 지원을 함께 다룹니다.',
      },
      nextStep: {
        zh: '完成三個課堂案例的結構化比較，產出第一版研究白皮書。',
        en: 'Complete a structured comparison of three classroom cases and publish the first research white paper.',
        ko: '세 가지 수업 사례의 구조화 비교를 완료하고 1차 연구 화이트페이퍼를 발행합니다.',
      },
    },
    {
      id: 'personalized-ai-tutor',
      type: 'research',
      tags: ['AI Tutor', 'Personalization', 'Learning Path'],
      category: { zh: '研究方向', en: 'Research', ko: '연구' },
      title: { zh: '個人化 AI Tutor', en: 'Personalized AI Tutor', ko: '개인화 AI 튜터' },
      subtitle: {
        zh: '讓每位學習者都有可持續對話的學習夥伴。',
        en: 'Give every learner a partner for continuous academic dialogue.',
        ko: '모든 학습자에게 지속 대화형 학습 파트너를 제공합니다.',
      },
      status: { zh: '原型驗證中', en: 'Prototype Validation', ko: '프로토타입 검증 중' },
      summary: {
        zh: '研究 AI Tutor 如何依學習者程度、節奏與目標，給出可執行的下一步引導。',
        en: 'Studies how an AI tutor adapts to learner level, pace, and goals to provide executable next actions.',
        ko: '학습 수준·속도·목표에 맞춰 실행 가능한 다음 행동을 제시하는 AI 튜터 전략을 연구합니다.',
      },
      description: {
        zh: '核心問題是如何讓回應既精準又有人性。我們建立分層回覆策略、學習歷程記憶與提示調節機制，降低錯誤依賴並提升自主學習。',
        en: 'The core question is how responses can be both precise and humane. We design layered response strategies, learning-memory structures, and prompt-control mechanisms to reduce blind dependence and strengthen autonomy.',
        ko: '핵심 질문은 응답의 정확성과 인간적 맥락을 동시에 확보하는 것입니다. 계층형 응답, 학습 이력 기억, 프롬프트 조절 구조를 통해 오의존을 줄이고 자기주도성을 높입니다.',
      },
      nextStep: {
        zh: '完成 Tutor 對話策略 A/B 測試，優化初學者與進階者兩種模式。',
        en: 'Run A/B tests on tutor dialogue strategies and optimize both beginner and advanced modes.',
        ko: '튜터 대화 전략 A/B 테스트를 완료하고 초급·고급 모드를 각각 최적화합니다.',
      },
    },
    {
      id: 'prompt-engineering-teaching',
      type: 'research',
      tags: ['Prompt Engineering', 'Curriculum', 'Pedagogy'],
      category: { zh: '研究方向', en: 'Research', ko: '연구' },
      title: {
        zh: 'Prompt Engineering 教學',
        en: 'Prompt Engineering Education',
        ko: '프롬프트 엔지니어링 교육',
      },
      subtitle: {
        zh: '把提示詞能力轉化為可教、可練、可評估的課程。',
        en: 'Turn prompting into a teachable, trainable, and assessable curriculum.',
        ko: '프롬프트 역량을 가르칠 수 있고 연습 가능하며 평가 가능한 커리큘럼으로 전환합니다.',
      },
      status: { zh: '課程設計中', en: 'Curriculum Design', ko: '커리큘럼 설계 중' },
      summary: {
        zh: '建立教育場域專用的 Prompt 方法論，讓學生從直覺提問走向結構化思考。',
        en: 'Builds a prompt methodology for education so students move from intuitive asking to structured reasoning.',
        ko: '교육 현장 전용 프롬프트 방법론을 구축해 직관적 질문에서 구조적 사고로 전환하도록 돕습니다.',
      },
      description: {
        zh: '我們將提示詞拆解為目標、上下文、約束與輸出格式四層，結合 rubrics 與案例演練，提升表達品質與問題定義能力。',
        en: 'Prompts are decomposed into goal, context, constraints, and output format. Combined with rubrics and case practice, this improves expression quality and problem framing.',
        ko: '프롬프트를 목표·맥락·제약·출력 형식 네 층으로 분해하고 루브릭과 사례 실습을 결합해 표현 품질과 문제정의 능력을 향상시킵니다.',
      },
      nextStep: {
        zh: '發布首版 Prompt 教學框架與課堂練習模板。',
        en: 'Publish v1 of the prompt teaching framework and classroom practice templates.',
        ko: '프롬프트 교육 프레임워크 v1과 수업 실습 템플릿을 공개합니다.',
      },
    },
    {
      id: 'ai-learning-engagement',
      type: 'research',
      tags: ['Engagement', 'Learning Analytics', 'AI Feedback'],
      category: { zh: '研究方向', en: 'Research', ko: '연구' },
      title: { zh: 'AI × 學習參與度', en: 'AI × Learning Engagement', ko: 'AI × 학습 참여도' },
      subtitle: {
        zh: '把學習動機與參與品質轉成可追蹤的訊號。',
        en: 'Translate motivation and participation quality into trackable signals.',
        ko: '학습 동기와 참여 품질을 추적 가능한 신호로 전환합니다.',
      },
      status: { zh: '資料蒐集中', en: 'Data Collection', ko: '데이터 수집 중' },
      summary: {
        zh: '研究 AI 回饋頻率、互動形式與學習參與度之間的關係，建立可操作指標。',
        en: 'Examines relationships among AI feedback frequency, interaction style, and learner engagement to form actionable metrics.',
        ko: 'AI 피드백 빈도, 상호작용 방식, 학습 참여도의 관계를 분석해 실행 가능한 지표를 만듭니다.',
      },
      description: {
        zh: '我們不只看完成率，而是關注提問深度、反思品質與持續參與。透過行為資料與質性紀錄交叉分析，建立可被教學現場採用的參與度模型。',
        en: 'Completion rate is not enough. We track question depth, reflection quality, and sustained participation, then cross-analyze behavioral and qualitative records to build a classroom-ready engagement model.',
        ko: '완료율만 보지 않고 질문 깊이, 성찰 품질, 지속 참여를 함께 봅니다. 행동 데이터와 질적 기록을 교차 분석해 수업 현장에서 활용 가능한 참여도 모델을 구축합니다.',
      },
      nextStep: {
        zh: '定義第一版 Engagement Index，並套用於兩門課的實測資料。',
        en: 'Define Engagement Index v1 and apply it to field data from two courses.',
        ko: 'Engagement Index v1을 정의하고 두 과목의 실측 데이터에 적용합니다.',
      },
    },
    {
      id: 'ai-education-ethics-philosophy',
      type: 'research',
      tags: ['AI Ethics', 'Philosophy of Education', 'Governance'],
      category: { zh: '研究方向', en: 'Research', ko: '연구' },
      title: {
        zh: 'AI × 教育倫理與哲學',
        en: 'AI × Education Ethics and Philosophy',
        ko: 'AI × 교육 윤리와 철학',
      },
      subtitle: {
        zh: '在效率之外，持續追問教育的邊界與責任。',
        en: 'Beyond efficiency, keep questioning educational boundaries and responsibility.',
        ko: '효율을 넘어 교육의 경계와 책임을 지속적으로 질문합니다.',
      },
      status: { zh: '長期議題', en: 'Long-term Inquiry', ko: '장기 연구 의제' },
      summary: {
        zh: '探討 AI 教學中的公平性、透明性與人本價值，建立設計與治理原則。',
        en: 'Investigates fairness, transparency, and human-centered values in AI learning contexts to shape design and governance principles.',
        ko: 'AI 학습 맥락의 공정성, 투명성, 인간 중심 가치를 탐구해 설계·거버넌스 원칙을 정립합니다.',
      },
      description: {
        zh: '當 AI 進入教育，關鍵不只在可用，而在是否值得使用。我們從偏誤、權力關係、評量正義與學習主體性切入，提出可落地的倫理檢核清單。',
        en: 'When AI enters education, the key is not only usability but worthiness. We address bias, power relations, assessment justice, and learner agency to produce a practical ethics checklist.',
        ko: 'AI가 교육에 들어올 때 중요한 것은 사용 가능성만이 아니라 사용할 가치입니다. 편향, 권력관계, 평가의 정의, 학습자 주체성을 중심으로 실행 가능한 윤리 점검표를 만듭니다.',
      },
      nextStep: {
        zh: '完成倫理框架 v1，導入 NexAeon 產品與課程評估流程。',
        en: 'Finalize Ethics Framework v1 and embed it in NexAeon product and curriculum evaluation.',
        ko: '윤리 프레임워크 v1을 완성하고 NexAeon 제품·수업 평가 프로세스에 적용합니다.',
      },
    },
  ],
  projects: [
    {
      id: 'nexaeon-website',
      type: 'projects',
      tags: ['Brand', 'Frontend', 'Content System'],
      category: { zh: '項目展示', en: 'Projects', ko: '프로젝트' },
      title: { zh: 'NexAeon Website', en: 'NexAeon Website', ko: 'NexAeon Website' },
      subtitle: {
        zh: '品牌主站與研究展示入口。',
        en: 'Main brand site and research showcase gateway.',
        ko: '브랜드 메인 사이트이자 연구 소개 게이트웨이.',
      },
      status: { zh: '迭代中', en: 'In Iteration', ko: '지속 개선 중' },
      summary: {
        zh: '整合研究、知識、項目與助教互動，建立對外一致的內容與體驗層。',
        en: 'Integrates research, knowledge, projects, and tutor interaction into one coherent public experience layer.',
        ko: '연구·지식·프로젝트·튜터 상호작용을 통합해 일관된 대외 경험 레이어를 구축합니다.',
      },
      description: {
        zh: '網站不是單純作品集，而是數位研究所的操作介面。目標是讓不同受眾都能快速理解研究主軸、方法深度與合作可能。',
        en: 'The site is not a portfolio but an operational interface for a digital institute. It helps different audiences quickly understand research direction, methodological depth, and collaboration potential.',
        ko: '이 사이트는 단순 포트폴리오가 아니라 디지털 연구소의 운영 인터페이스입니다. 다양한 독자가 연구 방향, 방법의 깊이, 협업 가능성을 빠르게 파악하도록 설계했습니다.',
      },
      nextStep: {
        zh: '完成內容資料層、詳情頁、與後續觀測事件埋點規劃。',
        en: 'Complete the content layer, detail pages, and event instrumentation plan.',
        ko: '콘텐츠 레이어, 상세 페이지, 이벤트 계측 계획을 완료합니다.',
      },
    },
    {
      id: 'nexaeon-knowledge-hub',
      type: 'projects',
      tags: ['Knowledge Base', 'Search', 'Taxonomy'],
      category: { zh: '項目展示', en: 'Projects', ko: '프로젝트' },
      title: { zh: 'NexAeon Knowledge Hub', en: 'NexAeon Knowledge Hub', ko: 'NexAeon Knowledge Hub' },
      subtitle: {
        zh: '可搜尋、可分類、可持續擴充的知識層。',
        en: 'A searchable, classifiable, and extensible knowledge layer.',
        ko: '검색·분류·확장이 가능한 지식 레이어.',
      },
      status: { zh: '功能穩定化', en: 'Stabilizing', ko: '기능 안정화 중' },
      summary: {
        zh: '將研究筆記與方法資產系統化，支援跨主題探索與快速檢索。',
        en: 'Systematizes research notes and methodological assets for cross-topic exploration and rapid retrieval.',
        ko: '연구 노트와 방법 자산을 체계화해 주제 간 탐색과 빠른 검색을 지원합니다.',
      },
      description: {
        zh: 'Knowledge Hub 目標是把零散筆記轉成可被檢索與複用的知識節點，並透過分類與標籤保持結構清晰，降低維護成本。',
        en: 'The goal is to turn scattered notes into reusable, searchable knowledge nodes. Classification and tags keep structure clear and maintenance lean.',
        ko: '흩어진 노트를 검색·재사용 가능한 지식 노드로 전환하는 것이 목표입니다. 분류와 태그로 구조를 선명하게 유지해 운영 비용을 낮춥니다.',
      },
      nextStep: {
        zh: '加入更多實證案例，並規劃知識節點間的關聯視圖。',
        en: 'Add more empirical cases and plan relationship views across knowledge nodes.',
        ko: '실증 사례를 추가하고 지식 노드 간 연관 뷰를 설계합니다.',
      },
    },
    {
      id: 'ai-tutoring-mvp',
      type: 'projects',
      tags: ['MVP', 'Tutor', 'Product Validation'],
      category: { zh: '項目展示', en: 'Projects', ko: '프로젝트' },
      title: { zh: 'AI Tutoring MVP', en: 'AI Tutoring MVP', ko: 'AI Tutoring MVP' },
      subtitle: {
        zh: '以最小可行產品驗證 AI 助教價值。',
        en: 'Validate the value of an AI tutor with a minimum viable product.',
        ko: '최소 기능 제품으로 AI 튜터의 가치를 검증합니다.',
      },
      status: { zh: 'MVP 測試中', en: 'MVP Testing', ko: 'MVP 테스트 중' },
      summary: {
        zh: '以真實學習情境測試回覆策略、提示流程與學習反饋品質。',
        en: 'Tests response strategy, prompt flow, and feedback quality in real learning contexts.',
        ko: '실제 학습 맥락에서 응답 전략, 프롬프트 흐름, 피드백 품질을 검증합니다.',
      },
      description: {
        zh: 'MVP 聚焦是否真的幫助學習前進。透過問題分流、回覆分層與行動建議三段式設計，檢驗回應的清晰度與可行性。',
        en: 'This MVP asks one question: does it truly move learning forward? Through triage, layered responses, and concrete action suggestions, we test clarity and executability.',
        ko: '이 MVP의 핵심 질문은 학습을 실제로 전진시키는가입니다. 질문 분류, 계층형 응답, 행동 제안의 3단 구조로 응답의 명확성과 실행 가능성을 평가합니다.',
      },
      nextStep: {
        zh: '整理首輪測試結果，定義 V1.1 的回覆品質準則。',
        en: 'Consolidate first-round test results and define response-quality criteria for v1.1.',
        ko: '1차 테스트 결과를 정리하고 v1.1 응답 품질 기준을 수립합니다.',
      },
    },
    {
      id: 'woosong-buddy',
      type: 'projects',
      tags: ['Campus AI', 'Student Support', 'Service Design'],
      category: { zh: '項目展示', en: 'Projects', ko: '프로젝트' },
      title: { zh: 'Woosong Buddy', en: 'Woosong Buddy', ko: 'Woosong Buddy' },
      subtitle: {
        zh: '面向校園情境的 AI 支援助手。',
        en: 'An AI support assistant designed for campus contexts.',
        ko: '캠퍼스 상황에 맞춘 AI 지원 어시스턴트.',
      },
      status: { zh: '場景拓展中', en: 'Scenario Expansion', ko: '적용 시나리오 확장 중' },
      summary: {
        zh: '協助新生快速取得課程、行政與生活資訊，降低初期適應成本。',
        en: 'Helps new students quickly access course, administrative, and daily-life information with lower onboarding friction.',
        ko: '신입생이 수업·행정·생활 정보를 빠르게 얻도록 도와 초기 적응 비용을 낮춥니다.',
      },
      description: {
        zh: 'Woosong Buddy 透過結構化問答與情境導引，提供校園生活第一哩路支援。設計重點是資訊可信度、可達性與回應一致性。',
        en: 'Through structured Q&A and contextual guidance, Woosong Buddy supports the first mile of campus life. The design prioritizes reliability, accessibility, and consistency.',
        ko: '구조화된 Q&A와 맥락형 안내를 통해 캠퍼스 생활의 첫 구간을 지원합니다. 정보 신뢰도, 접근성, 응답 일관성을 핵심으로 설계합니다.',
      },
      nextStep: {
        zh: '完成高頻問題資料清洗，強化導引流程與回覆準確率。',
        en: 'Clean high-frequency question data and improve guidance flow and response accuracy.',
        ko: '고빈도 질문 데이터를 정제하고 안내 흐름과 응답 정확도를 고도화합니다.',
      },
    },
    {
      id: 'admissions-pdf-system',
      type: 'projects',
      tags: ['PDF Processing', 'Admissions', 'Workflow Automation'],
      category: { zh: '項目展示', en: 'Projects', ko: '프로젝트' },
      title: { zh: 'Admissions PDF System', en: 'Admissions PDF System', ko: 'Admissions PDF System' },
      subtitle: {
        zh: '招生文件的智慧化整理與審閱流程。',
        en: 'Intelligent structuring and review workflow for admissions documents.',
        ko: '입학 서류의 지능형 정리·검토 워크플로.',
      },
      status: { zh: '流程驗證中', en: 'Workflow Validation', ko: '프로세스 검증 중' },
      summary: {
        zh: '將非結構化招生文件轉為可比較、可追蹤的審查資料。',
        en: 'Converts unstructured admissions files into comparable and traceable review data.',
        ko: '비정형 입학 문서를 비교·추적 가능한 심사 데이터로 전환합니다.',
      },
      description: {
        zh: '系統聚焦文件抽取、欄位標準化與審查視圖一致性，讓招生流程更快也更穩定，同時保留人工判讀的彈性與透明度。',
        en: 'The system focuses on extraction, field normalization, and review-view consistency. It makes admissions faster and more stable while preserving human judgment and transparency.',
        ko: '문서 추출, 필드 표준화, 심사 화면 일관성에 집중해 입학 업무를 더 빠르고 안정적으로 만듭니다. 동시에 사람의 판단과 투명성도 유지합니다.',
      },
      nextStep: {
        zh: '完成審查欄位模板 v1，並導入試行批次資料。',
        en: 'Finalize review-field template v1 and onboard pilot batch data.',
        ko: '심사 필드 템플릿 v1을 완성하고 파일럿 배치 데이터를 도입합니다.',
      },
    },
  ],
  knowledge: [
    {
      id: 'knowledge-ai-education',
      type: 'knowledge',
      tags: ['AI Education', 'Case Studies', 'Learning Design'],
      category: { zh: 'AI Education', en: 'AI Education', ko: 'AI Education' },
      title: { zh: 'AI Education', en: 'AI Education', ko: 'AI Education' },
      subtitle: {
        zh: 'AI 與教學實踐的核心知識框架。',
        en: 'Core knowledge architecture for AI-powered teaching practice.',
        ko: 'AI 기반 수업 실천을 위한 핵심 지식 프레임워크.',
      },
      status: { zh: '持續更新', en: 'Continuously Updated', ko: '지속 업데이트' },
      summary: {
        zh: '整理 AI 教育設計、實作案例與評估方法，形成可直接應用的知識基底。',
        en: 'Organizes AI education design, implementation cases, and evaluation methods into an immediately usable base.',
        ko: 'AI 교육 설계, 실행 사례, 평가 방법을 정리해 바로 활용 가능한 지식 기반을 만듭니다.',
      },
      description: {
        zh: '此分類涵蓋課程設計、學習評量、教學介入與成效回饋，目標是讓研究與教學現場保持可雙向驗證的連結。',
        en: 'This category covers curriculum design, assessment, instructional intervention, and impact feedback to keep research and classroom practice mutually verifiable.',
        ko: '이 분류는 커리큘럼 설계, 학습 평가, 수업 개입, 성과 피드백을 포함하며 연구와 수업 현장이 상호 검증되도록 연결합니다.',
      },
      nextStep: {
        zh: '補齊 AI 教學案例矩陣，建立場景對照索引。',
        en: 'Complete the AI teaching case matrix and establish a scenario index.',
        ko: 'AI 수업 사례 매트릭스를 보완하고 시나리오 인덱스를 구축합니다.',
      },
    },
    {
      id: 'knowledge-research-methods',
      type: 'knowledge',
      tags: ['Methodology', 'Qualitative', 'Quantitative'],
      category: { zh: 'Research Methods', en: 'Research Methods', ko: 'Research Methods' },
      title: { zh: 'Research Methods', en: 'Research Methods', ko: 'Research Methods' },
      subtitle: {
        zh: '面向 AI 教育研究的方法工具箱。',
        en: 'Method toolbox for AI education research.',
        ko: 'AI 교육 연구를 위한 방법론 툴박스.',
      },
      status: { zh: '整理中', en: 'Under Curation', ko: '정리 중' },
      summary: {
        zh: '匯整研究設計、資料蒐集與分析方法，支援從問題定義到論證輸出的完整流程。',
        en: 'Integrates research design, data collection, and analysis methods across the full process from problem framing to argument output.',
        ko: '문제 정의부터 논증 산출까지 이어지는 전체 흐름에서 연구 설계, 데이터 수집, 분석 방법을 통합합니다.',
      },
      description: {
        zh: '內容包含混合方法設計、質化編碼、量化指標與可重現性原則，協助研究過程更透明且可複查。',
        en: 'Includes mixed-method design, qualitative coding, quantitative indicators, and reproducibility principles to make research transparent and reviewable.',
        ko: '혼합방법 설계, 질적 코딩, 정량 지표, 재현성 원칙을 포함해 연구 과정을 더 투명하고 검토 가능하게 만듭니다.',
      },
      nextStep: {
        zh: '新增方法選擇指南，對應不同研究問題情境。',
        en: 'Add a method-selection guide mapped to different research questions.',
        ko: '연구 질문 유형별 방법 선택 가이드를 추가합니다.',
      },
    },
    {
      id: 'knowledge-tools',
      type: 'knowledge',
      tags: ['Tooling', 'Workflow', 'Prompt Templates'],
      category: { zh: 'Tools', en: 'Tools', ko: 'Tools' },
      title: { zh: 'Tools', en: 'Tools', ko: 'Tools' },
      subtitle: {
        zh: '研究與教學流程中的 AI 工具實戰。',
        en: 'Practical AI tooling for research and teaching workflows.',
        ko: '연구·수업 워크플로를 위한 AI 도구 실전.',
      },
      status: { zh: '持續擴充', en: 'Expanding', ko: '지속 확장 중' },
      summary: {
        zh: '記錄工具選型、工作流設計與使用準則，讓工具真正服務問題而非反客為主。',
        en: 'Captures tool selection, workflow design, and usage principles so tools serve the problem instead of driving it.',
        ko: '도구 선택, 워크플로 설계, 사용 원칙을 축적해 도구가 문제를 주도하지 않고 문제 해결을 지원하도록 만듭니다.',
      },
      description: {
        zh: '此分類強調工具在不同任務中的邊界與最佳搭配方式，包括提示模板、資料整理、產出驗證與協作模式。',
        en: 'This category focuses on boundaries and best combinations across tasks, including prompt templates, data structuring, output validation, and collaboration modes.',
        ko: '이 분류는 작업별 도구의 경계와 최적 조합에 집중하며, 프롬프트 템플릿, 데이터 정리, 산출 검증, 협업 방식을 포함합니다.',
      },
      nextStep: {
        zh: '建立工具比較卡，加入成本、風險與適用情境。',
        en: 'Create tool comparison cards including cost, risk, and fit scenarios.',
        ko: '비용·리스크·적용 시나리오를 포함한 도구 비교 카드를 구축합니다.',
      },
    },
    {
      id: 'knowledge-philosophy',
      type: 'knowledge',
      tags: ['Ethics', 'Philosophy of Education', 'Human-Centered AI'],
      category: { zh: 'Philosophy', en: 'Philosophy', ko: 'Philosophy' },
      title: { zh: 'Philosophy', en: 'Philosophy', ko: 'Philosophy' },
      subtitle: {
        zh: '技術決策背後的教育觀與價值觀。',
        en: 'Educational philosophy and values behind technical decisions.',
        ko: '기술 의사결정 뒤에 있는 교육 철학과 가치.',
      },
      status: { zh: '長期累積', en: 'Long-term Archive', ko: '장기 축적 중' },
      summary: {
        zh: '以哲學視角追問 AI 教育的目的、界線與責任，保持研究方向的價值一致性。',
        en: 'Uses philosophical inquiry to examine purpose, boundaries, and responsibility in AI education, keeping value alignment intact.',
        ko: '철학적 관점으로 AI 교육의 목적, 경계, 책임을 점검해 연구 방향의 가치 일관성을 유지합니다.',
      },
      description: {
        zh: '哲學內容聚焦學習主體、知識權力與技術倫理，協助在產品與教學設計上做出可被辯護的選擇。',
        en: 'Content centers on learner agency, knowledge power, and technology ethics to support defensible decisions in product and curriculum design.',
        ko: '학습자 주체성, 지식 권력, 기술 윤리를 중심으로 제품·수업 설계에서 논리적으로 방어 가능한 선택을 돕습니다.',
      },
      nextStep: {
        zh: '整合倫理檢核與課程設計流程，形成可操作的決策清單。',
        en: 'Integrate ethics checks into curriculum design to build an actionable decision checklist.',
        ko: '윤리 점검을 수업 설계 프로세스에 통합해 실행 가능한 의사결정 체크리스트를 만듭니다.',
      },
    },
    {
      id: 'knowledge-projects',
      type: 'knowledge',
      tags: ['Project Learning', 'Execution', 'Knowledge Ops'],
      category: { zh: 'Projects', en: 'Projects', ko: 'Projects' },
      title: { zh: 'Projects', en: 'Projects', ko: 'Projects' },
      subtitle: {
        zh: '從概念到落地的項目知識沉澱。',
        en: 'Project knowledge distilled from concept to execution.',
        ko: '개념부터 실행까지 축적된 프로젝트 지식.',
      },
      status: { zh: '更新中', en: 'Updating', ko: '업데이트 중' },
      summary: {
        zh: '彙整各專案的決策脈絡、設計取捨與執行經驗，形成可複用的實作知識。',
        en: 'Synthesizes decision context, design trade-offs, and execution lessons into reusable implementation knowledge.',
        ko: '프로젝트별 의사결정 맥락, 설계 트레이드오프, 실행 경험을 정리해 재사용 가능한 실행 지식으로 만듭니다.',
      },
      description: {
        zh: '透過專案文檔化，保留可追蹤的背景與理由，讓後續迭代不必從零開始，並降低跨角色協作成本。',
        en: 'Documentation preserves traceable context and rationale so iteration does not restart from zero and cross-role collaboration stays efficient.',
        ko: '프로젝트 문서화로 배경과 근거를 추적 가능하게 보존해 다음 반복을 0에서 시작하지 않도록 하고, 역할 간 협업 비용을 낮춥니다.',
      },
      nextStep: {
        zh: '補齊每個專案的里程碑復盤與可複用模板。',
        en: 'Add milestone retrospectives and reusable templates for each project.',
        ko: '각 프로젝트의 마일스톤 회고와 재사용 템플릿을 보강합니다.',
      },
    },
  ],
};

function pickLocalized(value, lang) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return value[lang] || value.zh || value.en || '';
}

function localizeItem(item, lang) {
  return {
    id: item.id,
    type: item.type,
    tags: item.tags,
    category: pickLocalized(item.category, lang),
    title: pickLocalized(item.title, lang),
    subtitle: pickLocalized(item.subtitle, lang),
    status: pickLocalized(item.status, lang),
    summary: pickLocalized(item.summary, lang),
    description: pickLocalized(item.description, lang),
    nextStep: pickLocalized(item.nextStep, lang),
  };
}

export function getContentByType(type, lang = 'zh') {
  return (CONTENT_ITEMS[type] || []).map((item) => localizeItem(item, lang));
}

export function findContentItem(type, id, lang = 'zh') {
  return getContentByType(type, lang).find((item) => item.id === id);
}
