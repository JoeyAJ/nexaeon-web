const SITE_CONTENT = {
  zh: {
    common: {
      skipIntro: '跳過',
      backHome: '返回首頁',
      backToTop: '返回頂部',
      openModule: '展開子內容',
      openPage: '進入頁面',
      entries: '個入口',
      moduleMenu: '子內容入口',
      notFoundTitle: '內容尚未建立',
      notFoundBody: '這個條目目前沒有可顯示的資料。',
      moduleLabel: '一級模塊',
      tags: 'Tags',
    },
    hero: {
      eyebrow: 'AI 時代的數位研究所',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub:
        'NexAeon 是一座 AI 時代的數位研究所，連接研究、教學、知識管理與實踐項目，將 AI 從工具轉化為理解世界、設計教育與建構未來的思維系統。',
      cta1: '查看一級模塊',
      cta2: '展開研究地圖',
      scrollCue: '向下滑動，進入模塊地圖',
      meta: ['第 11 號實驗室', '建立於 2026', '大田 / 又鬆大'],
      nextLabel: 'Module Map',
      nextTitle: '六個入口，一座研究所',
    },
    home: {
      eyebrow: 'NexAeon Modules',
      title: '一級模塊地圖',
      intro:
        '首頁只保留 NexAeon 的總定位與六個入口。每個模塊承接一組完整子頁，用於展示 Joey 的研究身份、課程設計、知識系統與實踐現場。',
      activeHint: '選擇一個模塊後，可從這裡進入對應子頁。',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      tagline: 'A digital institute for the age of AI',
    },
    modules: [
      {
        id: 'identity',
        code: '01',
        label: 'Identity',
        title: 'Identity｜身份導航',
        summary: '定義 NexAeon、Joey、Nexōn 與 Logo 哲學的核心身份層。',
        position: '這裡說明 NexAeon 為何存在，以及它如何作為 Joey 的 AI 時代個人研究所與第二大腦運作。',
        items: [
          {
            id: 'manifesto',
            title: 'NexAeon Manifesto｜理念宣言',
            subtitle: '把 AI 從工具轉化為一套理解世界的研究方法。',
            status: '核心宣言',
            summary:
              'NexAeon 是 Joey 在 AI 時代建立的個人研究所：它不追求單一產品敘事，而是把研究、教學、知識管理與實踐項目放入同一個可持續生長的系統。',
            tags: ['Manifesto', 'Digital Institute', 'Second Brain'],
            sections: [
              {
                label: 'Core Position｜核心定位',
                body:
                  'NexAeon 將 AI 視為思維放大器，而非單純效率工具。它讓問題、資料、課程、原型與現場經驗彼此連接，形成可被檢索、修正與再生成的研究結構。',
              },
              {
                label: 'Philosophical Ground｜理念基礎',
                body:
                  '研究不是孤立的論文生產，而是持續整理世界的方式。NexAeon 嘗試把個人知識管理提升為可展示的公共研究界面，讓未完成的思考也能被看見與被討論。',
              },
              {
                label: 'Operating Logic｜運作邏輯',
                body: ['以研究問題作為資料分類的核心。', '以課程與學生回饋驗證概念是否可教。', '以 MVP 與現場流程測試 AI 是否真的能改善實踐。'],
              },
              {
                label: 'Future Form｜未來形態',
                body:
                  'NexAeon 將逐步接入 Notion、Airtable、RAG 與自動化工作流，成為一座可更新、可追蹤、可協作的 AI 研究基礎設施。',
              },
            ],
          },
          {
            id: 'joey-research-identity',
            title: 'Joey Research Identity｜研究者身份',
            subtitle: 'AI 教育研究者、未來教授與系統建構者的交會身份。',
            status: '身份建構中',
            summary:
              'Joey 的研究身份連接 AI 教育、個別化學習、學習分析、管理轉型與校園實踐。NexAeon 是這些方向的公開研究界面。',
            tags: ['Research Identity', 'AI Education', 'Professor Path'],
            sections: [
              {
                label: 'Research Self｜研究自我',
                body:
                  'Joey 關注 AI 如何改變教學、學習與組織決策。研究者身份不是單一學科標籤，而是跨越教育科技、管理、知識系統與文化語境的問題意識。',
              },
              {
                label: 'Academic Trajectory｜學術路徑',
                body: ['以 AI in Education 作為主軸。', '以個別化 AI Tutor 與學習數據作為方法場。', '以大學現場、學生支援與行政自動化作為實踐場。'],
              },
              {
                label: 'Teaching Identity｜教學身份',
                body:
                  'Joey 未來作為教授與 AI 教育者的核心任務，是幫助學生把 AI 轉化為問題理解、研究設計與自我學習的能力，而不是停留在工具操作。',
              },
              {
                label: 'Public Interface｜公開界面',
                body:
                  'NexAeon 讓研究身份被具體看見：每一個模塊、子頁與項目都對應一條正在形成的方法路徑。',
              },
            ],
          },
          {
            id: 'nexon-ai-assistant',
            title: 'Nexōn AI Assistant｜AI 助教角色',
            subtitle: '連接研究、教學、知識與未來想像的語言使者。',
            status: '角色原型',
            summary:
              'Nexōn 不是一般聊天工具，而是 Joey 的 AI 助教：它協助整理問題、轉譯知識、支援教學設計，並把分散的思考重新接回 NexAeon 的研究系統。',
            tags: ['Nexōn', 'AI Assistant', 'Tutor'],
            sections: [
              {
                label: 'Role Definition｜角色定義',
                body:
                  'Nexōn 的任務是協助人理解問題，而不是替人快速產生答案。它在研究、教學與知識整理之間擔任語言中介，把模糊想法轉成可追問、可分類、可實作的結構。',
              },
              {
                label: 'Assistant Logic｜助教邏輯',
                body: ['先確認問題語境，再生成回應。', '把回答拆成概念、證據、操作與反思。', '鼓勵使用者檢查 AI 輸出，而不是直接接受。'],
              },
              {
                label: 'Educational Use｜教育用途',
                body:
                  '在課堂中，Nexōn 可作為 Prompt 練習、研究方法引導與個別化回饋的助教角色，幫助學生建立更穩定的 AI 使用能力。',
              },
              {
                label: 'Future Imagination｜未來想像',
                body:
                  '長期來看，Nexōn 將接入 Joey 的第二大腦，成為可檢索文獻、讀取課程脈絡、追蹤學生需求與支援研究決策的智能界面。',
              },
            ],
          },
          {
            id: 'symbol-philosophy',
            title: 'Symbol & Philosophy｜Logo 與哲學象徵',
            subtitle: 'Infinity Eye、Neural Links 與紫藍漸層共同構成 NexAeon 的視覺哲學。',
            status: '符號系統',
            summary:
              'NexAeon 的 Logo 不是裝飾圖形，而是一個研究符號：它用眼、神經連結與無限迴路表達觀察、學習與持續生成。',
            tags: ['Logo', 'Infinity Eye', 'Neural Links'],
            sections: [
              {
                label: 'Infinity Eye｜無限之眼',
                body:
                  '眼象徵觀察與理解，無限迴路象徵知識的持續回流。兩者結合後，Logo 表達的是「看見世界，同時讓世界重新組織思考」。',
              },
              {
                label: 'Neural Links｜神經連結',
                body:
                  'Logo 周圍的連線象徵研究節點、課程材料、工具流程與實踐項目的互相連接。NexAeon 的核心不是單點成果，而是節點之間的關係。',
              },
              {
                label: 'Core Eye｜核心眼球',
                body:
                  '中心眼球代表 Joey 的研究視角，也代表 AI 助教與第二大腦共同形成的觀察中心。它保持冷靜、聚焦與可驗證。',
              },
              {
                label: 'Purple Blue Gradient｜紫藍漸層',
                body:
                  '紫色保留哲學與想像，藍色指向技術與理性。漸層不是玄學，而是提醒 NexAeon 必須同時面向思想深度與工程落地。',
              },
            ],
          },
        ],
      },
      {
        id: 'research',
        code: '02',
        label: 'Research',
        title: 'Research｜研究地圖',
        summary: '整理 AI 教育、個別化輔導、學習分析與 AI 管理轉型的研究主軸。',
        position: '研究地圖把問題、方法、目前階段與未來方向放在同一個架構中，方便後續延伸為論文、模型與實驗。',
        items: [
          {
            id: 'ai-in-education',
            title: 'AI in Education｜AI 教育研究',
            subtitle: '研究 AI 如何改變教學設計、學習互動與教育評量。',
            status: '持續研究中',
            summary:
              '此方向聚焦 AI 進入教育現場後，教師、學生與系統之間的新關係，以及它對課程設計與學習成效的影響。',
            tags: ['AI Education', 'Pedagogy', 'Assessment'],
            sections: [
              { label: 'Research Focus｜研究焦點', body: '建立 AI 支援教學的設計原則，分析 AI 介入是否真正改善理解、參與與遷移能力。' },
              { label: 'Key Questions｜核心問題', body: ['AI 在課堂中應該扮演工具、助教還是共同學習者？', '教師如何判斷 AI 回饋的品質與風險？', 'AI 教學如何避免只提高效率卻削弱深度學習？'] },
              { label: 'Current Stage｜目前階段', body: '正在整理 AI 教育案例、課堂互動模式與評量框架，準備形成第一版研究問題矩陣。' },
              { label: 'Future Direction｜未來方向', body: '將透過課堂實驗與學生回饋資料，建立可比較的 AI 教育成效指標。' },
            ],
          },
          {
            id: 'personalized-ai-tutoring',
            title: 'Personalized AI Tutoring｜個別化 AI 輔導系統',
            subtitle: '讓 AI 依學習者程度、目標與節奏提供可行動的輔導。',
            status: '原型驗證中',
            summary:
              '此方向研究 AI Tutor 如何從一般問答升級為具備診斷、分層回覆與學習記憶的個別化輔導系統。',
            tags: ['AI Tutor', 'Personalization', 'Learning Path'],
            sections: [
              { label: 'Research Focus｜研究焦點', body: '設計可依學習者程度調整語氣、難度、提示方式與下一步任務的 AI 輔導模型。' },
              { label: 'Key Questions｜核心問題', body: ['AI 如何辨識學生真正卡住的位置？', '個別化是否能在不侵犯隱私的前提下運作？', 'AI Tutor 的回饋要如何避免讓學生形成依賴？'] },
              { label: 'Current Stage｜目前階段', body: '正在以 Prompt 策略與模擬對話測試初版輔導流程，並整理學生常見問題類型。' },
              { label: 'Future Direction｜未來方向', body: '未來將接入學習歷程記憶、診斷 rubrics 與教師端觀察面板。' },
            ],
          },
          {
            id: 'learning-analytics',
            title: 'Learning Analytics｜學習數據分析',
            subtitle: '把學習行為、反思品質與參與節奏轉成可追蹤訊號。',
            status: '資料模型設計中',
            summary:
              '此方向關注如何透過學習數據協助教師理解學生狀態，同時避免把教育簡化成單一分數。',
            tags: ['Learning Analytics', 'Engagement', 'Feedback'],
            sections: [
              { label: 'Research Focus｜研究焦點', body: '建立能反映提問深度、學習參與、回饋吸收與任務完成品質的多維度分析框架。' },
              { label: 'Key Questions｜核心問題', body: ['哪些互動資料能真正代表學習，而不是只代表活躍？', '質性反思如何與量化指標互補？', '學習分析結果如何回到教學決策？'] },
              { label: 'Current Stage｜目前階段', body: '正在規劃 Engagement Index 與回饋品質指標，作為後續課堂資料分析基礎。' },
              { label: 'Future Direction｜未來方向', body: '將建立可視化儀表板，支援學生支援、課程調整與 AI Tutor 優化。' },
            ],
          },
          {
            id: 'ai-management',
            title: 'AI × Management｜AI 經營與組織轉型',
            subtitle: '研究 AI 如何重塑大學與組織的決策、流程與能力建設。',
            status: '跨域研究中',
            summary:
              '此方向連接 AI 教育與管理實務，探討組織如何從工具採用走向制度、流程與文化的轉型。',
            tags: ['AI Management', 'Organization', 'Transformation'],
            sections: [
              { label: 'Research Focus｜研究焦點', body: '分析 AI 導入在教育機構與企業中的流程治理、能力培訓與變革阻力。' },
              { label: 'Key Questions｜核心問題', body: ['組織如何判斷哪些流程適合 AI 化？', 'AI 導入如何避免成為短期展示，而能形成長期能力？', '管理者需要哪些數據與敘事才能推動轉型？'] },
              { label: 'Current Stage｜目前階段', body: '正在整理校園行政、招生、知識管理與教學支援場景，形成 AI 管理案例地圖。' },
              { label: 'Future Direction｜未來方向', body: '未來將建立大學 AI 轉型框架，連接策略、流程、自動化與人員培訓。' },
            ],
          },
          {
            id: 'research-pipeline',
            title: 'Research Pipeline｜研究進度',
            subtitle: '把分散的研究靈感整理成可追蹤的問題、資料與輸出。',
            status: '管線建構中',
            summary:
              'Research Pipeline 是 NexAeon 的研究作業系統，用於追蹤從問題形成、文獻整理到論文與 MVP 的進度。',
            tags: ['Pipeline', 'Research Ops', 'Knowledge System'],
            sections: [
              { label: 'Research Focus｜研究焦點', body: '建立一套能管理研究問題、文獻、假設、資料、寫作與發布狀態的流程。' },
              { label: 'Key Questions｜核心問題', body: ['如何避免研究想法停留在筆記中？', '文獻、課堂資料與 MVP 測試如何彼此引用？', '哪些狀態節點能讓研究進度更透明？'] },
              { label: 'Current Stage｜目前階段', body: '目前已完成靜態網站內容框架，下一步將把資料源接入 Notion 或 Airtable。' },
              { label: 'Future Direction｜未來方向', body: '形成研究儀表板，支援論文題目、課程案例與原型項目的同步管理。' },
            ],
          },
        ],
      },
      {
        id: 'teaching',
        code: '03',
        label: 'Teaching',
        title: 'Teaching｜教學與課程',
        summary: '展示 Joey 作為未來教授、AI 教育者與學生教練的教學設計。',
        position: '這裡不是賣課頁，而是把課程理念、教學方法與教材系統作為研究成果展示。',
        items: [
          {
            id: 'prompt-engineering-course',
            title: 'Prompt Engineering Course｜Prompt 工程課程',
            subtitle: '把提示詞能力變成可教、可練、可評估的學術能力。',
            status: '課程設計中',
            summary:
              '課程從問題定義、上下文設計、輸出約束與評估 rubrics 出發，訓練學生穩定使用 AI 完成研究與學習任務。',
            tags: ['Prompt Engineering', 'Course Design', 'AI Literacy'],
            sections: [
              { label: 'Teaching Focus｜教學焦點', body: '訓練學生從「問 AI」提升到「設計問題、控制脈絡、評估輸出」。' },
              { label: 'Learning Design｜學習設計', body: ['以案例拆解 Prompt 結構。', '以任務練習控制輸出品質。', '以同儕評量建立判斷標準。'] },
              { label: 'Current Format｜目前形式', body: '目前以課堂練習、研究任務模板與示範案例形式建構。' },
              { label: 'Future Direction｜未來方向', body: '發展成完整教案包，包含 rubrics、作業範例與 AI Tutor 輔助練習。' },
            ],
          },
          {
            id: 'ai-literacy',
            title: 'AI Literacy｜AI 素養教育',
            subtitle: '讓學生理解 AI 的能力、限制、風險與責任。',
            status: '教學框架中',
            summary:
              'AI 素養不只是工具操作，而是理解模型如何生成、何時可信、如何驗證，以及如何在學術與社會場景中負責任地使用。',
            tags: ['AI Literacy', 'Ethics', 'Critical Thinking'],
            sections: [
              { label: 'Teaching Focus｜教學焦點', body: '建立學生對 AI 生成內容的判斷力、問題意識與倫理敏感度。' },
              { label: 'Learning Design｜學習設計', body: ['比較 AI 輸出與可靠來源。', '辨識偏誤、幻覺與資料界線。', '練習把 AI 當成思考夥伴而非答案機器。'] },
              { label: 'Current Format｜目前形式', body: '正在整理入門講義、課堂討論題與案例分析。' },
              { label: 'Future Direction｜未來方向', body: '與 Prompt 工程、研究方法課程整合成 AI 基礎能力模組。' },
            ],
          },
          {
            id: 'ai-research-methods',
            title: 'AI Research Methods｜AI 輔助研究方法',
            subtitle: '使用 AI 支援研究問題形成、文獻整理與資料分析。',
            status: '方法展示中',
            summary:
              '此課程方向展示如何把 AI 放入研究流程，同時保留研究者的判斷、方法透明度與可重現性。',
            tags: ['Research Methods', 'Literature Review', 'Data Analysis'],
            sections: [
              { label: 'Teaching Focus｜教學焦點', body: '讓學生學會用 AI 協助研究，而不是把研究外包給 AI。' },
              { label: 'Learning Design｜學習設計', body: ['用 AI 協助產生研究問題候選。', '建立文獻摘要與概念矩陣。', '使用 AI 檢查問卷、訪談與分析流程。'] },
              { label: 'Current Format｜目前形式', body: '目前以研究流程示範、模板與工作坊形式整理。' },
              { label: 'Future Direction｜未來方向', body: '將形成 AI-assisted research toolkit，支援學生從題目到論證輸出。' },
            ],
          },
          {
            id: 'student-coaching-model',
            title: 'Student Coaching Model｜學生個別化教練模型',
            subtitle: '結合 AI Tutor、學習分析與教師回饋的學生支援模型。',
            status: '模型設計中',
            summary:
              '此模型關注學生的目標、困難、學習節奏與情緒負荷，並透過 AI 與教師共同提供可持續支援。',
            tags: ['Coaching', 'Student Support', 'AI Tutor'],
            sections: [
              { label: 'Teaching Focus｜教學焦點', body: '把學生支援從一次性回答提升為連續性的學習教練關係。' },
              { label: 'Learning Design｜學習設計', body: ['建立學習目標與任務拆解。', '提供分層回饋與反思問題。', '讓教師能看到學生需要支援的位置。'] },
              { label: 'Current Format｜目前形式', body: '正在整理常見學生需求、回饋語料與教練式問答框架。' },
              { label: 'Future Direction｜未來方向', body: '與 AI Tutoring MVP 串接，形成學生個別化支持原型。' },
            ],
          },
          {
            id: 'course-materials',
            title: 'Course Materials｜課程教材',
            subtitle: '把課程內容、練習模板與研究案例整理成可更新的教材庫。',
            status: '框架建立中',
            summary:
              '教材庫將保存 Prompt 範例、AI 素養案例、研究方法模板與課堂練習，支援未來課程持續迭代。',
            tags: ['Materials', 'Templates', 'Teaching System'],
            sections: [
              { label: 'Teaching Focus｜教學焦點', body: '讓教材不是一次性簡報，而是能被搜尋、改寫、再使用的教學資產。' },
              { label: 'Learning Design｜學習設計', body: ['將教材拆成概念、案例、練習與評量。', '保留不同語言背景學生可理解的版本。', '把課堂回饋回寫到教材更新流程。'] },
              { label: 'Current Format｜目前形式', body: '目前先以靜態內容框架呈現，後續接入 Notion 或資料庫。' },
              { label: 'Future Direction｜未來方向', body: '建立教材索引、版本紀錄與課程包匯出流程。' },
            ],
          },
        ],
      },
      {
        id: 'knowledge-lab',
        code: '04',
        label: 'Knowledge Lab',
        title: 'Knowledge Lab｜知識實驗室',
        summary: 'NexAeon 的第二大腦，用於整理文獻、工具流程、研究筆記與概念地圖。',
        position: '目前先以靜態內容框架呈現，之後可接 Notion、Airtable、n8n、RAG 或資料庫。',
        items: [
          {
            id: 'literature-library',
            title: 'Literature Library｜研究文獻庫',
            subtitle: '保存 AI 教育、學習分析與 AI 管理相關文獻。',
            status: '文獻庫框架',
            summary:
              '文獻庫將研究論文、理論模型、方法工具與引用筆記放在同一個索引中，支援快速檢索與研究寫作。',
            tags: ['Literature', 'Research', 'Library'],
            sections: [
              { label: 'Knowledge Function｜知識功能', body: '把文獻從 PDF 檔案轉成可搜尋、可引用、可連回研究問題的知識節點。' },
              { label: 'Sources｜資料來源', body: ['AI in Education 論文。', 'Learning Analytics 與教育科技研究。', 'AI Management、TAM、VARK 與組織轉型文獻。'] },
              { label: 'Current Stage｜目前階段', body: '目前建立靜態分類與頁面入口，準備後續接入外部資料源。' },
              { label: 'Future Integration｜未來串接', body: '將與 Zotero、Notion 或 RAG 系統連接，提供摘要、標籤與概念關聯。' },
            ],
          },
          {
            id: 'ai-tools-workflow',
            title: 'AI Tools Workflow｜AI 工具流程',
            subtitle: '整理研究、教學與行政工作中的 AI 工具組合。',
            status: '流程整理中',
            summary:
              '此區域記錄不同任務適合使用哪些 AI 工具，以及如何在品質、成本、速度與風險之間取得平衡。',
            tags: ['AI Tools', 'Workflow', 'Automation'],
            sections: [
              { label: 'Knowledge Function｜知識功能', body: '將工具使用從零散嘗試整理成可重複的工作流與判斷準則。' },
              { label: 'Sources｜資料來源', body: ['Prompt 模板與輸出範例。', '研究寫作、資料整理、簡報製作流程。', '課程與行政自動化案例。'] },
              { label: 'Current Stage｜目前階段', body: '目前以靜態工具卡與流程描述為主，先建立分類基礎。' },
              { label: 'Future Integration｜未來串接', body: '可接入 n8n 或 Make，將常見流程自動化並記錄每次執行結果。' },
            ],
          },
          {
            id: 'notion-n8n-rag-system',
            title: 'Notion / n8n / RAG System｜知識自動化系統',
            subtitle: '把第二大腦從靜態筆記升級為可檢索、可觸發、可回答的系統。',
            status: '架構規劃中',
            summary:
              '此系統將 Notion 的知識庫、n8n 的流程自動化與 RAG 的語意檢索連接起來，支援研究與教學工作流。',
            tags: ['Notion', 'n8n', 'RAG'],
            sections: [
              { label: 'Knowledge Function｜知識功能', body: '讓知識不只被儲存，也能在需要時被召回、重組與嵌入工作流程。' },
              { label: 'Sources｜資料來源', body: ['研究筆記與文獻摘要。', '課程教材與學生常見問題。', 'MVP 文件、會議紀錄與行政資料。'] },
              { label: 'Current Stage｜目前階段', body: '目前先完成網站端內容結構，作為未來資料庫 schema 的公開展示層。' },
              { label: 'Future Integration｜未來串接', body: '接入 API 後，可支援自動摘要、資料同步、語意搜尋與 AI 助教回答引用。' },
            ],
          },
          {
            id: 'research-notes',
            title: 'Research Notes｜研究筆記',
            subtitle: '保存未完成的問題、概念、假設與方法反思。',
            status: '筆記系統建立中',
            summary:
              '研究筆記是 NexAeon 的思考緩衝區，用來承接尚未變成論文、課程或專案的中間想法。',
            tags: ['Notes', 'Ideas', 'Research Ops'],
            sections: [
              { label: 'Knowledge Function｜知識功能', body: '讓未完成的想法保留脈絡，而不是散落在聊天紀錄或臨時文件中。' },
              { label: 'Sources｜資料來源', body: ['閱讀筆記。', '課堂觀察。', '學生回饋。', 'AI 對話與 Prompt 實驗。'] },
              { label: 'Current Stage｜目前階段', body: '目前以靜態頁面說明筆記角色，後續會依主題與研究問題建立索引。' },
              { label: 'Future Integration｜未來串接', body: '研究筆記將能連到文獻、課程、MVP 與概念地圖，形成完整知識路徑。' },
            ],
          },
          {
            id: 'concept-map',
            title: 'Concept Map｜概念地圖',
            subtitle: '展示 NexAeon 中研究概念、工具與項目之間的關係。',
            status: '地圖雛形',
            summary:
              '概念地圖讓 AI 教育、個別化輔導、學習分析、知識系統與現場實踐不再是分散頁面，而是一張可追蹤網絡。',
            tags: ['Concept Map', 'Knowledge Graph', 'Taxonomy'],
            sections: [
              { label: 'Knowledge Function｜知識功能', body: '用關係圖呈現概念與項目之間的連結，幫助使用者理解 NexAeon 的整體思想結構。' },
              { label: 'Sources｜資料來源', body: ['研究主題節點。', '課程與教材節點。', '工具流程與項目節點。', '現場實踐場景節點。'] },
              { label: 'Current Stage｜目前階段', body: '目前先以內容分類方式呈現，後續可加入互動式節點圖。' },
              { label: 'Future Integration｜未來串接', body: '未來可接 graph database 或可視化工具，形成可探索的 NexAeon knowledge graph。' },
            ],
          },
        ],
      },
      {
        id: 'projects',
        code: '05',
        label: 'Projects',
        title: 'Projects｜MVP 與實踐項目',
        summary: '展示 AI 輔導、碳訊通、語言學習、招生文件與銀髮照護等實踐項目。',
        position: '每個項目以問題、解法、技術、狀態與下一步呈現，避免變成銷售頁。',
        items: [
          {
            id: 'nexaeon-ai-tutoring-mvp',
            title: 'NexAeon AI Tutoring MVP｜AI 輔導系統 MVP',
            subtitle: '驗證個別化 AI 助教能否支援真實學習任務。',
            status: 'MVP 測試中',
            summary:
              '此 MVP 聚焦學生提問理解、回覆分層、學習任務拆解與回饋品質，作為 Nexōn 未來教學能力的基礎。',
            tags: ['AI Tutor', 'MVP', 'Education'],
            sections: [
              { label: 'Problem｜問題背景', body: '學生常知道可以使用 AI，卻不知道如何提出好問題、判斷答案與把回覆轉成下一步學習行動。' },
              { label: 'Solution｜解決方案', body: '建立一個具備提問診斷、分層提示與行動建議的 AI Tutor 原型。' },
              { label: 'Technology｜使用技術', body: ['LLM Prompt orchestration', 'Learning rubric', 'Conversation memory prototype', 'Frontend interaction layer'] },
              { label: 'MVP Status｜目前狀態', body: '已完成核心概念與頁面展示，正在整理對話策略與測試情境。' },
              { label: 'Next Step｜下一步', body: '建立學生測試任務，收集回覆品質、理解度與可行動性資料。' },
            ],
          },
          {
            id: 'greentrace',
            title: 'GreenTrace｜碳訊通',
            subtitle: '將碳排、ESG 與行動資料轉成可理解的追蹤系統。',
            status: '概念驗證中',
            summary:
              'GreenTrace 嘗試把永續資料從報告語言轉為可追蹤、可溝通、可決策的數位系統。',
            tags: ['ESG', 'Carbon', 'Data System'],
            sections: [
              { label: 'Problem｜問題背景', body: '永續與碳管理資料常分散在文件、表格與報告中，難以讓一般使用者理解與持續追蹤。' },
              { label: 'Solution｜解決方案', body: '建立碳資料整理、行動追蹤與可視化說明的原型，讓個人或組織看見改善路徑。' },
              { label: 'Technology｜使用技術', body: ['Data dashboard', 'AI summary', 'Workflow automation', 'ESG taxonomy'] },
              { label: 'MVP Status｜目前狀態', body: '目前保留為實踐項目框架，後續可依具體資料源建構功能。' },
              { label: 'Next Step｜下一步', body: '定義最小資料欄位與示範情境，完成第一版碳資料流程。' },
            ],
          },
          {
            id: 'woosong-buddy',
            title: 'Woosong Buddy｜語言學習寵物系統',
            subtitle: '以陪伴式角色支援語言學習與校園適應。',
            status: '場景設計中',
            summary:
              'Woosong Buddy 以可親近的互動角色降低學生學語言與適應校園的焦慮，並提供任務式練習。',
            tags: ['Language Learning', 'Campus AI', 'Companion System'],
            sections: [
              { label: 'Problem｜問題背景', body: '國際學生在語言練習、校園資訊理解與文化適應上，常缺乏即時且低壓力的支援。' },
              { label: 'Solution｜解決方案', body: '設計一個具備語言練習、情境問答與陪伴回饋的 AI 寵物系統。' },
              { label: 'Technology｜使用技術', body: ['Conversational AI', 'Scenario-based learning', 'Gamified feedback', 'Multilingual content'] },
              { label: 'MVP Status｜目前狀態', body: '正在定義角色設定、語言任務與校園支援場景。' },
              { label: 'Next Step｜下一步', body: '建立第一批語言任務與新生常見情境對話。' },
            ],
          },
          {
            id: 'admissions-pdf-system',
            title: 'Admissions PDF System｜招生文件識別系統',
            subtitle: '把招生 PDF 文件轉成可整理、可比較與可審閱的資料。',
            status: '流程驗證中',
            summary:
              '此系統面向招生行政現場，協助抽取文件欄位、整理申請資料並降低人工重複工作。',
            tags: ['PDF', 'Admissions', 'Automation'],
            sections: [
              { label: 'Problem｜問題背景', body: '招生文件格式不一、資料量大且需要人工比對，容易造成審閱時間長與資料不一致。' },
              { label: 'Solution｜解決方案', body: '建立 PDF 欄位抽取、資料標準化與審閱清單生成流程。' },
              { label: 'Technology｜使用技術', body: ['PDF parsing', 'OCR-ready workflow', 'Structured extraction', 'Admin automation'] },
              { label: 'MVP Status｜目前狀態', body: '已確認場景需求，正在整理欄位模板與試行流程。' },
              { label: 'Next Step｜下一步', body: '完成一版欄位 schema，使用示範文件測試抽取準確率。' },
            ],
          },
          {
            id: 'lightmind-plus',
            title: 'LightMind+｜銀髮情緒照護項目',
            subtitle: '探索 AI 在銀髮情緒陪伴、提醒與支持中的應用。',
            status: '概念研究中',
            summary:
              'LightMind+ 關注高齡者情緒支持與日常陪伴，嘗試以溫和、低壓力的方式提供 AI 輔助照護。',
            tags: ['Elder Care', 'Emotion Support', 'AI Companion'],
            sections: [
              { label: 'Problem｜問題背景', body: '銀髮族可能面臨孤獨、情緒波動、記憶提醒與日常支持不足等問題。' },
              { label: 'Solution｜解決方案', body: '設計具備情緒問候、日常提醒、家人通知與簡易對話陪伴的 AI 支援原型。' },
              { label: 'Technology｜使用技術', body: ['Conversational interface', 'Sentiment-aware prompts', 'Reminder workflow', 'Care context logging'] },
              { label: 'MVP Status｜目前狀態', body: '目前處於需求與倫理邊界研究階段，尚未進入產品化。' },
              { label: 'Next Step｜下一步', body: '先建立照護情境與風險清單，確保技術設計符合安全與尊重。' },
            ],
          },
        ],
      },
      {
        id: 'field-lab',
        code: '06',
        label: 'Field Lab',
        title: 'Field Lab｜現場實驗室',
        summary: '呈現 Joey 如何把 AI、教育、研究與行政現場結合起來。',
        position: 'Field Lab 不是聯絡我們或合作導流，而是記錄 AI 在大學現場與學生支援中的實踐語境。',
        items: [
          {
            id: 'university-practice',
            title: 'University Practice｜大學現場實踐',
            subtitle: '在大學脈絡中觀察 AI 教育、課程與行政流程。',
            status: '現場觀察中',
            summary:
              '此頁呈現大學現場如何成為 NexAeon 的實驗場，讓研究問題從真實教學與行政需求中長出來。',
            tags: ['University', 'Practice', 'Field Notes'],
            sections: [
              { label: 'Context｜現場語境', body: '大學同時包含教學、研究、招生、學生支援與行政協作，是觀察 AI 轉型的複合場域。' },
              { label: 'Practice Focus｜實踐焦點', body: ['課程中的 AI 使用。', '學生支援流程。', '行政資料整理。', '跨語言溝通與國際學生服務。'] },
              { label: 'Current Use｜目前使用', body: '目前以觀察、案例整理與原型構想為主，將現場問題轉成研究與 MVP 任務。' },
              { label: 'Future Context｜未來情境', body: '未來可形成大學 AI 轉型案例庫，連接課程、行政與學生支援。' },
            ],
          },
          {
            id: 'student-support',
            title: 'Student Support｜學生支援場景',
            subtitle: '以 AI 協助學生理解任務、整理問題與獲得個別化回饋。',
            status: '場景整理中',
            summary:
              '學生支援是 NexAeon 的核心現場：AI 可以協助學生學習，但必須與教師判斷、情緒理解與教育倫理一起設計。',
            tags: ['Student Support', 'Coaching', 'Learning'],
            sections: [
              { label: 'Context｜現場語境', body: '學生需要的不只是答案，而是知道下一步怎麼做、如何修正，以及何時需要向老師求助。' },
              { label: 'Practice Focus｜實踐焦點', body: ['學習任務拆解。', '報告與研究問題引導。', 'AI 素養提醒。', '情緒與壓力訊號觀察。'] },
              { label: 'Current Use｜目前使用', body: '目前將學生常見問題轉化為 AI Tutor 測試情境與課程設計案例。' },
              { label: 'Future Context｜未來情境', body: '未來可形成學生支援儀表板與個別化教練模型。' },
            ],
          },
          {
            id: 'administrative-automation',
            title: 'Administrative Automation｜行政自動化',
            subtitle: '讓重複性行政流程變得可追蹤、可標準化與可節省時間。',
            status: '流程盤點中',
            summary:
              '行政自動化不是取代人，而是減少低價值重複工作，讓人能回到判斷、溝通與服務品質上。',
            tags: ['Automation', 'Administration', 'Workflow'],
            sections: [
              { label: 'Context｜現場語境', body: '招生、文件整理、通知、資料比對與報告生成等任務常消耗大量時間。' },
              { label: 'Practice Focus｜實踐焦點', body: ['PDF 與表格資料抽取。', '通知與任務追蹤。', '流程節點標準化。', 'AI 生成摘要與審閱輔助。'] },
              { label: 'Current Use｜目前使用', body: '目前已在 Admissions PDF System 中形成具體項目方向。' },
              { label: 'Future Context｜未來情境', body: '未來可建立校園行政自動化 toolkit，支援可審核與可追蹤的流程改造。' },
            ],
          },
          {
            id: 'ai-education-experiment',
            title: 'AI Education Experiment｜AI 教育實驗',
            subtitle: '把課堂變成研究、回饋與原型測試的交會場。',
            status: '實驗設計中',
            summary:
              'AI 教育實驗讓課程不只是內容傳遞，而是觀察學生如何理解、使用與反思 AI 的研究現場。',
            tags: ['Experiment', 'Classroom', 'AI Education'],
            sections: [
              { label: 'Context｜現場語境', body: 'AI 進入課堂後，學生的提問方式、學習策略與作業產出都會改變。' },
              { label: 'Practice Focus｜實踐焦點', body: ['Prompt 練習。', 'AI 回覆品質評估。', '學生反思記錄。', '課堂活動與 AI Tutor 對照。'] },
              { label: 'Current Use｜目前使用', body: '目前以課程設計和研究問題整理為主，準備建立可比較的實驗任務。' },
              { label: 'Future Context｜未來情境', body: '未來將形成 AI 教育實驗 protocol，支援論文、課程與系統原型同步發展。' },
            ],
          },
          {
            id: 'future-collaboration-context',
            title: 'Future Collaboration Context｜未來合作情境',
            subtitle: '以研究與現場問題為核心，而不是以銷售漏斗為核心。',
            status: '情境定義中',
            summary:
              '此頁描述未來可能與教授、學校、學生團隊或組織共同研究與實踐的情境，但不把 Field Lab 寫成導流頁。',
            tags: ['Context', 'Collaboration', 'Field Lab'],
            sections: [
              { label: 'Context｜現場語境', body: '合作只有在共享問題、資料與現場脈絡時才有意義。NexAeon 關注的是問題是否值得一起研究。' },
              { label: 'Practice Focus｜實踐焦點', body: ['共同課程實驗。', '校園 AI 流程改造。', '學生支援研究。', 'AI 教育或管理原型測試。'] },
              { label: 'Current Use｜目前使用', body: '目前先以內容展示方式呈現研究與實踐能力，不設計銷售式聯絡流程。' },
              { label: 'Future Context｜未來情境', body: '未來若接入合作入口，也會以研究問題、資料需求與倫理邊界作為起點。' },
            ],
          },
        ],
      },
    ],
  },
  en: {
    common: {
      skipIntro: 'Skip',
      backHome: 'Back to Home',
      backToTop: 'Back to top',
      openModule: 'Open Entries',
      openPage: 'Open Page',
      entries: 'entries',
      moduleMenu: 'Subcontent Entries',
      notFoundTitle: 'Content Not Ready',
      notFoundBody: 'This entry is not available yet.',
      moduleLabel: 'Primary Module',
      tags: 'Tags',
    },
    hero: {
      eyebrow: 'A Digital Institute for the Age of AI',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub:
        'NexAeon is a digital institute for the age of AI, connecting research, teaching, knowledge management, and practical projects to transform AI from a tool into a thinking system for understanding the world, designing education, and building the future.',
      cta1: 'View Modules',
      cta2: 'Open Research Map',
      scrollCue: 'Scroll into the module map',
      meta: ['Lab No. 11', 'Est. 2026', 'Daejeon / Woosong Univ.'],
      nextLabel: 'Module Map',
      nextTitle: 'Six doors, one institute',
    },
    home: {
      eyebrow: 'NexAeon Modules',
      title: 'Primary Module Map',
      intro:
        'The homepage keeps only NexAeon’s overall position and six primary entries. Each module connects to full subpages for Joey’s research identity, teaching design, knowledge system, projects, and field practice.',
      activeHint: 'Choose a module here, then enter one of its subpages.',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      tagline: 'A digital institute for the age of AI',
    },
    modules: [
      {
        id: 'identity',
        code: '01',
        label: 'Identity',
        title: 'Identity｜Identity Navigation',
        summary: 'The identity layer for NexAeon, Joey, Nexōn, and the symbol philosophy.',
        position: 'This module explains why NexAeon exists and how it works as Joey’s personal AI-era institute and second brain.',
        items: [
          {
            id: 'manifesto',
            title: 'NexAeon Manifesto',
            subtitle: 'Turning AI from a tool into a research method for understanding the world.',
            status: 'Core Manifesto',
            summary:
              'NexAeon is Joey’s personal institute for the AI age. It does not frame itself as a single product, but as a system where research, teaching, knowledge management, and practice can grow together.',
            tags: ['Manifesto', 'Digital Institute', 'Second Brain'],
            sections: [
              { label: 'Core Position', body: 'NexAeon treats AI as an amplifier of thought rather than a mere efficiency tool. It connects questions, data, courses, prototypes, and field experience into a structure that can be searched, revised, and regenerated.' },
              { label: 'Philosophical Ground', body: 'Research is not isolated paper production. It is a way of continuously organizing the world. NexAeon turns personal knowledge management into a public interface for thought in progress.' },
              { label: 'Operating Logic', body: ['Research questions become the center of classification.', 'Courses and student feedback test whether ideas can be taught.', 'MVPs and field workflows test whether AI improves practice.'] },
              { label: 'Future Form', body: 'NexAeon will gradually connect Notion, Airtable, RAG, and automation workflows into an updatable, traceable, and collaborative research infrastructure.' },
            ],
          },
          {
            id: 'joey-research-identity',
            title: 'Joey Research Identity',
            subtitle: 'The intersection of AI education researcher, future professor, and system builder.',
            status: 'Identity in Formation',
            summary:
              'Joey’s research identity connects AI education, personalized learning, learning analytics, management transformation, and campus practice. NexAeon is the public interface for these directions.',
            tags: ['Research Identity', 'AI Education', 'Professor Path'],
            sections: [
              { label: 'Research Self', body: 'Joey studies how AI changes teaching, learning, and organizational decisions. The identity is not a single discipline label, but a problem orientation across education technology, management, knowledge systems, and cultural context.' },
              { label: 'Academic Trajectory', body: ['AI in Education is the main axis.', 'Personalized AI tutoring and learning data form the method field.', 'University practice, student support, and administrative automation form the field site.'] },
              { label: 'Teaching Identity', body: 'As a future professor and AI educator, Joey’s core task is helping students turn AI into a capability for problem understanding, research design, and self-directed learning.' },
              { label: 'Public Interface', body: 'NexAeon makes the research identity visible: every module, subpage, and project maps to a method pathway in formation.' },
            ],
          },
          {
            id: 'nexon-ai-assistant',
            title: 'Nexōn AI Assistant',
            subtitle: 'A language emissary connecting research, teaching, knowledge, and future imagination.',
            status: 'Role Prototype',
            summary:
              'Nexōn is not a generic chatbot. It is Joey’s AI teaching assistant, helping organize questions, translate knowledge, support teaching design, and reconnect scattered thinking to NexAeon’s research system.',
            tags: ['Nexōn', 'AI Assistant', 'Tutor'],
            sections: [
              { label: 'Role Definition', body: 'Nexōn helps people understand questions, not merely produce answers. It acts as a linguistic mediator across research, teaching, and knowledge work.' },
              { label: 'Assistant Logic', body: ['Clarify context before answering.', 'Separate concepts, evidence, operations, and reflection.', 'Encourage users to inspect AI output instead of accepting it passively.'] },
              { label: 'Educational Use', body: 'In class, Nexōn can support prompt practice, research-method guidance, and personalized feedback so students build more stable AI capabilities.' },
              { label: 'Future Imagination', body: 'Long term, Nexōn will connect to Joey’s second brain and become an interface for retrieving literature, reading course context, tracking student needs, and supporting research decisions.' },
            ],
          },
          {
            id: 'symbol-philosophy',
            title: 'Symbol & Philosophy',
            subtitle: 'Infinity Eye, Neural Links, and the purple-blue gradient form NexAeon’s visual philosophy.',
            status: 'Symbol System',
            summary:
              'The NexAeon logo is not decorative. It is a research symbol using eye, neural links, and infinite loops to express observation, learning, and continuous generation.',
            tags: ['Logo', 'Infinity Eye', 'Neural Links'],
            sections: [
              { label: 'Infinity Eye', body: 'The eye signals observation and understanding; the infinite loop signals knowledge returning to itself. Together, they express seeing the world while reorganizing thought.' },
              { label: 'Neural Links', body: 'The surrounding connections represent research nodes, course materials, tool workflows, and practical projects. NexAeon is built around relationships between nodes.' },
              { label: 'Core Eye', body: 'The central eye represents Joey’s research viewpoint and the observation center formed by the AI assistant and second brain.' },
              { label: 'Purple Blue Gradient', body: 'Purple holds philosophy and imagination; blue points to technology and reason. The gradient keeps NexAeon oriented toward both conceptual depth and engineering practice.' },
            ],
          },
        ],
      },
      {
        id: 'research',
        code: '02',
        label: 'Research',
        title: 'Research｜Research Map',
        summary: 'A map of AI education, personalized tutoring, learning analytics, and AI management transformation.',
        position: 'The research map keeps questions, methods, current stages, and future directions in one structure for papers, models, and experiments.',
        items: [
          {
            id: 'ai-in-education',
            title: 'AI in Education',
            subtitle: 'How AI reshapes instructional design, learning interaction, and assessment.',
            status: 'Ongoing Research',
            summary: 'This direction studies the new relationships among teachers, students, and AI systems in real educational contexts.',
            tags: ['AI Education', 'Pedagogy', 'Assessment'],
            sections: [
              { label: 'Research Focus', body: 'Build design principles for AI-supported teaching and examine whether AI improves understanding, engagement, and transfer.' },
              { label: 'Key Questions', body: ['Should AI in class act as a tool, assistant, or co-learner?', 'How can teachers judge AI feedback quality and risk?', 'How do we avoid efficiency gains without deeper learning?'] },
              { label: 'Current Stage', body: 'Collecting AI education cases, classroom interaction patterns, and assessment frameworks for a first research-question matrix.' },
              { label: 'Future Direction', body: 'Use classroom experiments and student feedback data to build comparable indicators for AI education outcomes.' },
            ],
          },
          {
            id: 'personalized-ai-tutoring',
            title: 'Personalized AI Tutoring',
            subtitle: 'AI support adapted to learner level, goals, and pace.',
            status: 'Prototype Validation',
            summary: 'This direction upgrades AI tutoring from generic Q&A to diagnosis, layered response, and learning memory.',
            tags: ['AI Tutor', 'Personalization', 'Learning Path'],
            sections: [
              { label: 'Research Focus', body: 'Design an AI tutoring model that adjusts tone, difficulty, hints, and next tasks by learner context.' },
              { label: 'Key Questions', body: ['How can AI detect where a student is truly stuck?', 'Can personalization work without crossing privacy boundaries?', 'How can AI feedback support autonomy instead of dependency?'] },
              { label: 'Current Stage', body: 'Testing early tutoring flows through prompt strategies and simulated dialogues while collecting common student question types.' },
              { label: 'Future Direction', body: 'Connect learning-history memory, diagnostic rubrics, and a teacher observation panel.' },
            ],
          },
          {
            id: 'learning-analytics',
            title: 'Learning Analytics',
            subtitle: 'Turning behavior, reflection quality, and participation rhythm into trackable signals.',
            status: 'Data Model Design',
            summary: 'This direction helps teachers understand learner states without reducing education to a single score.',
            tags: ['Learning Analytics', 'Engagement', 'Feedback'],
            sections: [
              { label: 'Research Focus', body: 'Build a multidimensional framework for question depth, engagement, feedback uptake, and task quality.' },
              { label: 'Key Questions', body: ['Which interaction data represents learning rather than mere activity?', 'How can qualitative reflection complement quantitative indicators?', 'How do analytics return to teaching decisions?'] },
              { label: 'Current Stage', body: 'Planning an Engagement Index and feedback-quality indicators for later classroom data analysis.' },
              { label: 'Future Direction', body: 'Build visual dashboards for student support, course adjustment, and AI tutor optimization.' },
            ],
          },
          {
            id: 'ai-management',
            title: 'AI × Management',
            subtitle: 'How AI reshapes decisions, processes, and capability building in universities and organizations.',
            status: 'Interdisciplinary Research',
            summary: 'This direction connects AI education with management practice and studies the shift from tool adoption to institutional transformation.',
            tags: ['AI Management', 'Organization', 'Transformation'],
            sections: [
              { label: 'Research Focus', body: 'Analyze process governance, capability training, and change resistance when AI enters educational institutions and companies.' },
              { label: 'Key Questions', body: ['How should organizations choose which workflows to AI-enable?', 'How can AI adoption become long-term capability rather than short-term display?', 'What data and narratives do leaders need for transformation?'] },
              { label: 'Current Stage', body: 'Mapping campus administration, admissions, knowledge management, and teaching-support scenarios.' },
              { label: 'Future Direction', body: 'Develop a university AI transformation framework connecting strategy, process, automation, and training.' },
            ],
          },
          {
            id: 'research-pipeline',
            title: 'Research Pipeline',
            subtitle: 'Turning scattered ideas into traceable questions, data, and outputs.',
            status: 'Pipeline Buildout',
            summary: 'Research Pipeline is NexAeon’s research operating system, tracking the path from question formation to literature, writing, and MVPs.',
            tags: ['Pipeline', 'Research Ops', 'Knowledge System'],
            sections: [
              { label: 'Research Focus', body: 'Create a workflow for managing questions, literature, hypotheses, data, writing, and publication states.' },
              { label: 'Key Questions', body: ['How do research ideas avoid staying as isolated notes?', 'How can literature, classroom data, and MVP tests cite one another?', 'Which status nodes make research progress transparent?'] },
              { label: 'Current Stage', body: 'The static website content structure is in place; the next step is connecting Notion or Airtable as a data source.' },
              { label: 'Future Direction', body: 'Create a research dashboard for paper topics, course cases, and prototype projects.' },
            ],
          },
        ],
      },
      {
        id: 'teaching',
        code: '03',
        label: 'Teaching',
        title: 'Teaching｜Courses',
        summary: 'Joey’s teaching philosophy as a future professor, AI educator, and student coach.',
        position: 'This is not a course-sales page. It presents teaching design, course research, and reusable learning materials.',
        items: [
          {
            id: 'prompt-engineering-course',
            title: 'Prompt Engineering Course',
            subtitle: 'Making prompt ability teachable, trainable, and assessable.',
            status: 'Course Design',
            summary: 'The course trains students to use AI for research and learning through problem framing, context design, output constraints, and rubrics.',
            tags: ['Prompt Engineering', 'Course Design', 'AI Literacy'],
            sections: [
              { label: 'Teaching Focus', body: 'Move students from asking AI to designing questions, controlling context, and evaluating output.' },
              { label: 'Learning Design', body: ['Break down prompt structures through cases.', 'Practice output-quality control through tasks.', 'Use peer assessment to build judgment.'] },
              { label: 'Current Format', body: 'Currently built through classroom exercises, research-task templates, and demonstration cases.' },
              { label: 'Future Direction', body: 'Develop a complete teaching pack with rubrics, assignment examples, and AI tutor practice.' },
            ],
          },
          {
            id: 'ai-literacy',
            title: 'AI Literacy',
            subtitle: 'Understanding AI capabilities, limits, risks, and responsibilities.',
            status: 'Teaching Framework',
            summary: 'AI literacy is not tool operation. It is knowing how models generate, when to trust them, how to verify, and how to use them responsibly.',
            tags: ['AI Literacy', 'Ethics', 'Critical Thinking'],
            sections: [
              { label: 'Teaching Focus', body: 'Build student judgment, problem awareness, and ethical sensitivity around AI-generated content.' },
              { label: 'Learning Design', body: ['Compare AI output with reliable sources.', 'Identify bias, hallucination, and data boundaries.', 'Practice treating AI as a thinking partner rather than an answer machine.'] },
              { label: 'Current Format', body: 'Introductory notes, discussion prompts, and case analyses are being prepared.' },
              { label: 'Future Direction', body: 'Integrate with prompt engineering and research methods as an AI foundation module.' },
            ],
          },
          {
            id: 'ai-research-methods',
            title: 'AI Research Methods',
            subtitle: 'Using AI to support question formation, literature review, and analysis.',
            status: 'Method Showcase',
            summary: 'This course direction places AI inside the research workflow while preserving human judgment, transparency, and reproducibility.',
            tags: ['Research Methods', 'Literature Review', 'Data Analysis'],
            sections: [
              { label: 'Teaching Focus', body: 'Teach students to use AI to support research rather than outsource research to AI.' },
              { label: 'Learning Design', body: ['Use AI to generate candidate research questions.', 'Build literature summaries and concept matrices.', 'Use AI to check surveys, interviews, and analysis workflows.'] },
              { label: 'Current Format', body: 'Currently organized as workflow demonstrations, templates, and workshop material.' },
              { label: 'Future Direction', body: 'Form an AI-assisted research toolkit from topic selection to argument output.' },
            ],
          },
          {
            id: 'student-coaching-model',
            title: 'Student Coaching Model',
            subtitle: 'Student support through AI tutoring, learning analytics, and teacher feedback.',
            status: 'Model Design',
            summary: 'This model focuses on student goals, difficulties, learning rhythm, and emotional load through AI-teacher collaboration.',
            tags: ['Coaching', 'Student Support', 'AI Tutor'],
            sections: [
              { label: 'Teaching Focus', body: 'Turn student support from one-off answers into a continuous coaching relationship.' },
              { label: 'Learning Design', body: ['Set learning goals and break down tasks.', 'Provide layered feedback and reflection prompts.', 'Help teachers see where students need support.'] },
              { label: 'Current Format', body: 'Common student needs, feedback language, and coaching-style Q&A structures are being collected.' },
              { label: 'Future Direction', body: 'Connect with the AI Tutoring MVP to form a personalized student-support prototype.' },
            ],
          },
          {
            id: 'course-materials',
            title: 'Course Materials',
            subtitle: 'A living library of course content, exercises, and research cases.',
            status: 'Framework Buildout',
            summary: 'The material library stores prompt examples, AI literacy cases, research-method templates, and classroom exercises for future iteration.',
            tags: ['Materials', 'Templates', 'Teaching System'],
            sections: [
              { label: 'Teaching Focus', body: 'Treat materials as searchable, rewritable teaching assets instead of one-time slides.' },
              { label: 'Learning Design', body: ['Separate materials into concepts, cases, exercises, and assessment.', 'Keep versions understandable across language backgrounds.', 'Feed classroom feedback back into material updates.'] },
              { label: 'Current Format', body: 'Presented first as a static content framework, with later integration into Notion or a database.' },
              { label: 'Future Direction', body: 'Build material indexing, version history, and course-pack export workflows.' },
            ],
          },
        ],
      },
      {
        id: 'knowledge-lab',
        code: '04',
        label: 'Knowledge Lab',
        title: 'Knowledge Lab｜Second Brain',
        summary: 'NexAeon’s second brain for literature, tool workflows, research notes, and concept maps.',
        position: 'The lab starts as a static framework and can later connect to Notion, Airtable, n8n, RAG, or a database.',
        items: [
          {
            id: 'literature-library',
            title: 'Literature Library',
            subtitle: 'A literature base for AI education, learning analytics, and AI management.',
            status: 'Library Framework',
            summary: 'The library keeps papers, models, methods, and citation notes in one index for retrieval and writing.',
            tags: ['Literature', 'Research', 'Library'],
            sections: [
              { label: 'Knowledge Function', body: 'Turn papers from files into searchable, citable nodes connected to research questions.' },
              { label: 'Sources', body: ['AI in Education papers.', 'Learning analytics and education technology studies.', 'AI management, TAM, VARK, and organizational transformation literature.'] },
              { label: 'Current Stage', body: 'Static categories and page entries are in place before external data sources are connected.' },
              { label: 'Future Integration', body: 'Connect Zotero, Notion, or RAG for summaries, tags, and concept relations.' },
            ],
          },
          {
            id: 'ai-tools-workflow',
            title: 'AI Tools Workflow',
            subtitle: 'AI tool combinations for research, teaching, and administrative work.',
            status: 'Workflow Curation',
            summary: 'This area records which AI tools fit which tasks and how to balance quality, cost, speed, and risk.',
            tags: ['AI Tools', 'Workflow', 'Automation'],
            sections: [
              { label: 'Knowledge Function', body: 'Turn scattered tool experiments into reusable workflows and decision criteria.' },
              { label: 'Sources', body: ['Prompt templates and output examples.', 'Research writing, data organization, and slide workflows.', 'Teaching and administrative automation cases.'] },
              { label: 'Current Stage', body: 'Static tool cards and workflow descriptions establish the first taxonomy.' },
              { label: 'Future Integration', body: 'Connect n8n or Make to automate common flows and record each run.' },
            ],
          },
          {
            id: 'notion-n8n-rag-system',
            title: 'Notion / n8n / RAG System',
            subtitle: 'A searchable, triggerable, and answerable second-brain system.',
            status: 'Architecture Planning',
            summary: 'This system connects Notion knowledge, n8n automation, and RAG retrieval to support research and teaching workflows.',
            tags: ['Notion', 'n8n', 'RAG'],
            sections: [
              { label: 'Knowledge Function', body: 'Knowledge should not only be stored; it should be recalled, recombined, and embedded into workflows when needed.' },
              { label: 'Sources', body: ['Research notes and literature summaries.', 'Course materials and student FAQs.', 'MVP documents, meeting notes, and administrative data.'] },
              { label: 'Current Stage', body: 'The website content structure now acts as the public layer for a future database schema.' },
              { label: 'Future Integration', body: 'APIs can support auto-summary, sync, semantic search, and cited AI assistant answers.' },
            ],
          },
          {
            id: 'research-notes',
            title: 'Research Notes',
            subtitle: 'Unfinished questions, concepts, hypotheses, and method reflections.',
            status: 'Notes System',
            summary: 'Research Notes is NexAeon’s thinking buffer for ideas not yet turned into papers, courses, or projects.',
            tags: ['Notes', 'Ideas', 'Research Ops'],
            sections: [
              { label: 'Knowledge Function', body: 'Keep unfinished ideas with context rather than scattering them across chat logs and temporary files.' },
              { label: 'Sources', body: ['Reading notes.', 'Classroom observations.', 'Student feedback.', 'AI conversations and prompt experiments.'] },
              { label: 'Current Stage', body: 'The page currently defines the role of notes; topic and research-question indexes come next.' },
              { label: 'Future Integration', body: 'Notes will link to literature, courses, MVPs, and concept maps to form full knowledge paths.' },
            ],
          },
          {
            id: 'concept-map',
            title: 'Concept Map',
            subtitle: 'Relations among research concepts, tools, and projects inside NexAeon.',
            status: 'Map Prototype',
            summary: 'The concept map turns AI education, tutoring, analytics, knowledge systems, and field practice into a traceable network.',
            tags: ['Concept Map', 'Knowledge Graph', 'Taxonomy'],
            sections: [
              { label: 'Knowledge Function', body: 'Show relationships between concepts and projects so users can understand NexAeon’s overall thought architecture.' },
              { label: 'Sources', body: ['Research topic nodes.', 'Course and material nodes.', 'Tool workflow and project nodes.', 'Field practice scenario nodes.'] },
              { label: 'Current Stage', body: 'Currently represented through content categories; an interactive node graph can come later.' },
              { label: 'Future Integration', body: 'Connect graph databases or visualization tools to form an explorable NexAeon knowledge graph.' },
            ],
          },
        ],
      },
      {
        id: 'projects',
        code: '05',
        label: 'Projects',
        title: 'Projects｜MVPs and Practice',
        summary: 'AI tutoring, GreenTrace, language-learning companion, admissions PDFs, and elder-care emotion support.',
        position: 'Each project is shown through problem, solution, technology, status, and next step rather than sales copy.',
        items: [
          {
            id: 'nexaeon-ai-tutoring-mvp',
            title: 'NexAeon AI Tutoring MVP',
            subtitle: 'Testing whether personalized AI tutoring supports real learning tasks.',
            status: 'MVP Testing',
            summary: 'This MVP focuses on question understanding, layered response, task breakdown, and feedback quality as the foundation for Nexōn.',
            tags: ['AI Tutor', 'MVP', 'Education'],
            sections: [
              { label: 'Problem', body: 'Students know they can use AI, but often do not know how to ask, judge answers, or turn responses into next learning actions.' },
              { label: 'Solution', body: 'Build an AI tutor prototype with question diagnosis, layered hints, and action suggestions.' },
              { label: 'Technology', body: ['LLM prompt orchestration', 'Learning rubric', 'Conversation memory prototype', 'Frontend interaction layer'] },
              { label: 'MVP Status', body: 'Core concept and page presentation are complete; dialogue strategies and test scenarios are being refined.' },
              { label: 'Next Step', body: 'Create student testing tasks and collect data on response quality, comprehension, and actionability.' },
            ],
          },
          {
            id: 'greentrace',
            title: 'GreenTrace',
            subtitle: 'A tracking system for carbon, ESG, and action data.',
            status: 'Concept Validation',
            summary: 'GreenTrace translates sustainability data from report language into a trackable, communicable, decision-support system.',
            tags: ['ESG', 'Carbon', 'Data System'],
            sections: [
              { label: 'Problem', body: 'Sustainability and carbon data are often scattered across documents, spreadsheets, and reports, making them hard to understand or track.' },
              { label: 'Solution', body: 'Create a prototype for carbon data organization, action tracking, and visual explanation.' },
              { label: 'Technology', body: ['Data dashboard', 'AI summary', 'Workflow automation', 'ESG taxonomy'] },
              { label: 'MVP Status', body: 'Currently preserved as a practice-project framework until concrete data sources are selected.' },
              { label: 'Next Step', body: 'Define minimum data fields and a demonstration scenario for the first carbon data workflow.' },
            ],
          },
          {
            id: 'woosong-buddy',
            title: 'Woosong Buddy',
            subtitle: 'A language-learning companion system with a supportive character.',
            status: 'Scenario Design',
            summary: 'Woosong Buddy uses an approachable interactive companion to reduce language-learning and campus-adaptation anxiety.',
            tags: ['Language Learning', 'Campus AI', 'Companion System'],
            sections: [
              { label: 'Problem', body: 'International students often lack immediate, low-pressure support for language practice, campus information, and cultural adaptation.' },
              { label: 'Solution', body: 'Design an AI companion with language practice, contextual Q&A, and friendly feedback.' },
              { label: 'Technology', body: ['Conversational AI', 'Scenario-based learning', 'Gamified feedback', 'Multilingual content'] },
              { label: 'MVP Status', body: 'Role settings, language tasks, and campus-support scenarios are being defined.' },
              { label: 'Next Step', body: 'Build the first language tasks and common freshman scenario dialogues.' },
            ],
          },
          {
            id: 'admissions-pdf-system',
            title: 'Admissions PDF System',
            subtitle: 'Turning admissions PDF files into structured, comparable review data.',
            status: 'Workflow Validation',
            summary: 'This system supports admissions administration by extracting fields, organizing applicant data, and reducing repetitive manual work.',
            tags: ['PDF', 'Admissions', 'Automation'],
            sections: [
              { label: 'Problem', body: 'Admissions documents vary in format and require heavy manual comparison, which slows review and creates inconsistency.' },
              { label: 'Solution', body: 'Build a workflow for PDF field extraction, data normalization, and review checklist generation.' },
              { label: 'Technology', body: ['PDF parsing', 'OCR-ready workflow', 'Structured extraction', 'Admin automation'] },
              { label: 'MVP Status', body: 'Scenario needs are confirmed; field templates and pilot workflow are being prepared.' },
              { label: 'Next Step', body: 'Complete a field schema and test extraction accuracy with sample files.' },
            ],
          },
          {
            id: 'lightmind-plus',
            title: 'LightMind+',
            subtitle: 'AI support for elder emotional care, reminders, and companionship.',
            status: 'Concept Research',
            summary: 'LightMind+ explores gentle AI-assisted care for emotional support and everyday companionship among older adults.',
            tags: ['Elder Care', 'Emotion Support', 'AI Companion'],
            sections: [
              { label: 'Problem', body: 'Older adults may face loneliness, emotional fluctuation, memory reminders, and insufficient day-to-day support.' },
              { label: 'Solution', body: 'Design an AI support prototype for emotional check-ins, daily reminders, family notification, and simple companionship.' },
              { label: 'Technology', body: ['Conversational interface', 'Sentiment-aware prompts', 'Reminder workflow', 'Care context logging'] },
              { label: 'MVP Status', body: 'Currently in needs and ethics-boundary research rather than productization.' },
              { label: 'Next Step', body: 'Create care scenarios and risk checklists before technical implementation.' },
            ],
          },
        ],
      },
      {
        id: 'field-lab',
        code: '06',
        label: 'Field Lab',
        title: 'Field Lab｜Field Laboratory',
        summary: 'How Joey connects AI, education, research, and administrative reality.',
        position: 'Field Lab is not a contact funnel. It records the practice context where AI meets universities and student support.',
        items: [
          {
            id: 'university-practice',
            title: 'University Practice',
            subtitle: 'Observing AI education, courses, and administrative processes in a university context.',
            status: 'Field Observation',
            summary: 'The university becomes NexAeon’s field site where research questions grow from real teaching and administrative needs.',
            tags: ['University', 'Practice', 'Field Notes'],
            sections: [
              { label: 'Context', body: 'A university contains teaching, research, admissions, student support, and administrative collaboration, making it a complex site for AI transformation.' },
              { label: 'Practice Focus', body: ['AI use in courses.', 'Student support workflows.', 'Administrative data organization.', 'Multilingual communication and international student service.'] },
              { label: 'Current Use', body: 'Current work converts observations, cases, and prototype ideas into research and MVP tasks.' },
              { label: 'Future Context', body: 'Build a university AI transformation case library connecting courses, administration, and student support.' },
            ],
          },
          {
            id: 'student-support',
            title: 'Student Support',
            subtitle: 'Helping students understand tasks, organize questions, and receive personalized feedback.',
            status: 'Scenario Mapping',
            summary: 'Student support is a core NexAeon field. AI can help learning only when designed with teacher judgment, emotional awareness, and educational ethics.',
            tags: ['Student Support', 'Coaching', 'Learning'],
            sections: [
              { label: 'Context', body: 'Students need more than answers. They need to know what to do next, how to revise, and when to ask teachers for help.' },
              { label: 'Practice Focus', body: ['Learning-task breakdown.', 'Report and research-question guidance.', 'AI literacy reminders.', 'Emotional and pressure-signal observation.'] },
              { label: 'Current Use', body: 'Common student problems are being translated into AI Tutor test scenarios and course design cases.' },
              { label: 'Future Context', body: 'Create a student-support dashboard and personalized coaching model.' },
            ],
          },
          {
            id: 'administrative-automation',
            title: 'Administrative Automation',
            subtitle: 'Making repetitive administrative flows traceable, standardized, and time-saving.',
            status: 'Workflow Audit',
            summary: 'Administrative automation does not replace people; it reduces low-value repetition so humans can return to judgment, communication, and service quality.',
            tags: ['Automation', 'Administration', 'Workflow'],
            sections: [
              { label: 'Context', body: 'Admissions, document handling, notifications, data comparison, and report generation consume significant time.' },
              { label: 'Practice Focus', body: ['PDF and spreadsheet extraction.', 'Notifications and task tracking.', 'Workflow node standardization.', 'AI-generated summaries and review assistance.'] },
              { label: 'Current Use', body: 'A concrete direction already exists through the Admissions PDF System.' },
              { label: 'Future Context', body: 'Build a campus administrative automation toolkit with auditable and traceable workflows.' },
            ],
          },
          {
            id: 'ai-education-experiment',
            title: 'AI Education Experiment',
            subtitle: 'Turning the classroom into a site for research, feedback, and prototype testing.',
            status: 'Experiment Design',
            summary: 'AI education experiments make courses more than content delivery. They observe how students understand, use, and reflect on AI.',
            tags: ['Experiment', 'Classroom', 'AI Education'],
            sections: [
              { label: 'Context', body: 'When AI enters class, student questioning, learning strategies, and assignment outputs change.' },
              { label: 'Practice Focus', body: ['Prompt practice.', 'AI response-quality evaluation.', 'Student reflection records.', 'Classroom activity and AI tutor comparison.'] },
              { label: 'Current Use', body: 'Course design and research-question mapping are underway before comparable experimental tasks are built.' },
              { label: 'Future Context', body: 'Create an AI education experiment protocol that supports papers, courses, and system prototypes together.' },
            ],
          },
          {
            id: 'future-collaboration-context',
            title: 'Future Collaboration Context',
            subtitle: 'Future collaboration as shared research context, not a sales funnel.',
            status: 'Context Definition',
            summary: 'This page describes possible future research and practice contexts with professors, schools, student teams, or organizations without turning Field Lab into a lead-generation page.',
            tags: ['Context', 'Collaboration', 'Field Lab'],
            sections: [
              { label: 'Context', body: 'Collaboration matters only when people share a problem, data, and field context. NexAeon asks whether the problem is worth studying together.' },
              { label: 'Practice Focus', body: ['Shared course experiments.', 'Campus AI workflow redesign.', 'Student-support research.', 'AI education or management prototype testing.'] },
              { label: 'Current Use', body: 'The site currently presents research and practice capacity without a sales-style contact flow.' },
              { label: 'Future Context', body: 'If a collaboration entry is added later, it should begin with research questions, data needs, and ethical boundaries.' },
            ],
          },
        ],
      },
    ],
  },
  ko: {
    common: {
      skipIntro: '건너뛰기',
      backHome: '홈으로 돌아가기',
      backToTop: '맨 위로',
      openModule: '하위 콘텐츠 열기',
      openPage: '페이지 열기',
      entries: '개 입구',
      moduleMenu: '하위 콘텐츠 입구',
      notFoundTitle: '콘텐츠 준비 중',
      notFoundBody: '이 항목은 아직 표시할 콘텐츠가 없습니다.',
      moduleLabel: '1차 모듈',
      tags: 'Tags',
    },
    hero: {
      eyebrow: 'AI 시대의 디지털 연구소',
      titleSerif: 'NexAeon',
      titleSerifSub: 'A Digital Institute',
      titleSans: 'for the Age of AI',
      sub:
        'NexAeon은 AI 시대의 디지털 연구소입니다. 연구, 교육, 지식관리, 실천 프로젝트를 연결하여 AI를 단순한 도구가 아니라 세계를 이해하고 교육을 설계하며 미래를 구축하는 사고 시스템으로 전환합니다.',
      cta1: '모듈 보기',
      cta2: '연구 지도 열기',
      scrollCue: '아래로 내려 모듈 지도로 이동',
      meta: ['Lab No. 11', '2026 설립', '대전 / 우송대'],
      nextLabel: 'Module Map',
      nextTitle: '여섯 개의 입구, 하나의 연구소',
    },
    home: {
      eyebrow: 'NexAeon Modules',
      title: '1차 모듈 지도',
      intro:
        '홈페이지는 NexAeon의 전체 정체성과 여섯 개의 1차 입구만 보여줍니다. 각 모듈은 Joey의 연구 정체성, 교육 설계, 지식 시스템, 프로젝트와 현장 실천을 연결하는 하위 페이지로 이어집니다.',
      activeHint: '모듈을 선택한 뒤 해당 하위 페이지로 들어갈 수 있습니다.',
    },
    footer: {
      built: 'Built by Joey',
      year: '© 2026 NexAeon Studio',
      tagline: 'A digital institute for the age of AI',
    },
    modules: [
      {
        id: 'identity',
        code: '01',
        label: 'Identity',
        title: 'Identity｜정체성 내비게이션',
        summary: 'NexAeon, Joey, Nexōn, 그리고 로고 철학을 정의하는 정체성 레이어입니다.',
        position: 'NexAeon이 왜 존재하며 Joey의 AI 시대 개인 연구소이자 두 번째 뇌로 어떻게 작동하는지 설명합니다.',
        items: [
          {
            id: 'manifesto',
            title: 'NexAeon Manifesto｜선언문',
            subtitle: 'AI를 도구에서 세계를 이해하는 연구 방법으로 전환합니다.',
            status: '핵심 선언',
            summary:
              'NexAeon은 Joey가 AI 시대에 구축하는 개인 연구소입니다. 하나의 제품이 아니라 연구, 교육, 지식관리, 실천 프로젝트가 함께 성장하는 시스템입니다.',
            tags: ['Manifesto', 'Digital Institute', 'Second Brain'],
            sections: [
              { label: 'Core Position｜핵심 위치', body: 'NexAeon은 AI를 단순 효율 도구가 아닌 사고 증폭 장치로 봅니다. 질문, 데이터, 수업, 프로토타입, 현장 경험을 검색·수정·재생성 가능한 구조로 연결합니다.' },
              { label: 'Philosophical Ground｜철학적 기반', body: '연구는 고립된 논문 생산이 아니라 세계를 지속적으로 정리하는 방식입니다. NexAeon은 개인 지식관리를 공개 가능한 연구 인터페이스로 확장합니다.' },
              { label: 'Operating Logic｜운영 논리', body: ['연구 질문을 분류의 중심에 둡니다.', '수업과 학생 피드백으로 개념이 가르칠 수 있는지 검증합니다.', 'MVP와 현장 흐름으로 AI가 실제 실천을 개선하는지 테스트합니다.'] },
              { label: 'Future Form｜미래 형태', body: 'Notion, Airtable, RAG, 자동화 워크플로를 점진적으로 연결해 갱신·추적·협업 가능한 연구 인프라로 발전합니다.' },
            ],
          },
          {
            id: 'joey-research-identity',
            title: 'Joey Research Identity｜연구자 정체성',
            subtitle: 'AI 교육 연구자, 미래 교수, 시스템 빌더가 만나는 정체성입니다.',
            status: '정체성 형성 중',
            summary:
              'Joey의 연구 정체성은 AI 교육, 개인화 학습, 학습분석, 경영 전환, 대학 현장 실천을 연결합니다. NexAeon은 이 방향들의 공개 연구 인터페이스입니다.',
            tags: ['Research Identity', 'AI Education', 'Professor Path'],
            sections: [
              { label: 'Research Self｜연구 자아', body: 'Joey는 AI가 교육, 학습, 조직 의사결정을 어떻게 바꾸는지 연구합니다. 이는 단일 학문 표지가 아니라 교육기술, 경영, 지식 시스템, 문화 맥락을 가로지르는 문제의식입니다.' },
              { label: 'Academic Trajectory｜학술 경로', body: ['AI in Education을 주축으로 둡니다.', '개인화 AI 튜터와 학습 데이터를 방법의 장으로 삼습니다.', '대학 현장, 학생 지원, 행정 자동화를 실천의 장으로 삼습니다.'] },
              { label: 'Teaching Identity｜교육 정체성', body: '미래 교수이자 AI 교육자로서 Joey의 핵심 과제는 학생이 AI를 문제 이해, 연구 설계, 자기주도 학습 능력으로 전환하도록 돕는 것입니다.' },
              { label: 'Public Interface｜공개 인터페이스', body: 'NexAeon은 연구 정체성을 구체적으로 보여줍니다. 모든 모듈, 하위 페이지, 프로젝트는 형성 중인 방법 경로에 연결됩니다.' },
            ],
          },
          {
            id: 'nexon-ai-assistant',
            title: 'Nexōn AI Assistant｜AI 조교 역할',
            subtitle: '연구, 교육, 지식, 미래 상상을 연결하는 언어 사절입니다.',
            status: '역할 프로토타입',
            summary:
              'Nexōn은 일반 챗봇이 아니라 Joey의 AI 조교입니다. 질문을 정리하고 지식을 번역하며 교육 설계를 지원하고 흩어진 사고를 NexAeon 연구 시스템으로 다시 연결합니다.',
            tags: ['Nexōn', 'AI Assistant', 'Tutor'],
            sections: [
              { label: 'Role Definition｜역할 정의', body: 'Nexōn은 답을 빠르게 생산하기보다 사람이 질문을 이해하도록 돕습니다. 연구, 교육, 지식관리 사이에서 언어적 중개자 역할을 합니다.' },
              { label: 'Assistant Logic｜조교 논리', body: ['답하기 전에 맥락을 확인합니다.', '개념, 근거, 실행, 성찰을 분리합니다.', 'AI 출력을 그대로 수용하기보다 검토하도록 유도합니다.'] },
              { label: 'Educational Use｜교육 활용', body: '수업에서는 Prompt 연습, 연구 방법 안내, 개인화 피드백을 지원하는 조교로 작동해 학생의 안정적인 AI 사용 능력을 길러줍니다.' },
              { label: 'Future Imagination｜미래 상상', body: '장기적으로 Nexōn은 Joey의 두 번째 뇌와 연결되어 문헌 검색, 수업 맥락 읽기, 학생 요구 추적, 연구 의사결정을 지원하는 인터페이스가 됩니다.' },
            ],
          },
          {
            id: 'symbol-philosophy',
            title: 'Symbol & Philosophy｜로고와 철학 상징',
            subtitle: 'Infinity Eye, Neural Links, 보라-파랑 그라데이션이 NexAeon의 시각 철학을 구성합니다.',
            status: '상징 시스템',
            summary:
              'NexAeon 로고는 장식이 아니라 연구 상징입니다. 눈, 신경 연결, 무한 루프를 통해 관찰, 학습, 지속 생성을 표현합니다.',
            tags: ['Logo', 'Infinity Eye', 'Neural Links'],
            sections: [
              { label: 'Infinity Eye｜무한의 눈', body: '눈은 관찰과 이해를, 무한 루프는 지식의 순환을 뜻합니다. 둘의 결합은 세계를 보는 동시에 사고를 재조직한다는 의미입니다.' },
              { label: 'Neural Links｜신경 연결', body: '주변 연결선은 연구 노드, 수업 자료, 도구 흐름, 실천 프로젝트의 관계를 나타냅니다. NexAeon의 핵심은 단일 성과보다 노드 간 관계입니다.' },
              { label: 'Core Eye｜핵심 눈', body: '중앙의 눈은 Joey의 연구 관점이자 AI 조교와 두 번째 뇌가 함께 만드는 관찰 중심을 나타냅니다.' },
              { label: 'Purple Blue Gradient｜보라-파랑 그라데이션', body: '보라는 철학과 상상을, 파랑은 기술과 이성을 가리킵니다. 그라데이션은 NexAeon이 사유의 깊이와 엔지니어링 실천을 함께 지향해야 함을 보여줍니다.' },
            ],
          },
        ],
      },
      {
        id: 'research',
        code: '02',
        label: 'Research',
        title: 'Research｜연구 지도',
        summary: 'AI 교육, 개인화 튜터링, 학습분석, AI 경영 전환의 연구 축을 정리합니다.',
        position: '연구 지도는 질문, 방법, 현재 단계, 미래 방향을 한 구조에 두어 논문, 모델, 실험으로 확장합니다.',
        items: [
          {
            id: 'ai-in-education',
            title: 'AI in Education｜AI 교육 연구',
            subtitle: 'AI가 수업 설계, 학습 상호작용, 교육 평가를 어떻게 바꾸는지 연구합니다.',
            status: '지속 연구 중',
            summary: '교육 현장에 AI가 들어온 뒤 교사, 학생, 시스템 사이에 생기는 새로운 관계를 탐구합니다.',
            tags: ['AI Education', 'Pedagogy', 'Assessment'],
            sections: [
              { label: 'Research Focus｜연구 초점', body: 'AI 지원 수업의 설계 원칙을 만들고 AI 개입이 이해, 참여, 전이 능력을 실제로 개선하는지 분석합니다.' },
              { label: 'Key Questions｜핵심 질문', body: ['수업에서 AI는 도구, 조교, 공동 학습자 중 무엇이어야 하는가?', '교사는 AI 피드백의 품질과 위험을 어떻게 판단하는가?', '효율만 높이고 깊은 학습을 약화하지 않으려면 어떻게 해야 하는가?'] },
              { label: 'Current Stage｜현재 단계', body: 'AI 교육 사례, 교실 상호작용 패턴, 평가 프레임워크를 정리해 1차 연구 질문 매트릭스를 준비 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '수업 실험과 학생 피드백 데이터를 통해 AI 교육 성과 지표를 구축합니다.' },
            ],
          },
          {
            id: 'personalized-ai-tutoring',
            title: 'Personalized AI Tutoring｜개인화 AI 튜터링',
            subtitle: '학습자의 수준, 목표, 속도에 맞춰 실행 가능한 도움을 제공합니다.',
            status: '프로토타입 검증 중',
            summary: '일반 Q&A를 넘어 진단, 계층형 응답, 학습 기억을 갖춘 개인화 튜터링 시스템을 연구합니다.',
            tags: ['AI Tutor', 'Personalization', 'Learning Path'],
            sections: [
              { label: 'Research Focus｜연구 초점', body: '학습자 맥락에 따라 말투, 난이도, 힌트, 다음 과제를 조정하는 AI 튜터 모델을 설계합니다.' },
              { label: 'Key Questions｜핵심 질문', body: ['AI는 학생이 실제로 막힌 지점을 어떻게 파악하는가?', '개인화는 개인정보 경계를 지키며 작동할 수 있는가?', 'AI 피드백이 의존이 아니라 자율성을 높이려면 어떻게 해야 하는가?'] },
              { label: 'Current Stage｜현재 단계', body: 'Prompt 전략과 모의 대화를 통해 초기 튜터링 흐름을 테스트하고 학생 질문 유형을 정리 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '학습 이력 기억, 진단 루브릭, 교사용 관찰 패널을 연결합니다.' },
            ],
          },
          {
            id: 'learning-analytics',
            title: 'Learning Analytics｜학습 데이터 분석',
            subtitle: '학습 행동, 성찰 품질, 참여 리듬을 추적 가능한 신호로 전환합니다.',
            status: '데이터 모델 설계 중',
            summary: '교육을 단일 점수로 축소하지 않으면서 교사가 학생 상태를 이해하도록 돕는 방향입니다.',
            tags: ['Learning Analytics', 'Engagement', 'Feedback'],
            sections: [
              { label: 'Research Focus｜연구 초점', body: '질문 깊이, 학습 참여, 피드백 흡수, 과제 품질을 반영하는 다차원 분석 프레임워크를 만듭니다.' },
              { label: 'Key Questions｜핵심 질문', body: ['어떤 상호작용 데이터가 단순 활동이 아니라 학습을 나타내는가?', '질적 성찰은 정량 지표와 어떻게 보완되는가?', '학습분석 결과는 어떻게 수업 의사결정으로 돌아가는가?'] },
              { label: 'Current Stage｜현재 단계', body: 'Engagement Index와 피드백 품질 지표를 설계 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '학생 지원, 수업 조정, AI 튜터 최적화를 위한 시각화 대시보드를 구축합니다.' },
            ],
          },
          {
            id: 'ai-management',
            title: 'AI × Management｜AI 경영과 조직 전환',
            subtitle: 'AI가 대학과 조직의 의사결정, 프로세스, 역량 구축을 어떻게 바꾸는지 연구합니다.',
            status: '융합 연구 중',
            summary: 'AI 교육과 경영 실무를 연결하여 도구 도입에서 제도, 흐름, 문화 전환으로 이동하는 과정을 탐구합니다.',
            tags: ['AI Management', 'Organization', 'Transformation'],
            sections: [
              { label: 'Research Focus｜연구 초점', body: 'AI 도입 과정의 프로세스 거버넌스, 역량 훈련, 변화 저항을 분석합니다.' },
              { label: 'Key Questions｜핵심 질문', body: ['조직은 어떤 흐름을 AI화할지 어떻게 판단하는가?', 'AI 도입이 단기 전시가 아니라 장기 역량이 되려면 무엇이 필요한가?', '관리자는 전환을 위해 어떤 데이터와 서사가 필요한가?'] },
              { label: 'Current Stage｜현재 단계', body: '캠퍼스 행정, 입학, 지식관리, 수업 지원 장면을 사례 지도로 정리 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '전략, 프로세스, 자동화, 인력 훈련을 연결하는 대학 AI 전환 프레임워크를 만듭니다.' },
            ],
          },
          {
            id: 'research-pipeline',
            title: 'Research Pipeline｜연구 진행 파이프라인',
            subtitle: '흩어진 연구 아이디어를 추적 가능한 질문, 데이터, 산출물로 정리합니다.',
            status: '파이프라인 구축 중',
            summary: 'Research Pipeline은 질문 형성, 문헌 정리, 글쓰기, MVP까지 이어지는 NexAeon의 연구 운영 시스템입니다.',
            tags: ['Pipeline', 'Research Ops', 'Knowledge System'],
            sections: [
              { label: 'Research Focus｜연구 초점', body: '연구 질문, 문헌, 가설, 데이터, 글쓰기, 발표 상태를 관리하는 흐름을 구축합니다.' },
              { label: 'Key Questions｜핵심 질문', body: ['연구 아이디어가 고립된 노트로 남지 않으려면 어떻게 해야 하는가?', '문헌, 수업 데이터, MVP 테스트는 어떻게 서로 인용되는가?', '어떤 상태 노드가 연구 진행을 투명하게 만드는가?'] },
              { label: 'Current Stage｜현재 단계', body: '정적 웹사이트 콘텐츠 구조는 완성되었고 다음 단계는 Notion 또는 Airtable 데이터 연결입니다.' },
              { label: 'Future Direction｜미래 방향', body: '논문 주제, 수업 사례, 프로토타입 프로젝트를 함께 관리하는 연구 대시보드를 구축합니다.' },
            ],
          },
        ],
      },
      {
        id: 'teaching',
        code: '03',
        label: 'Teaching',
        title: 'Teaching｜교육과 코스',
        summary: '미래 교수, AI 교육자, 학생 코치로서 Joey의 교육 설계를 보여줍니다.',
        position: '판매용 강의 페이지가 아니라 교육 설계와 코스 연구를 보여주는 공간입니다.',
        items: [
          {
            id: 'prompt-engineering-course',
            title: 'Prompt Engineering Course｜Prompt 엔지니어링 코스',
            subtitle: 'Prompt 역량을 가르치고 연습하고 평가할 수 있는 학술 능력으로 만듭니다.',
            status: '코스 설계 중',
            summary: '문제 정의, 맥락 설계, 출력 제약, 평가 루브릭을 통해 학생이 AI를 연구와 학습에 안정적으로 활용하도록 훈련합니다.',
            tags: ['Prompt Engineering', 'Course Design', 'AI Literacy'],
            sections: [
              { label: 'Teaching Focus｜교육 초점', body: '학생이 AI에게 묻는 수준을 넘어 질문을 설계하고 맥락을 제어하며 출력을 평가하도록 돕습니다.' },
              { label: 'Learning Design｜학습 설계', body: ['사례로 Prompt 구조를 분해합니다.', '과제로 출력 품질 제어를 연습합니다.', '동료 평가로 판단 기준을 세웁니다.'] },
              { label: 'Current Format｜현재 형태', body: '수업 연습, 연구 과제 템플릿, 시범 사례 형태로 구성 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '루브릭, 과제 예시, AI Tutor 연습이 포함된 완성형 수업 패키지로 발전합니다.' },
            ],
          },
          {
            id: 'ai-literacy',
            title: 'AI Literacy｜AI 리터러시 교육',
            subtitle: 'AI의 능력, 한계, 위험, 책임을 이해합니다.',
            status: '교육 프레임워크 구축 중',
            summary: 'AI 리터러시는 도구 사용법이 아니라 모델 생성 방식, 신뢰 조건, 검증 방법, 책임 있는 활용을 이해하는 능력입니다.',
            tags: ['AI Literacy', 'Ethics', 'Critical Thinking'],
            sections: [
              { label: 'Teaching Focus｜교육 초점', body: 'AI 생성 콘텐츠에 대한 판단력, 문제의식, 윤리 감수성을 기릅니다.' },
              { label: 'Learning Design｜학습 설계', body: ['AI 출력과 신뢰 가능한 출처를 비교합니다.', '편향, 환각, 데이터 경계를 식별합니다.', 'AI를 답변 기계가 아니라 사고 파트너로 사용하는 법을 연습합니다.'] },
              { label: 'Current Format｜현재 형태', body: '입문 강의안, 토론 질문, 사례 분석을 정리 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: 'Prompt 엔지니어링과 연구 방법 수업의 기반 모듈로 통합합니다.' },
            ],
          },
          {
            id: 'ai-research-methods',
            title: 'AI Research Methods｜AI 보조 연구 방법',
            subtitle: 'AI로 연구 질문 형성, 문헌 정리, 데이터 분석을 지원합니다.',
            status: '방법 전시 중',
            summary: 'AI를 연구 흐름 안에 넣되 연구자의 판단, 방법 투명성, 재현 가능성을 유지하는 방향입니다.',
            tags: ['Research Methods', 'Literature Review', 'Data Analysis'],
            sections: [
              { label: 'Teaching Focus｜교육 초점', body: '학생이 연구를 AI에게 맡기는 것이 아니라 AI로 연구 과정을 보조하도록 가르칩니다.' },
              { label: 'Learning Design｜학습 설계', body: ['AI로 연구 질문 후보를 생성합니다.', '문헌 요약과 개념 매트릭스를 만듭니다.', '설문, 인터뷰, 분석 흐름을 AI로 점검합니다.'] },
              { label: 'Current Format｜현재 형태', body: '연구 흐름 시연, 템플릿, 워크숍 자료로 정리 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: '주제 선정부터 논증 산출까지 지원하는 AI-assisted research toolkit으로 발전합니다.' },
            ],
          },
          {
            id: 'student-coaching-model',
            title: 'Student Coaching Model｜학생 개인화 코칭 모델',
            subtitle: 'AI Tutor, 학습분석, 교사 피드백을 결합한 학생 지원 모델입니다.',
            status: '모델 설계 중',
            summary: '학생의 목표, 어려움, 학습 리듬, 정서적 부담을 AI와 교사가 함께 지원하는 구조입니다.',
            tags: ['Coaching', 'Student Support', 'AI Tutor'],
            sections: [
              { label: 'Teaching Focus｜교육 초점', body: '학생 지원을 일회성 답변에서 지속적인 학습 코칭 관계로 전환합니다.' },
              { label: 'Learning Design｜학습 설계', body: ['학습 목표와 과제를 분해합니다.', '계층형 피드백과 성찰 질문을 제공합니다.', '교사가 학생의 지원 필요 지점을 볼 수 있게 합니다.'] },
              { label: 'Current Format｜현재 형태', body: '학생의 공통 요구, 피드백 언어, 코칭형 Q&A 프레임을 정리 중입니다.' },
              { label: 'Future Direction｜미래 방향', body: 'AI Tutoring MVP와 연결해 개인화 학생 지원 프로토타입을 만듭니다.' },
            ],
          },
          {
            id: 'course-materials',
            title: 'Course Materials｜수업 자료',
            subtitle: '수업 내용, 연습 템플릿, 연구 사례를 업데이트 가능한 자료库로 정리합니다.',
            status: '프레임워크 구축 중',
            summary: 'Prompt 예시, AI 리터러시 사례, 연구 방법 템플릿, 수업 연습을 보존하고 반복 개선합니다.',
            tags: ['Materials', 'Templates', 'Teaching System'],
            sections: [
              { label: 'Teaching Focus｜교육 초점', body: '수업 자료를 일회성 슬라이드가 아니라 검색·수정·재사용 가능한 교육 자산으로 만듭니다.' },
              { label: 'Learning Design｜학습 설계', body: ['자료를 개념, 사례, 연습, 평가로 나눕니다.', '다양한 언어 배경의 학생이 이해할 수 있는 버전을 유지합니다.', '수업 피드백을 자료 업데이트 흐름에 반영합니다.'] },
              { label: 'Current Format｜현재 형태', body: '우선 정적 콘텐츠 프레임워크로 제시하고 이후 Notion 또는 데이터베이스에 연결합니다.' },
              { label: 'Future Direction｜미래 방향', body: '자료 인덱스, 버전 기록, 코스 패키지 내보내기 흐름을 구축합니다.' },
            ],
          },
        ],
      },
      {
        id: 'knowledge-lab',
        code: '04',
        label: 'Knowledge Lab',
        title: 'Knowledge Lab｜지식 실험실',
        summary: '문헌, 도구 흐름, 연구 노트, 개념 지도를 정리하는 NexAeon의 두 번째 뇌입니다.',
        position: '현재는 정적 콘텐츠 프레임워크이며 이후 Notion, Airtable, n8n, RAG, 데이터베이스에 연결할 수 있습니다.',
        items: [
          {
            id: 'literature-library',
            title: 'Literature Library｜연구 문헌库',
            subtitle: 'AI 교육, 학습분석, AI 경영 문헌을 보존합니다.',
            status: '문헌库 프레임워크',
            summary: '논문, 이론 모델, 방법 도구, 인용 노트를 하나의 인덱스로 관리해 검색과 연구 글쓰기를 지원합니다.',
            tags: ['Literature', 'Research', 'Library'],
            sections: [
              { label: 'Knowledge Function｜지식 기능', body: 'PDF 파일 형태의 문헌을 검색 가능하고 인용 가능하며 연구 질문과 연결되는 지식 노드로 전환합니다.' },
              { label: 'Sources｜자료 출처', body: ['AI in Education 논문.', 'Learning Analytics와 교육기술 연구.', 'AI Management, TAM, VARK, 조직 전환 문헌.'] },
              { label: 'Current Stage｜현재 단계', body: '외부 데이터 연결 전에 정적 분류와 페이지 입구를 먼저 구축했습니다.' },
              { label: 'Future Integration｜미래 연결', body: 'Zotero, Notion, RAG와 연결해 요약, 태그, 개념 관계를 제공합니다.' },
            ],
          },
          {
            id: 'ai-tools-workflow',
            title: 'AI Tools Workflow｜AI 도구 흐름',
            subtitle: '연구, 교육, 행정 업무의 AI 도구 조합을 정리합니다.',
            status: '흐름 정리 중',
            summary: '어떤 AI 도구가 어떤 과제에 적합한지, 품질·비용·속도·위험을 어떻게 균형 잡을지 기록합니다.',
            tags: ['AI Tools', 'Workflow', 'Automation'],
            sections: [
              { label: 'Knowledge Function｜지식 기능', body: '흩어진 도구 실험을 반복 가능한 워크플로와 판단 기준으로 정리합니다.' },
              { label: 'Sources｜자료 출처', body: ['Prompt 템플릿과 출력 예시.', '연구 글쓰기, 자료 정리, 발표 제작 흐름.', '수업과 행정 자동화 사례.'] },
              { label: 'Current Stage｜현재 단계', body: '정적 도구 카드와 흐름 설명을 통해 첫 분류 체계를 구축 중입니다.' },
              { label: 'Future Integration｜미래 연결', body: 'n8n 또는 Make와 연결해 반복 흐름을 자동화하고 실행 결과를 기록합니다.' },
            ],
          },
          {
            id: 'notion-n8n-rag-system',
            title: 'Notion / n8n / RAG System｜지식 자동화 시스템',
            subtitle: '두 번째 뇌를 검색 가능하고 트리거 가능하며 답변 가능한 시스템으로 만듭니다.',
            status: '아키텍처 기획 중',
            summary: 'Notion 지식库, n8n 자동화, RAG 검색을 연결해 연구와 교육 워크플로를 지원합니다.',
            tags: ['Notion', 'n8n', 'RAG'],
            sections: [
              { label: 'Knowledge Function｜지식 기능', body: '지식은 저장될 뿐 아니라 필요할 때 호출되고 재구성되며 업무 흐름에 삽입되어야 합니다.' },
              { label: 'Sources｜자료 출처', body: ['연구 노트와 문헌 요약.', '수업 자료와 학생 FAQ.', 'MVP 문서, 회의 기록, 행정 자료.'] },
              { label: 'Current Stage｜현재 단계', body: '웹사이트 콘텐츠 구조를 미래 데이터베이스 schema의 공개 레이어로 구축했습니다.' },
              { label: 'Future Integration｜미래 연결', body: 'API 연결 후 자동 요약, 동기화, 의미 검색, 인용 기반 AI 답변을 지원합니다.' },
            ],
          },
          {
            id: 'research-notes',
            title: 'Research Notes｜연구 노트',
            subtitle: '아직 완성되지 않은 질문, 개념, 가설, 방법 성찰을 보존합니다.',
            status: '노트 시스템 구축 중',
            summary: '연구 노트는 논문, 수업, 프로젝트가 되기 전의 중간 생각을 담는 NexAeon의 사고 완충지대입니다.',
            tags: ['Notes', 'Ideas', 'Research Ops'],
            sections: [
              { label: 'Knowledge Function｜지식 기능', body: '미완성 아이디어가 채팅 기록이나 임시 파일에 흩어지지 않고 맥락과 함께 남도록 합니다.' },
              { label: 'Sources｜자료 출처', body: ['읽기 노트.', '수업 관찰.', '학생 피드백.', 'AI 대화와 Prompt 실험.'] },
              { label: 'Current Stage｜현재 단계', body: '현재는 연구 노트의 역할을 설명하고 있으며 이후 주제와 연구 질문 인덱스를 만듭니다.' },
              { label: 'Future Integration｜미래 연결', body: '문헌, 수업, MVP, 개념 지도와 연결되어 완전한 지식 경로를 형성합니다.' },
            ],
          },
          {
            id: 'concept-map',
            title: 'Concept Map｜개념 지도',
            subtitle: 'NexAeon의 연구 개념, 도구, 프로젝트 관계를 보여줍니다.',
            status: '지도 초안',
            summary: 'AI 교육, 튜터링, 학습분석, 지식 시스템, 현장 실천을 추적 가능한 네트워크로 만듭니다.',
            tags: ['Concept Map', 'Knowledge Graph', 'Taxonomy'],
            sections: [
              { label: 'Knowledge Function｜지식 기능', body: '개념과 프로젝트 사이의 관계를 보여주어 NexAeon의 전체 사고 구조를 이해하게 합니다.' },
              { label: 'Sources｜자료 출처', body: ['연구 주제 노드.', '수업 및 자료 노드.', '도구 흐름과 프로젝트 노드.', '현장 실천 장면 노드.'] },
              { label: 'Current Stage｜현재 단계', body: '현재는 콘텐츠 분류 방식으로 표시하고 이후 인터랙티브 노드 그래프로 확장할 수 있습니다.' },
              { label: 'Future Integration｜미래 연결', body: '그래프 데이터베이스나 시각화 도구와 연결해 탐색 가능한 NexAeon knowledge graph를 구축합니다.' },
            ],
          },
        ],
      },
      {
        id: 'projects',
        code: '05',
        label: 'Projects',
        title: 'Projects｜MVP와 실천 프로젝트',
        summary: 'AI 튜터링, GreenTrace, 언어 학습 친구, 입학 PDF, 시니어 정서 케어 프로젝트를 보여줍니다.',
        position: '각 프로젝트는 판매 문구가 아니라 문제, 해법, 기술, 상태, 다음 단계로 제시됩니다.',
        items: [
          {
            id: 'nexaeon-ai-tutoring-mvp',
            title: 'NexAeon AI Tutoring MVP｜AI 튜터링 시스템 MVP',
            subtitle: '개인화 AI 조교가 실제 학습 과제를 지원할 수 있는지 검증합니다.',
            status: 'MVP 테스트 중',
            summary: '질문 이해, 계층형 응답, 학습 과제 분해, 피드백 품질을 Nexōn의 교육 역량 기반으로 삼습니다.',
            tags: ['AI Tutor', 'MVP', 'Education'],
            sections: [
              { label: 'Problem｜문제 배경', body: '학생은 AI를 사용할 수 있다는 것은 알지만 좋은 질문을 만들고 답을 판단하며 다음 학습 행동으로 전환하는 데 어려움을 겪습니다.' },
              { label: 'Solution｜해결 방안', body: '질문 진단, 계층형 힌트, 행동 제안을 갖춘 AI Tutor 프로토타입을 구축합니다.' },
              { label: 'Technology｜사용 기술', body: ['LLM Prompt orchestration', 'Learning rubric', 'Conversation memory prototype', 'Frontend interaction layer'] },
              { label: 'MVP Status｜현재 상태', body: '핵심 개념과 페이지 표현은 완료되었고 대화 전략과 테스트 시나리오를 정리 중입니다.' },
              { label: 'Next Step｜다음 단계', body: '학생 테스트 과제를 만들고 응답 품질, 이해도, 실행 가능성 데이터를 수집합니다.' },
            ],
          },
          {
            id: 'greentrace',
            title: 'GreenTrace｜탄소 정보 시스템',
            subtitle: '탄소, ESG, 행동 데이터를 이해 가능한 추적 시스템으로 전환합니다.',
            status: '개념 검증 중',
            summary: 'GreenTrace는 지속가능성 데이터를 보고서 언어에서 추적·소통·의사결정 가능한 시스템으로 바꾸려는 프로젝트입니다.',
            tags: ['ESG', 'Carbon', 'Data System'],
            sections: [
              { label: 'Problem｜문제 배경', body: '지속가능성과 탄소 관리 자료는 문서, 표, 보고서에 흩어져 있어 일반 사용자가 이해하고 지속 추적하기 어렵습니다.' },
              { label: 'Solution｜해결 방안', body: '탄소 데이터 정리, 행동 추적, 시각적 설명을 제공하는 프로토타입을 구축합니다.' },
              { label: 'Technology｜사용 기술', body: ['Data dashboard', 'AI summary', 'Workflow automation', 'ESG taxonomy'] },
              { label: 'MVP Status｜현재 상태', body: '현재는 구체 데이터 소스에 맞춰 기능화하기 전 실천 프로젝트 프레임워크로 유지됩니다.' },
              { label: 'Next Step｜다음 단계', body: '최소 데이터 필드와 데모 장면을 정의해 1차 탄소 데이터 흐름을 완성합니다.' },
            ],
          },
          {
            id: 'woosong-buddy',
            title: 'Woosong Buddy｜언어 학습 펫 시스템',
            subtitle: '친근한 캐릭터로 언어 학습과 캠퍼스 적응을 지원합니다.',
            status: '시나리오 설계 중',
            summary: 'Woosong Buddy는 접근하기 쉬운 상호작용 캐릭터로 언어 학습과 캠퍼스 적응 불안을 낮추고 과제형 연습을 제공합니다.',
            tags: ['Language Learning', 'Campus AI', 'Companion System'],
            sections: [
              { label: 'Problem｜문제 배경', body: '국제 학생은 언어 연습, 캠퍼스 정보 이해, 문화 적응에서 즉각적이고 부담 없는 지원이 부족할 수 있습니다.' },
              { label: 'Solution｜해결 방안', body: '언어 연습, 상황형 Q&A, 동반 피드백을 제공하는 AI 펫 시스템을 설계합니다.' },
              { label: 'Technology｜사용 기술', body: ['Conversational AI', 'Scenario-based learning', 'Gamified feedback', 'Multilingual content'] },
              { label: 'MVP Status｜현재 상태', body: '캐릭터 설정, 언어 과제, 캠퍼스 지원 장면을 정의 중입니다.' },
              { label: 'Next Step｜다음 단계', body: '첫 번째 언어 과제와 신입생 공통 상황 대화를 구축합니다.' },
            ],
          },
          {
            id: 'admissions-pdf-system',
            title: 'Admissions PDF System｜입학 서류 인식 시스템',
            subtitle: '입학 PDF 문서를 정리, 비교, 검토 가능한 데이터로 전환합니다.',
            status: '흐름 검증 중',
            summary: '입학 행정 현장에서 문서 필드 추출, 지원자 자료 정리, 반복 업무 감소를 지원합니다.',
            tags: ['PDF', 'Admissions', 'Automation'],
            sections: [
              { label: 'Problem｜문제 배경', body: '입학 서류는 형식이 다양하고 수작업 비교가 많아 검토 시간이 길고 자료 일관성이 떨어질 수 있습니다.' },
              { label: 'Solution｜해결 방안', body: 'PDF 필드 추출, 데이터 표준화, 검토 체크리스트 생성 흐름을 구축합니다.' },
              { label: 'Technology｜사용 기술', body: ['PDF parsing', 'OCR-ready workflow', 'Structured extraction', 'Admin automation'] },
              { label: 'MVP Status｜현재 상태', body: '장면 요구는 확인되었고 필드 템플릿과 시범 흐름을 정리 중입니다.' },
              { label: 'Next Step｜다음 단계', body: '필드 schema를 완성하고 샘플 파일로 추출 정확도를 테스트합니다.' },
            ],
          },
          {
            id: 'lightmind-plus',
            title: 'LightMind+｜시니어 정서 케어 프로젝트',
            subtitle: 'AI를 활용한 정서 동행, 알림, 지원 가능성을 탐색합니다.',
            status: '개념 연구 중',
            summary: 'LightMind+는 고령자의 정서 지원과 일상 동행을 온화하고 낮은 부담의 AI 지원 방식으로 탐색합니다.',
            tags: ['Elder Care', 'Emotion Support', 'AI Companion'],
            sections: [
              { label: 'Problem｜문제 배경', body: '고령자는 외로움, 감정 변화, 기억 알림, 일상 지원 부족을 겪을 수 있습니다.' },
              { label: 'Solution｜해결 방안', body: '정서 안부, 일상 알림, 가족 알림, 간단한 대화 동행을 제공하는 AI 지원 프로토타입을 설계합니다.' },
              { label: 'Technology｜사용 기술', body: ['Conversational interface', 'Sentiment-aware prompts', 'Reminder workflow', 'Care context logging'] },
              { label: 'MVP Status｜현재 상태', body: '현재는 제품화가 아니라 요구와 윤리적 경계 연구 단계입니다.' },
              { label: 'Next Step｜다음 단계', body: '먼저 케어 장면과 위험 체크리스트를 만들어 안전과 존중을 확보합니다.' },
            ],
          },
        ],
      },
      {
        id: 'field-lab',
        code: '06',
        label: 'Field Lab',
        title: 'Field Lab｜현장 실험실',
        summary: 'Joey가 AI, 교육, 연구, 행정 현장을 어떻게 연결하는지 보여줍니다.',
        position: 'Field Lab은 연락처나 협업 유도 페이지가 아니라 AI가 대학 현장과 학생 지원을 만나는 실천 맥락입니다.',
        items: [
          {
            id: 'university-practice',
            title: 'University Practice｜대학 현장 실천',
            subtitle: '대학 맥락에서 AI 교육, 수업, 행정 흐름을 관찰합니다.',
            status: '현장 관찰 중',
            summary: '대학 현장은 실제 교육과 행정 요구에서 연구 질문이 자라나는 NexAeon의 실험장입니다.',
            tags: ['University', 'Practice', 'Field Notes'],
            sections: [
              { label: 'Context｜현장 맥락', body: '대학은 교육, 연구, 입학, 학생 지원, 행정 협업이 함께 존재하는 복합적인 AI 전환 현장입니다.' },
              { label: 'Practice Focus｜실천 초점', body: ['수업에서의 AI 사용.', '학생 지원 흐름.', '행정 자료 정리.', '다국어 소통과 국제학생 서비스.'] },
              { label: 'Current Use｜현재 활용', body: '관찰, 사례 정리, 프로토타입 아이디어를 연구와 MVP 과제로 전환하고 있습니다.' },
              { label: 'Future Context｜미래 맥락', body: '수업, 행정, 학생 지원을 연결하는 대학 AI 전환 사례库로 발전할 수 있습니다.' },
            ],
          },
          {
            id: 'student-support',
            title: 'Student Support｜학생 지원 장면',
            subtitle: 'AI로 학생이 과제를 이해하고 질문을 정리하며 개인화 피드백을 받도록 돕습니다.',
            status: '장면 정리 중',
            summary: '학생 지원은 NexAeon의 핵심 현장입니다. AI는 교사의 판단, 정서 이해, 교육 윤리와 함께 설계될 때 학습을 돕습니다.',
            tags: ['Student Support', 'Coaching', 'Learning'],
            sections: [
              { label: 'Context｜현장 맥락', body: '학생에게 필요한 것은 답만이 아니라 다음 행동, 수정 방법, 교사에게 도움을 요청해야 하는 시점을 아는 것입니다.' },
              { label: 'Practice Focus｜실천 초점', body: ['학습 과제 분해.', '보고서와 연구 질문 안내.', 'AI 리터러시 알림.', '정서와 압박 신호 관찰.'] },
              { label: 'Current Use｜현재 활용', body: '학생의 공통 문제를 AI Tutor 테스트 장면과 수업 설계 사례로 전환하고 있습니다.' },
              { label: 'Future Context｜미래 맥락', body: '학생 지원 대시보드와 개인화 코칭 모델로 발전할 수 있습니다.' },
            ],
          },
          {
            id: 'administrative-automation',
            title: 'Administrative Automation｜행정 자동화',
            subtitle: '반복 행정 흐름을 추적 가능하고 표준화되며 시간을 절약하는 구조로 만듭니다.',
            status: '흐름 점검 중',
            summary: '행정 자동화는 사람을 대체하는 것이 아니라 낮은 가치의 반복 업무를 줄여 판단, 소통, 서비스 품질로 돌아가게 합니다.',
            tags: ['Automation', 'Administration', 'Workflow'],
            sections: [
              { label: 'Context｜현장 맥락', body: '입학, 문서 정리, 알림, 자료 비교, 보고서 생성은 많은 시간을 소모합니다.' },
              { label: 'Practice Focus｜실천 초점', body: ['PDF와 표 데이터 추출.', '알림과 과제 추적.', '흐름 노드 표준화.', 'AI 요약과 검토 지원.'] },
              { label: 'Current Use｜현재 활용', body: 'Admissions PDF System에서 구체적인 프로젝트 방향으로 이미 형성되었습니다.' },
              { label: 'Future Context｜미래 맥락', body: '감사 가능하고 추적 가능한 캠퍼스 행정 자동화 toolkit으로 발전할 수 있습니다.' },
            ],
          },
          {
            id: 'ai-education-experiment',
            title: 'AI Education Experiment｜AI 교육 실험',
            subtitle: '교실을 연구, 피드백, 프로토타입 테스트가 만나는 장으로 만듭니다.',
            status: '실험 설계 중',
            summary: 'AI 교육 실험은 수업을 단순 내용 전달이 아니라 학생이 AI를 이해하고 사용하고 성찰하는 연구 현장으로 만듭니다.',
            tags: ['Experiment', 'Classroom', 'AI Education'],
            sections: [
              { label: 'Context｜현장 맥락', body: 'AI가 수업에 들어오면 학생의 질문 방식, 학습 전략, 과제 산출물이 달라집니다.' },
              { label: 'Practice Focus｜실천 초점', body: ['Prompt 연습.', 'AI 응답 품질 평가.', '학생 성찰 기록.', '수업 활동과 AI Tutor 비교.'] },
              { label: 'Current Use｜현재 활용', body: '비교 가능한 실험 과제를 만들기 전 수업 설계와 연구 질문을 정리하고 있습니다.' },
              { label: 'Future Context｜미래 맥락', body: '논문, 수업, 시스템 프로토타입을 함께 지원하는 AI 교육 실험 protocol로 발전합니다.' },
            ],
          },
          {
            id: 'future-collaboration-context',
            title: 'Future Collaboration Context｜미래 협력 맥락',
            subtitle: '판매 퍼널이 아니라 공유 연구 맥락으로서의 미래 협력입니다.',
            status: '맥락 정의 중',
            summary: '교수, 학교, 학생 팀, 조직과의 미래 연구와 실천 가능성을 설명하되 Field Lab을 유도형 페이지로 만들지 않습니다.',
            tags: ['Context', 'Collaboration', 'Field Lab'],
            sections: [
              { label: 'Context｜현장 맥락', body: '협력은 문제, 데이터, 현장 맥락을 공유할 때 의미가 있습니다. NexAeon은 함께 연구할 가치가 있는 문제인지 먼저 묻습니다.' },
              { label: 'Practice Focus｜실천 초점', body: ['공동 수업 실험.', '캠퍼스 AI 흐름 개선.', '학생 지원 연구.', 'AI 교육 또는 경영 프로토타입 테스트.'] },
              { label: 'Current Use｜현재 활용', body: '현재는 판매식 연락 흐름 없이 연구와 실천 역량을 콘텐츠로 보여줍니다.' },
              { label: 'Future Context｜미래 맥락', body: '나중에 협력入口가 생기더라도 연구 질문, 데이터 요구, 윤리 경계를 출발점으로 삼습니다.' },
            ],
          },
        ],
      },
    ],
  },
};

function getLocale(lang = 'zh') {
  return SITE_CONTENT[lang] || SITE_CONTENT.zh;
}

function normalizeItem(module, item) {
  return {
    ...item,
    type: module.id,
    moduleId: module.id,
    moduleLabel: module.title,
    moduleSummary: module.summary,
    category: module.label,
  };
}

export function getSiteContent(lang = 'zh') {
  return getLocale(lang);
}

export function getModules(lang = 'zh') {
  return getLocale(lang).modules;
}

export function getModuleById(id, lang = 'zh') {
  return getModules(lang).find((module) => module.id === id);
}

export function getContentByType(type, lang = 'zh') {
  const module = getModuleById(type, lang);
  if (!module) return [];
  return module.items.map((item) => normalizeItem(module, item));
}

export function getAllContentItems(lang = 'zh') {
  return getModules(lang).flatMap((module) => module.items.map((item) => normalizeItem(module, item)));
}

export function findContentItem(type, id, lang = 'zh') {
  return getContentByType(type, lang).find((item) => item.id === id);
}

export default SITE_CONTENT;
