export const XCHANGE_CONTENT_SCHEMA_VERSION = 'v1';
export const XCHANGE_CONTENT_RENDERER_VERSION = 'v1';
export const XCHANGE_MAX_CONTENT_CHARS = 30_000;
export const XCHANGE_MAX_BODY_BLOCKS = 500;

const MEASURABLE_VERBS = /(?:identify|explain|compare|apply|create|evaluate|design|analyze|define|demonstrate|辨識|說明|解釋|比較|應用|建立|評估|設計|分析|정의|설명|비교|적용|작성|평가|설계|분석)/iu;
const VAGUE_ONLY = /^(?:教師講解|學生討論|teacher explains?|students? discuss|교사가 설명|학생 토론)[。.!！]?$/iu;
const URL_PATTERN = /https?:\/\/[^\s)\]}>,]+/giu;
const AI_MARKETING_KEYWORDS = Object.freeze(['生成式 AI', '行銷', '受眾分析', '內容生成', '提示詞', '品牌語調', '行銷漏斗', '顧客旅程', '成效指標', 'AI 產出驗證', '風險', '倫理']);
const AI_RISK_GROUPS = Object.freeze([
  /幻覺|錯誤資訊|hallucination|misinformation|환각|허위 정보/iu,
  /隱私|個人資料|privacy|personal data|개인정보|프라이버시/iu,
  /著作權|版權|素材來源|copyright|source attribution|저작권|출처/iu,
  /偏見|不當表述|bias|discriminat|편향|차별/iu,
  /品牌語調|品牌一致性|brand (?:voice|consistency)|브랜드 (?:톤|일관성)/iu,
  /過度依賴|over.?reliance|과도한 의존/iu,
]);
const INSTRUCTION_LEAKAGE = /(?:請建立|課程需要包含|使用者輸入|以下要求|必須包含|please (?:create|include)|the course (?:must|needs to)|다음 요구|과정에 포함)/iu;
const GENERIC_TEMPLATE = /(?:先定義問題|提出(?:兩個)?選項|目標、限制與證據|問題與預期成果|define the problem|generate options|goals?, constraints?, and evidence|문제.*정의|선택지.*제안)/iu;

function sourcePromptOf(draftType, payload) {
  return String(draftType === 'course' ? payload.summary || payload.subTopic || '' : payload.instructions || '').trim();
}

function firstMatch(text, expressions, fallback) {
  for (const [pattern, value] of expressions) if (pattern.test(text)) return value;
  return fallback;
}

function subjectKeywords(title, prompt) {
  const combined = `${title} ${prompt}`;
  if (/(?:生成式\s*AI|generative\s+AI|생성형\s*AI)/iu.test(combined) && /(?:行銷|marketing|마케팅)/iu.test(combined)) return [...AI_MARKETING_KEYWORDS];
  return [...new Set(String(title || '').split(/[\s、，,／/與和:&]+/u).map((item) => item.trim()).filter((item) => item.length >= 2))].slice(0, 12);
}

export function extractStructuredRequirements(draftType, payload) {
  const prompt = sourcePromptOf(draftType, payload);
  const titleField = draftType === 'course' ? payload.title : payload.activityTitle;
  const quoted = prompt.match(/「([^」]{2,120})」|“([^”]{2,120})”|"([^"]{2,120})"/u);
  const exactTitle = String(quoted?.[1] || quoted?.[2] || quoted?.[3] || titleField || '').trim();
  const durationMatch = prompt.match(/(\d{1,4})\s*(?:分鐘|분|minutes?)/iu);
  const durationField = draftType === 'course' ? payload.durationMinutes : payload.estimatedTimeMinutes;
  const targetAudience = firstMatch(prompt, [
    [/大學生/u, ['大學生']], [/研究生/u, ['研究生']], [/在職人員|專業人士/u, ['在職人員']],
    [/undergraduate|university students?/iu, ['University students']], [/graduate students?/iu, ['Graduate students']], [/대학생/u, ['대학생']],
  ], payload.targetAudience?.length ? payload.targetAudience : []);
  const format = firstMatch(prompt, [
    [/\bworkshop\b|工作坊/iu, ['Workshop']], [/課堂講義/u, ['Course handout']], [/\bslides?\b|簡報/iu, ['Slides']],
  ], payload.format?.length ? payload.format : draftType === 'course' ? [] : [payload.activityType].filter(Boolean));
  const difficulty = firstMatch(prompt, [[/初級|beginner|초급/iu, 'Beginner'], [/中級|intermediate|중급/iu, 'Intermediate'], [/高級|advanced|고급/iu, 'Advanced']], payload.difficulty || '');
  const language = firstMatch(prompt, [[/繁體中文|正體中文/u, 'zh'], [/韓文|한국어|korean/iu, 'ko'], [/英文|english/iu, 'en']], languageOf(payload));
  const requiredElements = [];
  const elementPatterns = [
    ['learning objectives', /學習目標|learning objectives?|학습 목표/iu],
    ['session plan', /時間配置|課程流程|session plan|수업.*시간/iu],
    ['group activity', /小組.*活動|group activity|그룹.*활동/iu],
    ['assessment', /評量|assessment|평가/iu],
    ['AI risks', /AI.*風險|風險.*注意|AI risks?|윤리|위험/iu],
  ];
  for (const [name, pattern] of elementPatterns) if (pattern.test(prompt)) requiredElements.push(name);
  return Object.freeze({
    exactTitle, topic: exactTitle, targetAudience,
    durationMinutes: Number(durationMatch?.[1] || durationField), difficulty, format, language,
    requiredElements, subjectKeywords: subjectKeywords(exactTitle, prompt),
  });
}

export function applyExtractedRequirements(draftType, payload, requirements) {
  const titleKey = draftType === 'course' ? 'title' : 'activityTitle';
  const durationKey = draftType === 'course' ? 'durationMinutes' : 'estimatedTimeMinutes';
  return {
    ...payload,
    [titleKey]: requirements.exactTitle || payload[titleKey],
    [durationKey]: requirements.durationMinutes || payload[durationKey],
    ...(requirements.targetAudience.length ? { targetAudience: requirements.targetAudience } : {}),
    ...(requirements.difficulty ? { difficulty: requirements.difficulty } : {}),
    language: [requirements.language],
    ...(draftType === 'course' && requirements.format.length ? { format: requirements.format } : {}),
  };
}

function languageOf(payload) {
  const value = Array.isArray(payload.language) ? payload.language[0] : payload.language;
  const normalized = String(value || '').toLocaleLowerCase();
  if (['zh', 'zh-tw', '中文', '繁體中文', 'chinese'].includes(normalized)) return 'zh';
  if (['ko', '한국어', '韓文', 'korean'].includes(normalized)) return 'ko';
  return 'en';
}

function splitDuration(total, weights) {
  const safe = Math.max(weights.length, Number(total) || weights.length);
  const parts = weights.map((weight) => Math.max(1, Math.floor(safe * weight)));
  parts[parts.length - 1] += safe - parts.reduce((sum, value) => sum + value, 0);
  return parts;
}

const TEXT = {
  zh: {
    coursePurpose: (topic) => `透過概念理解、引導練習與可觀察產出，協助學習者掌握「${topic}」並能在真實情境中應用。`,
    objectives: (topic) => [`辨識「${topic}」的核心概念與適用情境`, `比較「${topic}」中至少兩種做法的優缺點`, `設計一份可實際採用的「${topic}」成果並依準則自評`],
    outcomes: (topic) => [`完成一份包含選擇理由、執行步驟與成效指標的「${topic}」應用方案。`],
    phases: ['啟動與診斷', '概念建構與示範', '應用實作與回饋'],
    teacher: ['提出具體情境題，說明目標與成功準則，蒐集學習者先備觀念。', '以例子拆解核心概念，示範決策過程並用檢核問題確認理解。', '發布實作任務、巡迴提問，依成功準則提供具體修正建議。'],
    learner: ['個別記錄初步判斷，與同伴比較理由並提出一個學習問題。', '整理概念關係，分析示例中的關鍵選擇並回答檢核問題。', '完成應用方案、交換同儕回饋，根據證據修訂最終版本。'],
    outputs: ['先備觀念紀錄與學習問題', '概念圖與示例分析紀錄', '可執行的應用方案與修訂說明'],
    coreTitles: ['核心概念與判斷框架', '從概念到實際應用'],
    explanations: (topic, detail) => [`本節建立「${topic}」的共同語言，利用目的、情境、限制與證據四個面向判斷做法是否合適。${detail}`, `本節將判斷框架轉成可重複的步驟：釐清目標、提出選項、以證據比較、執行並回顧。`],
    keyPoints: [['先定義問題與預期成果', '區分事實、假設與限制', '以可觀察證據支持選擇'], ['將複雜任務拆成小步驟', '設定可檢查的品質準則', '利用回饋修訂成果']],
    activityTitle: '情境應用設計挑戰', activityPurpose: '把核心概念轉化為可執行方案，並以明確準則檢驗品質。',
    steps: ['閱讀情境並標記目標、限制與已知證據。', '提出兩個可行選項，依準則比較後選擇一個方案。', '完成方案草稿，接受同儕回饋並提交修訂版。'],
    questions: (topic) => [`「${topic}」最容易被忽略的假設是什麼？`, '哪些證據足以支持你的選擇？', '如果主要限制改變，你會如何調整方案？'],
    risk: '學習者可能只描述想法而未提出證據；教師應以「依據是什麼」與「如何驗證」追問。',
    activityPurposeOnly: (topic) => `運用明確流程完成「${topic}」任務，產出可檢查且可修訂的成果。`,
    activitySteps: ['理解任務與成功準則', '分析選項並完成初稿', '回饋、修訂與提交'],
    script: ['「先不要急著找答案，請圈出任務的目標、限制與可以使用的證據。」', '「請說明你選擇這個做法的依據，並指出另一個選項為何較不合適。」', '「請依成功準則逐項檢查，採用一則回饋完成最後修訂。」'],
    closing: '今天的重點是以目標、限制與證據做出可解釋的選擇，並透過回饋改善成果。',
  },
  ko: {
    coursePurpose: (topic) => `개념 이해, 안내된 연습, 관찰 가능한 산출물을 통해 학습자가 ‘${topic}’을 실제 상황에 적용하도록 돕습니다.`,
    objectives: (topic) => [`‘${topic}’의 핵심 개념과 적용 상황을 식별한다`, `‘${topic}’에 관한 두 가지 이상의 접근법을 비교한다`, `실제로 활용할 수 있는 ‘${topic}’ 결과물을 설계하고 기준에 따라 평가한다`],
    outcomes: (topic) => [`선택 근거, 실행 단계, 성과 지표가 포함된 ‘${topic}’ 적용안을 완성한다.`],
    phases: ['도입 및 사전 진단', '개념 구성 및 시범', '적용 실습 및 피드백'],
    teacher: ['구체적인 상황 질문을 제시하고 목표와 성공 기준을 설명한 뒤 사전 이해를 확인한다.', '사례로 핵심 개념과 판단 과정을 시범 보이고 점검 질문으로 이해를 확인한다.', '실습 과제를 안내하고 순회 질문하며 성공 기준에 따른 구체적인 피드백을 제공한다.'],
    learner: ['개별 판단을 기록하고 동료와 근거를 비교한 뒤 학습 질문 하나를 만든다.', '개념 관계를 정리하고 사례의 핵심 선택을 분석하여 점검 질문에 답한다.', '적용안을 완성하고 동료 피드백을 반영해 최종안을 수정한다.'],
    outputs: ['사전 이해 기록과 학습 질문', '개념도와 사례 분석 기록', '실행 가능한 적용안과 수정 설명'],
    coreTitles: ['핵심 개념과 판단 틀', '개념을 실제 적용으로 전환하기'],
    explanations: (topic, detail) => [`‘${topic}’에 대한 공통 언어를 만들고 목적, 맥락, 제약, 증거를 기준으로 적합성을 판단합니다. ${detail}`, '판단 틀을 목표 확인, 선택지 제안, 증거 기반 비교, 실행과 성찰의 반복 가능한 단계로 전환합니다.'],
    keyPoints: [['문제와 기대 결과를 먼저 정의하기', '사실, 가정, 제약 구분하기', '관찰 가능한 증거로 선택을 뒷받침하기'], ['복잡한 과제를 작은 단계로 나누기', '점검 가능한 품질 기준 세우기', '피드백으로 결과물 개선하기']],
    activityTitle: '상황 적용 설계 도전', activityPurpose: '핵심 개념을 실행 가능한 계획으로 바꾸고 명확한 기준으로 품질을 점검합니다.',
    steps: ['상황을 읽고 목표, 제약, 알려진 증거를 표시한다.', '두 가지 선택지를 제안하고 기준에 따라 비교해 하나를 선택한다.', '초안을 완성하고 동료 피드백을 반영해 수정본을 제출한다.'],
    questions: (topic) => [`‘${topic}’에서 가장 놓치기 쉬운 가정은 무엇인가요?`, '어떤 증거가 선택을 충분히 뒷받침하나요?', '주요 제약이 바뀌면 계획을 어떻게 조정하겠나요?'],
    risk: '학습자가 근거 없이 아이디어만 설명할 수 있으므로 교사는 “근거는 무엇인가요?”와 “어떻게 검증하나요?”를 질문합니다.',
    activityPurposeOnly: (topic) => `명확한 절차로 ‘${topic}’ 과제를 수행하고 점검·수정 가능한 결과물을 만듭니다.`,
    activitySteps: ['과제와 성공 기준 이해', '선택지 분석 및 초안 작성', '피드백, 수정 및 제출'],
    script: ['“답을 바로 찾기보다 과제의 목표, 제약, 사용할 수 있는 증거를 먼저 표시하세요.”', '“이 방법을 선택한 근거와 다른 선택지가 덜 적절한 이유를 설명하세요.”', '“성공 기준을 하나씩 점검하고 피드백 한 가지를 반영해 최종 수정하세요.”'],
    closing: '오늘의 핵심은 목표, 제약, 증거를 바탕으로 설명 가능한 선택을 하고 피드백으로 결과물을 개선하는 것입니다.',
  },
  en: {
    coursePurpose: (topic) => `Help learners understand and apply ${topic} through explicit concepts, guided practice, and an observable product.`,
    objectives: (topic) => [`Identify the core concepts and appropriate contexts for ${topic}`, `Compare at least two approaches to ${topic} using explicit criteria`, `Design a usable ${topic} product and evaluate it against success criteria`],
    outcomes: (topic) => [`Complete a ${topic} application plan with a rationale, implementation steps, and success measures.`],
    phases: ['Launch and diagnose', 'Build concepts and model', 'Apply, review, and improve'],
    teacher: ['Present a concrete scenario, explain the objectives and success criteria, and elicit prior understanding.', 'Model the core concepts and decision process with an example, then check understanding with targeted questions.', 'Set the application task, confer with learners, and give criterion-referenced revision feedback.'],
    learner: ['Record an initial judgment, compare reasoning with a peer, and formulate one learning question.', 'Map the concepts, analyze key choices in the example, and respond to the understanding checks.', 'Create an application plan, exchange peer feedback, and revise the final version using evidence.'],
    outputs: ['Prior-knowledge note and learning question', 'Concept map and example analysis', 'Actionable application plan and revision note'],
    coreTitles: ['Core concepts and decision framework', 'Moving from concept to application'],
    explanations: (topic, detail) => [`Establish shared language for ${topic} and judge fit through purpose, context, constraints, and evidence. ${detail}`, 'Turn the framework into a repeatable process: clarify the goal, generate options, compare evidence, act, and review.'],
    keyPoints: [['Define the problem and desired result first', 'Separate facts, assumptions, and constraints', 'Support choices with observable evidence'], ['Break complex work into manageable steps', 'Set checkable quality criteria', 'Use feedback to revise the product']],
    activityTitle: 'Scenario application design challenge', activityPurpose: 'Convert the core concepts into an actionable plan and test its quality with explicit criteria.',
    steps: ['Read the scenario and mark the goal, constraints, and available evidence.', 'Generate two options, compare them against the criteria, and select one approach.', 'Complete a draft, obtain peer feedback, and submit a revised version.'],
    questions: (topic) => [`Which assumption about ${topic} is easiest to overlook?`, 'What evidence is sufficient to support your choice?', 'How would you adapt the plan if the main constraint changed?'],
    risk: 'Learners may describe ideas without evidence; prompt with “What supports that choice?” and “How could it be tested?”',
    activityPurposeOnly: (topic) => `Use a clear process to complete a ${topic} task and produce work that can be checked and revised.`,
    activitySteps: ['Understand the task and success criteria', 'Analyze options and produce a draft', 'Review, revise, and submit'],
    script: ['“Before looking for an answer, mark the task goal, constraints, and evidence you can use.”', '“Explain the evidence for your choice and why the other option is less suitable.”', '“Check each success criterion and use one piece of feedback in your final revision.”'],
    closing: 'The key idea is to make an explainable choice using goals, constraints, and evidence, then improve the product through feedback.',
  },
};

const META = {
  zh: {
    audience: '一般學習者', group: '兩人或小組', assessmentMethod: '成果檢視與口頭說明', assessmentCriteria: ['符合既定目標', '使用相關證據', '步驟具可行性且表達清楚'], feedback: '先進行依準則的同儕回饋，再由教師提供具體建議', courseCompletion: ['將任務拆成可執行的小步驟', '以檢核表確認三項品質準則', '在修訂說明中指出回饋帶來的改變'],
    teacherPreparation: ['準備一個真實情境與一個示範案例', '清楚呈現學習目標與成功準則'], learnerPreparation: ['帶來一項相關經驗或問題'], materials: ['情境說明', '規劃範本', '成功準則檢核表'], tools: ['共享文件或紙本'], contingency: '若無法使用數位工具，改用印刷情境單與手寫規劃表。',
    followUp: (topic) => `將方案應用於另一個「${topic}」情境，並說明一項調整。`, reflections: ['哪一項決定有最充分的證據？', '再接受一輪回饋後，你會修改什麼？'],
    outcomes: (title) => [`完成一份可檢查的「${title}」回應，並以證據說明主要選擇。`], teacherMaterials: ['任務說明', '示範案例', '成功準則檢核表'], learnerMaterials: ['回應範本', '反思紀錄'], digitalTools: ['共享文件（選用）'], equipment: ['顯示設備或印刷資料'],
    teacherPrep: ['依學習者調整情境', '準備一個優良與一個待改進案例'], learnerPrep: ['回想一項相關經驗與問題'], outputFormat: '一頁回應或等值共享文件', outputRequirements: ['陳述所選做法', '提出至少兩項支持理由或證據', '呈現一項依回饋完成的修訂'], submission: '透過課堂約定管道或紙本提交給教師',
    activityCriteria: ['直接回應任務', '使用相關證據', '說明主要選擇', '在最終版本中運用回饋'], completion: ['已標記目標、限制與證據。', '已完成包含選擇理由的初稿。', '已提交修訂回應與反思紀錄。'], beginner: '提供句型開頭、部分完成的示例與較少的選項。', advanced: (topic) => `要求學習者以另一個「${topic}」情境測試回應。`, noTool: '使用印刷任務卡與手寫回應。', individual: '個別完成相同步驟，並用自我檢核表回顧。', reflection: '哪一項證據最能改變或強化你的回應？', exit: '寫下一項決定、支持證據與下一步改善。',
  },
  ko: {
    audience: '일반 학습자', group: '2인 또는 소그룹', assessmentMethod: '결과물 검토 및 설명', assessmentCriteria: ['제시된 목표와의 일치', '관련 증거 사용', '실행 가능하고 명확한 단계'], feedback: '기준에 따른 동료 피드백 후 교사가 구체적인 피드백을 제공한다', courseCompletion: ['과제를 실행 가능한 작은 단계로 나눔', '체크리스트로 세 가지 품질 기준을 확인함', '수정 설명에 피드백으로 바뀐 내용을 제시함'],
    teacherPreparation: ['실제적인 상황과 시범 사례 하나를 준비한다', '학습 목표와 성공 기준을 제시한다'], learnerPreparation: ['관련 경험이나 질문 하나를 준비한다'], materials: ['상황 설명서', '계획 템플릿', '성공 기준 체크리스트'], tools: ['공유 문서 또는 종이'], contingency: '디지털 도구를 사용할 수 없으면 인쇄 자료와 손글씨 계획표를 사용한다.',
    followUp: (topic) => `계획을 다른 ‘${topic}’ 상황에 적용하고 한 가지 조정 내용을 설명한다.`, reflections: ['어떤 결정이 가장 강한 증거를 가졌나요?', '피드백을 한 번 더 받는다면 무엇을 바꾸겠나요?'],
    outcomes: (title) => [`‘${title}’에 대한 점검 가능한 응답을 만들고 주요 선택을 증거로 설명한다.`], teacherMaterials: ['과제 설명서', '시범 사례', '성공 기준 체크리스트'], learnerMaterials: ['응답 템플릿', '성찰 기록'], digitalTools: ['공유 문서(선택)'], equipment: ['화면 또는 인쇄물'],
    teacherPrep: ['학습자에게 맞게 상황을 조정한다', '좋은 사례와 개선이 필요한 사례를 준비한다'], learnerPrep: ['관련 경험과 질문 하나를 떠올린다'], outputFormat: '한 페이지 응답 또는 동등한 공유 문서', outputRequirements: ['선택한 접근법 제시', '두 가지 이상의 근거나 증거 제시', '피드백 후 수정한 내용 제시'], submission: '수업에서 합의한 채널 또는 종이로 교사에게 제출한다',
    activityCriteria: ['과제에 직접 응답함', '관련 증거를 사용함', '주요 선택을 설명함', '최종본에 피드백을 반영함'], completion: ['목표, 제약, 증거를 표시했다.', '선택 근거가 포함된 초안을 완성했다.', '수정된 응답과 성찰 기록을 제출했다.'], beginner: '문장 시작 표현, 일부 완성된 사례, 축소된 선택지를 제공한다.', advanced: (topic) => `대조되는 ‘${topic}’ 상황에 응답을 적용해 검증하게 한다.`, noTool: '인쇄 과제 카드와 손글씨 응답을 사용한다.', individual: '같은 단계를 개인별로 수행하고 자기 점검표를 사용한다.', reflection: '어떤 증거가 응답을 가장 크게 바꾸거나 강화했나요?', exit: '결정 한 가지, 그 근거, 다음 개선점을 적는다.',
  },
  en: {
    audience: 'General learners', group: 'pairs or small groups', assessmentMethod: 'Product review and explanation', assessmentCriteria: ['Alignment with the stated goal', 'Use of relevant evidence', 'Feasibility and clarity of the proposed steps'], feedback: 'Criterion-referenced peer feedback followed by teacher feedback', courseCompletion: ['Break the task into actionable steps', 'Check all three quality criteria with the checklist', 'Name the feedback-driven change in the revision note'],
    teacherPreparation: ['Prepare one realistic scenario and one worked example', 'Display the objectives and success criteria'], learnerPreparation: ['Bring one relevant experience or question'], materials: ['Scenario brief', 'Planning template', 'Success-criteria checklist'], tools: ['Shared document or paper'], contingency: 'If digital tools are unavailable, use printed briefs and handwritten planning sheets.',
    followUp: (topic) => `Apply the plan to a second ${topic} scenario and explain one adaptation.`, reflections: ['Which decision had the strongest evidence?', 'What would you change after another round of feedback?'],
    outcomes: (title) => [`Create a checkable response to ${title} and justify the main choice with evidence.`], teacherMaterials: ['Task brief', 'Worked example', 'Success-criteria checklist'], learnerMaterials: ['Response template', 'Reflection note'], digitalTools: ['Shared document (optional)'], equipment: ['Display or printed copies'],
    teacherPrep: ['Adapt the scenario to the learners', 'Prepare one strong and one weak example'], learnerPrep: ['Recall one relevant experience and question'], outputFormat: 'One-page response or equivalent shared document', outputRequirements: ['State the selected approach', 'Give at least two supporting reasons or evidence points', 'Show one revision made after feedback'], submission: 'Submit to the teacher through the agreed class channel or on paper',
    activityCriteria: ['Responds directly to the task', 'Uses relevant evidence', 'Explains the main choice', 'Applies feedback in the final version'], completion: ['The goal, constraints, and evidence are marked.', 'A draft with a justified choice is complete.', 'A revised response and reflection note are submitted.'], beginner: 'Provide sentence starters, a partially completed example, and a reduced set of options.', advanced: (topic) => `Ask learners to test the response against a contrasting ${topic} scenario.`, noTool: 'Use printed task cards and handwritten responses.', individual: 'Complete the same steps independently and use a self-review checklist.', reflection: 'Which piece of evidence most changed or strengthened your response?', exit: 'Write one decision, its evidence, and one next improvement.',
  },
};

function isAiMarketing(requirements, payload) {
  return subjectKeywords(requirements?.topic || payload.title, sourcePromptOf('course', payload)).length === AI_MARKETING_KEYWORDS.length;
}

function aiMarketingCourseContent(payload, requirements) {
  const total = Number(requirements.durationMinutes || payload.durationMinutes);
  const durations = total === 90 ? [10, 20, 15, 30, 10, 5] : splitDuration(total, [0.1, 0.22, 0.17, 0.33, 0.12, 0.06]);
  const phases = [
    { title: '導入：生成式 AI 行銷案例與課程挑戰', teacher: '展示一則 AI 生成廣告案例，帶領學生辨識受眾、行銷目標、優點與可能錯誤。', learner: '快速判讀案例是否可信且符合品牌，提出一項優點與一項風險。', output: '案例初判紀錄與待驗證問題' },
    { title: '核心概念：用途、受眾與顧客旅程', teacher: '說明生成式 AI 在受眾洞察、內容發想、文案製作與行銷漏斗各階段的用途及限制。', learner: '把指定品牌的顧客旅程分成認知、考慮與轉換階段，標記適合運用 AI 的任務。', output: 'AI 行銷用途與顧客旅程對照表' },
    { title: '示範：提示詞設計與品牌語調', teacher: '示範以角色、受眾、目標、語調、限制與輸出格式組成提示詞，並比較修改前後內容。', learner: '使用檢核表分析兩個提示詞，指出哪一個更能維持品牌語調及原因。', output: '提示詞比較與品牌語調檢核紀錄' },
    { title: '小組實作：AI 行銷內容設計挑戰', teacher: '提供品牌情境卡並巡迴追問受眾依據、提示詞限制、事實查核方式與風險處理。', learner: '小組完成受眾設定、提示詞、AI 行銷內容草案、驗證清單與修訂版本。', output: '小組 AI 行銷內容包與風險檢核表' },
    { title: '成果分享與同儕評量', teacher: '依評量規準主持短講評，要求回饋聚焦受眾匹配、品牌一致性、正確性與可行性。', learner: '進行兩分鐘發表，使用規準評估另一組作品並提出一項可執行建議。', output: '小組發表與同儕評量表' },
    { title: '總結與 Exit Ticket', teacher: '統整「先定義策略、再生成、後驗證」流程，提醒所有 AI 產出都需人為負責。', learner: '提交 Exit Ticket，寫出一項可採用做法、一項主要風險與一項驗證行動。', output: '個人 Exit Ticket' },
  ];
  return {
    overview: {
      courseTitle: requirements.exactTitle, topic: requirements.topic,
      purpose: '讓大學生理解生成式 AI 如何支援行銷策略，並能以受眾、品牌與風險準則設計及驗證 AI 行銷內容。',
      targetAudience: requirements.targetAudience, difficulty: requirements.difficulty,
      durationMinutes: total, language: requirements.language, format: requirements.format,
    },
    learningObjectives: [
      '解釋生成式 AI 在受眾分析、內容生成與行銷漏斗中的主要應用及限制',
      '比較不同提示詞設計對行銷內容品質、品牌語調與受眾匹配度的影響',
      '設計一份符合指定受眾、行銷目標與品牌語調的 AI 行銷內容草案',
      '評估 AI 產出的事實正確性、版權、隱私、偏見與品牌風險並提出修訂',
    ],
    learningOutcomes: ['每組完成一份包含受眾輪廓、顧客旅程階段、提示詞、AI 內容草案、驗證紀錄與修訂版的行銷內容包。'],
    sessionPlan: phases.map((phase, index) => ({ title: phase.title, durationMinutes: durations[index], teacherActions: [phase.teacher], learnerActions: [phase.learner], output: phase.output })),
    coreContent: [
      { title: '生成式 AI 在行銷流程中的用途與邊界', explanation: '生成式 AI 適合協助發想、變體製作、摘要與初稿，但市場事實、產品承諾和最終品牌責任仍須由人員確認。課程以「策略由人定義、AI 協助生成、人員負責驗證」作為使用原則。', keyPoints: ['用途包含受眾洞察整理、內容發想、文案與素材變體', '不得把流暢文字誤認為真實市場證據', '先設定行銷目標與成功指標，再決定是否使用 AI'] },
      { title: '受眾分析、顧客旅程與行銷漏斗', explanation: '有效內容必須對應具體受眾需求和旅程階段。認知階段重視注意與問題辨識，考慮階段重視價值與證據，轉換階段則需要明確行動與降低疑慮。', keyPoints: ['受眾輪廓需包含需求、情境、阻礙與偏好', '同一產品在不同漏斗階段需要不同訊息', '以點擊率、互動率、轉換率等成效指標連結策略目標'] },
      { title: '提示詞設計：從策略需求到可控輸出', explanation: '行銷提示詞應明確指定角色、品牌背景、目標受眾、溝通目標、品牌語調、事實限制、禁止事項與輸出格式，並透過迭代比較改善品質。', keyPoints: ['提供必要背景但避免輸入個人資料或機密資訊', '設定必須遵守的品牌詞彙、語調與事實邊界', '要求模型標示不確定資訊，禁止自行虛構來源'] },
      { title: 'AI 產出驗證、品牌一致性與成效指標', explanation: 'AI 初稿完成後，需逐項查核事實、產品規格、來源、品牌語調、受眾適切性與行動呼籲，並把內容表現連結到可觀察的行銷指標。', keyPoints: ['使用可信來源交叉驗證所有可查證敘述', '以品牌語調清單檢查用字、立場與承諾', '先定義指標與基準，再進行 A/B 測試或小規模驗證'] },
      { title: '風險、倫理與人為責任', explanation: '生成式 AI 可能產生幻覺、錯誤資訊、偏見、侵權或不當使用個資。行銷內容會直接影響品牌信任，因此發布前必須由具責任的人員完成查核與核准。', keyPoints: ['保護個人資料、未公開策略與客戶資訊', '確認素材來源、授權與著作權界線', '檢查偏見、不當表述、錯誤資訊與品牌不一致'] },
    ],
    activities: [{
      title: 'AI 行銷內容設計挑戰', purpose: '小組為指定品牌設計一則對應顧客旅程階段的 AI 行銷內容，並完成事實與風險驗證。',
      durationMinutes: 30, groupFormat: '3–4 人小組',
      steps: ['選擇品牌或產品，定義目標受眾、行銷目標與顧客旅程階段。', '撰寫包含角色、受眾、目標、品牌語調、限制與格式的提示詞。', '生成行銷內容草案，標示其中所有產品事實、主張與需查證資訊。', '依品牌一致性、事實正確性、吸引力、版權、隱私與偏見風險進行檢查。', '根據檢查結果修訂提示詞與內容，完成最終版本。', '準備兩分鐘發表，說明策略選擇、修訂依據與仍需監控的風險。'],
      teacherGuidance: '要求每組說明受眾證據、提示詞限制和查核來源；若無法驗證主張，必須刪除、改寫或明確標示不確定性。',
      learnerOutput: '受眾與旅程設定、完整提示詞、初稿、驗證清單、修訂版內容及兩分鐘發表。',
      completionCriteria: ['受眾與行銷目標明確', '提示詞包含品牌語調與事實限制', '最終內容符合品牌一致性', '已查核可驗證敘述並標示來源', '至少辨識四類 AI 風險並完成修訂'],
    }],
    discussionQuestions: ['什麼情況下使用生成式 AI 能提升行銷效率，什麼情況反而增加風險？', '品牌語調應如何轉換成模型可以遵守的提示詞限制？', 'AI 內容表現良好是否代表內容可信且合乎倫理？為什麼？', '發布 AI 行銷內容前，最終責任應由誰承擔？'],
    assessment: {
      method: '小組 AI 行銷內容包、兩分鐘發表及個人 Exit Ticket 的規準評量',
      criteria: ['目標受眾匹配度', '品牌語調一致性', '提示詞設計清晰度與可控制性', '內容事實正確性與來源查核', '行銷策略與漏斗階段的可行性', 'AI 風險辨識與修訂完整性'],
      feedbackMethod: '同儕先依六項規準提供一項優點與一項修訂建議，教師再針對策略、查核與倫理風險給予具體回饋。',
    },
    resources: {
      teacherPreparation: ['準備品牌情境卡、優劣提示詞範例與風險案例', '確認課堂使用工具的資料政策並準備無工具替代方案'],
      learnerPreparation: ['複習行銷漏斗或顧客旅程基本概念'],
      materials: ['品牌情境卡', '提示詞設計表', 'AI 產出驗證清單', '小組評量規準'], tools: ['經教師核准的生成式 AI 工具', '共享文件或紙本工作表'],
      contingencyPlan: '若無法使用 AI 工具，教師提供預先生成的內容樣本，小組仍完成提示詞分析、風險查核與修訂。',
    },
    risksAndNotes: [
      '幻覺與錯誤資訊：AI 可能虛構產品功能、數據或來源，所有可查證敘述都必須交叉驗證。',
      '個人資料與隱私：不得輸入客戶名單、聯絡資訊、未公開行為資料或其他敏感資訊。',
      '著作權與素材來源：確認文字、圖像與創意素材的授權、引用與來源，不得假設 AI 產出可自由商用。',
      '偏見與不當表述：檢查刻板印象、歧視、排除性語言及對特定群體的不公平影響。',
      '品牌語調不一致：以品牌準則檢查用字、立場、承諾與視覺描述，避免損害品牌信任。',
      '過度依賴 AI：AI 僅協助產生選項，不取代市場研究、策略判斷、法務審查與最終核准。',
      '教師需要求學生保存查核紀錄，並能說明採用、拒絕或修改每項 AI 輸出的理由。',
    ],
    extension: { followUpTask: '選擇另一個顧客旅程階段，改寫提示詞與內容，並預測適合追蹤的成效指標。', reflectionQuestions: ['哪一項提示詞限制最能改善品牌一致性？', '哪一項 AI 風險最難在發布前被發現？'] },
  };
}

export function generateCourseContent(payload, requirements = extractStructuredRequirements('course', payload)) {
  if (isAiMarketing(requirements, payload) && requirements.language === 'zh') return aiMarketingCourseContent(payload, requirements);
  const language = languageOf(payload); const t = TEXT[language]; const m = META[language];
  const topic = requirements.topic || payload.title;
  const durations = Number(payload.durationMinutes) === 90 ? [20, 30, 40] : splitDuration(payload.durationMinutes, [0.2, 0.35, 0.45]);
  return {
    overview: { courseTitle: payload.title, topic, purpose: t.coursePurpose(topic), targetAudience: payload.targetAudience?.length ? payload.targetAudience : [m.audience], difficulty: payload.difficulty || 'Unspecified', durationMinutes: payload.durationMinutes, language, format: payload.format?.length ? payload.format : ['Course'] },
    learningObjectives: t.objectives(topic), learningOutcomes: t.outcomes(topic),
    sessionPlan: t.phases.map((title, index) => ({ title, durationMinutes: durations[index], teacherActions: [t.teacher[index]], learnerActions: [t.learner[index]], output: t.outputs[index] })),
    coreContent: t.coreTitles.map((title, index) => ({ title, explanation: t.explanations(topic, '')[index].trim(), keyPoints: t.keyPoints[index] })),
    activities: [{ title: t.activityTitle, purpose: t.activityPurpose, durationMinutes: durations[2], groupFormat: m.group, steps: t.steps, teacherGuidance: `${t.teacher[2]} ${m.feedback}`, learnerOutput: `${t.outputs[2]} — ${m.reflections[0]}`, completionCriteria: m.courseCompletion }],
    discussionQuestions: t.questions(topic),
    assessment: { method: m.assessmentMethod, criteria: m.assessmentCriteria, feedbackMethod: m.feedback },
    resources: { teacherPreparation: m.teacherPreparation, learnerPreparation: m.learnerPreparation, materials: m.materials, tools: m.tools, contingencyPlan: m.contingency },
    risksAndNotes: [t.risk], extension: { followUpTask: m.followUp(topic), reflectionQuestions: m.reflections },
  };
}

export function generateLearningActivityContent(payload) {
  const language = languageOf(payload); const t = TEXT[language]; const m = META[language]; const topic = payload.activityTitle;
  const durations = splitDuration(payload.estimatedTimeMinutes, [0.2, 0.45, 0.35]);
  return {
    overview: { activityTitle: payload.activityTitle, activityType: payload.activityType || 'Learning Activity', purpose: t.activityPurposeOnly(payload.activityTitle), targetAudience: payload.targetAudience?.length ? payload.targetAudience : [m.audience], estimatedTimeMinutes: payload.estimatedTimeMinutes, difficulty: payload.difficulty || 'Unspecified', language, groupFormat: m.group },
    learningOutcomes: m.outcomes(payload.activityTitle),
    materials: { teacherMaterials: m.teacherMaterials, learnerMaterials: m.learnerMaterials, digitalTools: m.digitalTools, equipment: m.equipment },
    preparation: { teacherPreparation: m.teacherPrep, learnerPreparation: m.learnerPrep },
    steps: t.activitySteps.map((title, index) => ({ title, durationMinutes: durations[index], teacherInstruction: t.script[index], learnerAction: t.steps[index], completionCondition: m.completion[index] })),
    teacherScript: t.script, discussionQuestions: t.questions(payload.activityTitle),
    expectedOutput: { format: m.outputFormat, requirements: m.outputRequirements, submissionMethod: m.submission },
    assessmentCriteria: m.activityCriteria,
    differentiation: { beginnerSupport: m.beginner, advancedExtension: m.advanced(topic), noToolAlternative: m.noTool, individualAlternative: m.individual },
    closing: { summary: t.closing, reflectionQuestion: m.reflection, exitTicket: m.exit },
  };
}

function isEmpty(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0 || value.some(isEmpty);
  if (typeof value === 'object') return Object.keys(value).length === 0 || Object.values(value).some(isEmpty);
  return false;
}

function strings(value, output = []) {
  if (typeof value === 'string') output.push(value.trim());
  else if (Array.isArray(value)) value.forEach((item) => strings(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, output));
  return output.filter(Boolean);
}

function comparable(value) { return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ''); }
function includesComparable(values, expected) { return (values || []).some((value) => comparable(value) === comparable(expected)); }

function promptOverlap(sourcePrompt, bodyText) {
  const prompt = comparable(sourcePrompt); const body = comparable(bodyText);
  if (!prompt || !body) return { ratio: 0, threshold: 0.35, valid: true, copiedSegments: [] };
  const segments = String(sourcePrompt).split(/[\n。！？!?]+/u).map((item) => item.replace(/^\s*\d+[.)、]\s*/u, '').trim()).filter((item) => comparable(item).length >= 10);
  const copiedSegments = segments.filter((item) => body.includes(comparable(item)));
  const copiedLength = copiedSegments.reduce((sum, item) => sum + comparable(item).length, 0);
  const ratio = Math.min(1, copiedLength / prompt.length);
  return { ratio: Number(ratio.toFixed(3)), threshold: 0.35, valid: ratio < 0.35, copiedSegments: copiedSegments.map((item) => item.slice(0, 120)) };
}

function relevanceResult(keywords, bodyText) {
  const body = comparable(bodyText);
  const matchedKeywords = (keywords || []).filter((keyword) => body.includes(comparable(keyword)));
  const score = keywords?.length ? matchedKeywords.length / keywords.length : 1;
  return { score: Number(score.toFixed(3)), threshold: 0.65, valid: score >= 0.65, requiredKeywords: keywords || [], matchedKeywords };
}

export function validateStructuredContent(draftType, content, { allowedUrls = [], requirements, sourcePrompt = '' } = {}) {
  const course = draftType === 'course';
  const required = course ? ['overview', 'learningObjectives', 'learningOutcomes', 'sessionPlan', 'coreContent', 'activities', 'discussionQuestions', 'assessment', 'resources', 'risksAndNotes', 'extension'] : ['overview', 'learningOutcomes', 'materials', 'preparation', 'steps', 'teacherScript', 'discussionQuestions', 'expectedOutput', 'assessmentCriteria', 'differentiation', 'closing'];
  const errors = []; const warnings = [];
  required.forEach((section) => { if (!(section in (content || {})) || isEmpty(content[section])) errors.push(`Missing or empty section: ${section}`); });
  const flow = course ? content?.sessionPlan : content?.steps;
  if (!Array.isArray(flow) || flow.length < 3) errors.push(course ? 'Course requires at least 3 session stages.' : 'Activity requires at least 3 steps.');
  const expectedDuration = Number(course ? content?.overview?.durationMinutes : content?.overview?.estimatedTimeMinutes);
  const durationTotal = Array.isArray(flow) ? flow.reduce((sum, item) => sum + (Number(item?.durationMinutes) || 0), 0) : 0;
  if (durationTotal !== expectedDuration) errors.push(`Duration total ${durationTotal} does not equal ${expectedDuration}.`);
  if (course && (!Array.isArray(content?.learningObjectives) || content.learningObjectives.length < 3 || content.learningObjectives.length > 6)) errors.push('Course requires 3 to 6 learning objectives.');
  if (course && content?.learningObjectives?.some((item) => !MEASURABLE_VERBS.test(item))) errors.push('Learning objectives must use measurable verbs.');
  if (!Array.isArray(content?.learningOutcomes) || !content.learningOutcomes.some((item) => String(item).length >= 20)) errors.push('A concrete learning output is required.');
  if (course && (!content?.assessment?.method || !content?.assessment?.criteria?.length)) errors.push('An assessment method and criteria are required.');
  if (Array.isArray(flow) && flow.some((item) => !(course ? item.teacherActions?.length && item.learnerActions?.length : item.teacherInstruction && item.learnerAction))) errors.push('Every stage requires teacher and learner actions.');
  const allStrings = strings(content);
  const bodyText = allStrings.join('\n');
  if (allStrings.some((item) => VAGUE_ONLY.test(item))) errors.push('Content contains an unsupported generic instruction.');
  const normalized = allStrings.map((item) => item.toLocaleLowerCase()).filter((item) => item.length > 16);
  if (new Set(normalized).size !== normalized.length) warnings.push('Potential repeated content detected.');
  const repeatedSentences = [...new Set(normalized.filter((item, index) => normalized.indexOf(item) !== index))];
  const instructionLeakage = allStrings.filter((item) => INSTRUCTION_LEAKAGE.test(item));
  const overlap = promptOverlap(sourcePrompt, bodyText);
  const topicRelevance = relevanceResult(requirements?.subjectKeywords || [], bodyText);
  const overview = content?.overview || {};
  const preservedConstraints = requirements ? {
    exactTitle: comparable(course ? overview.courseTitle : overview.activityTitle) === comparable(requirements.exactTitle),
    targetAudience: Boolean(requirements.targetAudience?.length) && requirements.targetAudience.every((item) => includesComparable(overview.targetAudience, item)),
    format: course ? Boolean(requirements.format?.length) && requirements.format.every((item) => includesComparable(overview.format, item)) : true,
    durationMinutes: Number(course ? overview.durationMinutes : overview.estimatedTimeMinutes) === Number(requirements.durationMinutes),
    difficulty: comparable(overview.difficulty) === comparable(requirements.difficulty),
    language: comparable(overview.language) === comparable(requirements.language),
  } : null;
  if (requirements) {
    if (!preservedConstraints.exactTitle) errors.push('Extracted exactTitle was not preserved.');
    if (!preservedConstraints.targetAudience) errors.push('Extracted targetAudience was missing or replaced.');
    if (!preservedConstraints.format) errors.push('Extracted format was missing or replaced.');
    if (!preservedConstraints.durationMinutes) errors.push('Extracted duration was not preserved.');
    if (!preservedConstraints.difficulty) errors.push('Extracted difficulty was not preserved.');
    if (!preservedConstraints.language) errors.push('Extracted language was not preserved.');
    if (!topicRelevance.valid) errors.push('Topic relevance is below the required threshold.');
  }
  if (!overlap.valid) errors.push('Content has excessive overlap with the source prompt.');
  if (instructionLeakage.length) errors.push('Instruction leakage detected in generated content.');
  if (course && Number(expectedDuration) === 90) {
    const durations = Array.isArray(flow) ? flow.map((item) => Number(item.durationMinutes)) : [];
    if (durations.some((minutes) => minutes % 5 !== 0)) errors.push('The 90-minute session plan does not use a natural teaching allocation.');
  }
  const aiMarketing = requirements?.subjectKeywords?.length === AI_MARKETING_KEYWORDS.length;
  if (course && aiMarketing) {
    const objectiveText = (content?.learningObjectives || []).join(' ');
    const relevantObjectives = AI_MARKETING_KEYWORDS.filter((keyword) => comparable(objectiveText).includes(comparable(keyword))).length;
    if (relevantObjectives < 4) errors.push('Learning objectives are not specific enough for generative AI marketing.');
    const relevantActivity = (content?.activities || []).some((activity) => /小組|group|그룹/iu.test(activity.groupFormat || '') && relevanceResult(['受眾', '提示詞', '品牌', '驗證', '風險'], strings(activity).join(' ')).score >= 0.6);
    if (!relevantActivity) errors.push('A topic-specific group activity is required.');
    const assessmentText = strings(content?.assessment || {}).join(' ');
    if (['受眾', '品牌語調', '提示詞', '事實正確', '行銷', '風險'].filter((term) => comparable(assessmentText).includes(comparable(term))).length < 5) errors.push('Assessment criteria are not specific enough.');
    const riskText = (content?.risksAndNotes || []).join(' ');
    const riskCoverage = AI_RISK_GROUPS.filter((pattern) => pattern.test(riskText)).length;
    if (riskCoverage < 4) errors.push('At least four AI risk categories are required.');
    if (GENERIC_TEMPLATE.test(bodyText)) errors.push('Generic template language is not acceptable for this topic.');
  }
  const serialized = JSON.stringify(content || {});
  if (serialized.length > XCHANGE_MAX_CONTENT_CHARS) errors.push('Content exceeds the maximum length.');
  const urls = allStrings.flatMap((item) => item.match(URL_PATTERN) || []);
  for (const url of urls) {
    let parsed; try { parsed = new URL(url); } catch { errors.push(`Unsafe URL: ${url}`); continue; }
    if (parsed.protocol !== 'https:' || !allowedUrls.includes(parsed.href)) errors.push(`Unverified source URL: ${url}`);
  }
  let estimatedBodyBlocks = 0;
  try { estimatedBodyBlocks = course ? buildCourseNotionBlocks(content).length : buildLearningActivityNotionBlocks(content).length; }
  catch { /* malformed content is already rejected by section validation */ }
  if (estimatedBodyBlocks > XCHANGE_MAX_BODY_BLOCKS) errors.push('Content exceeds the maximum block count.');
  const rejected = !overlap.valid || instructionLeakage.length || errors.some((item) => /URL|maximum/iu.test(item));
  const status = errors.length ? (rejected ? 'Rejected' : 'Incomplete') : warnings.length ? 'Complete with warnings' : 'Complete';
  const qualityReasons = errors.length ? [...errors] : warnings.length ? [...warnings] : ['All extracted constraints, relevance, structure, timing, assessment, and safety checks passed.'];
  return {
    status, errors, warnings, qualityReasons, topicRelevance,
    promptOverlap: { ...overlap, repeatedSentences, instructionLeakage: instructionLeakage.map((item) => item.slice(0, 120)) },
    preservedConstraints,
    durationValidation: { expectedMinutes: expectedDuration, actualMinutes: durationTotal, valid: expectedDuration === durationTotal }, estimatedBodyBlocks,
  };
}

const rich = (content) => [{ type: 'text', text: { content: String(content).slice(0, 2000) } }];
const block = (type, content, extra = {}) => ({ object: 'block', type, [type]: { rich_text: rich(content), ...extra } });
const heading = (level, content) => block(`heading_${level}`, content);
const paragraph = (content) => block('paragraph', content);
const bullet = (content) => block('bulleted_list_item', content);
const number = (content) => block('numbered_list_item', content);
const divider = () => ({ object: 'block', type: 'divider', divider: {} });
const list = (items, factory = bullet) => (items || []).map((item) => factory(item));

const HEADINGS = {
  zh: { objectives: '學習目標', outcomes: '學習產出', plan: '課程流程', teacher: '教師', learner: '學習者', output: '產出', core: '核心內容', activities: '學習活動', guidance: '教師引導', criteria: '完成準則', questions: '討論問題', assessment: '評量', method: '方式', feedback: '回饋', resources: '資源', risks: '風險與備註', extension: '延伸學習', materials: '材料', preparation: '準備', steps: '活動步驟', script: '教師引導語', expected: '預期產出', format: '格式', submission: '提交方式', differentiation: '差異化支持', closing: '收束' },
  ko: { objectives: '학습 목표', outcomes: '학습 산출물', plan: '수업 흐름', teacher: '교사', learner: '학습자', output: '산출물', core: '핵심 내용', activities: '학습 활동', guidance: '교사 안내', criteria: '완료 기준', questions: '토론 질문', assessment: '평가', method: '방법', feedback: '피드백', resources: '자료', risks: '위험 및 유의사항', extension: '확장 학습', materials: '준비물', preparation: '사전 준비', steps: '활동 단계', script: '교사 발문', expected: '예상 산출물', format: '형식', submission: '제출 방법', differentiation: '수준별 지원', closing: '마무리' },
  en: { objectives: 'Learning objectives', outcomes: 'Learning outcomes', plan: 'Session plan', teacher: 'Teacher', learner: 'Learner', output: 'Output', core: 'Core content', activities: 'Activities', guidance: 'Teacher guidance', criteria: 'Completion criterion', questions: 'Discussion questions', assessment: 'Assessment', method: 'Method', feedback: 'Feedback', resources: 'Resources', risks: 'Risks and notes', extension: 'Extension', materials: 'Materials', preparation: 'Preparation', steps: 'Activity steps', script: 'Teacher script', expected: 'Expected output', format: 'Format', submission: 'Submission', differentiation: 'Differentiation', closing: 'Closing' },
};

function commonOverview(overview) {
  return Object.entries(overview || {}).flatMap(([key, value]) => list(Array.isArray(value) ? value.map((item) => `${key}: ${item}`) : [`${key}: ${value}`]));
}

export function buildCourseNotionBlocks(content) {
  const h = HEADINGS[content.overview.language] || HEADINGS.en;
  const blocks = [heading(1, content.overview.courseTitle), paragraph(content.overview.purpose), ...commonOverview(content.overview), divider(), heading(2, h.objectives), ...list(content.learningObjectives), heading(2, h.outcomes), ...list(content.learningOutcomes), heading(2, h.plan)];
  content.sessionPlan.forEach((stage) => blocks.push(heading(2, `${stage.title} · ${stage.durationMinutes} min`), ...list(stage.teacherActions.map((item) => `${h.teacher}: ${item}`)), ...list(stage.learnerActions.map((item) => `${h.learner}: ${item}`)), block('callout', `${h.output}: ${stage.output}`, { icon: { type: 'emoji', emoji: '✅' } })));
  blocks.push(divider(), heading(2, h.core));
  content.coreContent.forEach((section) => blocks.push(heading(2, section.title), paragraph(section.explanation), ...list(section.keyPoints)));
  blocks.push(heading(2, h.activities));
  content.activities.forEach((activity) => blocks.push(heading(2, `${activity.title} · ${activity.durationMinutes} min`), paragraph(activity.purpose), ...list(activity.steps, number), paragraph(`${h.guidance}: ${activity.teacherGuidance}`), block('callout', `${h.output}: ${activity.learnerOutput}`, { icon: { type: 'emoji', emoji: '📝' } }), ...list(activity.completionCriteria.map((item) => `${h.criteria}: ${item}`))));
  blocks.push(heading(2, h.questions), ...list(content.discussionQuestions, number), heading(2, h.assessment), paragraph(`${h.method}: ${content.assessment.method}`), ...list(content.assessment.criteria), paragraph(`${h.feedback}: ${content.assessment.feedbackMethod}`), heading(2, h.resources), ...Object.entries(content.resources).flatMap(([key, value]) => list(Array.isArray(value) ? value.map((item) => `${key}: ${item}`) : [`${key}: ${value}`])), heading(2, h.risks), ...list(content.risksAndNotes), heading(2, h.extension), paragraph(content.extension.followUpTask), ...list(content.extension.reflectionQuestions, number));
  return blocks;
}

export function buildLearningActivityNotionBlocks(content) {
  const h = HEADINGS[content.overview.language] || HEADINGS.en;
  const blocks = [heading(1, content.overview.activityTitle), paragraph(content.overview.purpose), ...commonOverview(content.overview), divider(), heading(2, h.outcomes), ...list(content.learningOutcomes), heading(2, h.materials), ...Object.entries(content.materials).flatMap(([key, value]) => list(value.map((item) => `${key}: ${item}`))), heading(2, h.preparation), ...Object.entries(content.preparation).flatMap(([key, value]) => list(value.map((item) => `${key}: ${item}`))), heading(2, h.steps)];
  content.steps.forEach((step) => blocks.push(heading(2, `${step.title} · ${step.durationMinutes} min`), paragraph(`${h.teacher}: ${step.teacherInstruction}`), paragraph(`${h.learner}: ${step.learnerAction}`), block('to_do', step.completionCondition, { checked: false })));
  blocks.push(heading(2, h.script), ...list(content.teacherScript.map((item) => item), (item) => block('quote', item)), heading(2, h.questions), ...list(content.discussionQuestions, number), heading(2, h.expected), paragraph(`${h.format}: ${content.expectedOutput.format}`), ...list(content.expectedOutput.requirements), paragraph(`${h.submission}: ${content.expectedOutput.submissionMethod}`), heading(2, h.assessment), ...list(content.assessmentCriteria, (item) => block('to_do', item, { checked: false })), heading(2, h.differentiation), ...Object.entries(content.differentiation).map(([key, value]) => paragraph(`${key}: ${value}`)), heading(2, h.closing), paragraph(content.closing.summary), block('quote', content.closing.reflectionQuestion), block('callout', content.closing.exitTicket, { icon: { type: 'emoji', emoji: '🎫' } }));
  return blocks;
}

export function createStructuredContent(draftType, payload, options = {}) {
  const requirements = options.requirements || extractStructuredRequirements(draftType, payload);
  const sourcePrompt = options.sourcePrompt ?? sourcePromptOf(draftType, payload);
  const content = draftType === 'course' ? generateCourseContent(payload, requirements) : generateLearningActivityContent(payload);
  const allowedUrls = [payload.fileUrl, payload.materialsUrl].filter(Boolean);
  return { content, requirements, quality: validateStructuredContent(draftType, content, { allowedUrls, requirements, sourcePrompt }) };
}
