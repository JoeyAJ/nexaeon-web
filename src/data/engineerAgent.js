import { getAgentByKey, getAgentLocale } from './agentRegistry.js';

const engineer = getAgentByKey('engineer');

export const ENGINEER_AGENT_PAGE = Object.freeze({
  id: 'engineer', endpoint: '/api/agent/engineer/chat', route: engineer.route,
  inputId: 'engineer-agent-query', testId: 'engineer-agent-page', requestPrefix: 'engineer',
  moduleId: 'projects', sourceIds: ['demos'], answerLabel: engineer.answerLabel,
});

export const ENGINEER_ASSISTANT_UI = Object.freeze({
  zh: {
    title: engineer.name,
    intro: '分析公開 Demo 與 Prototype，整理技術棧、風險與依賴，並規劃 MVP、Sprint、測試與驗收方案。',
    inputLabel: '輸入你想分析或規劃的原型與技術需求',
    placeholder: '例如：根據現有 Demo 拆解下一個 MVP Sprint 與驗收條件。',
    submit: '送出', stop: '停止等待', clear: '清除對話',
    suggestions: ['目前有哪些公開 Demo？', '比較現有原型的技術棧與狀態。', '將這個構想拆解為 MVP 任務。', '建立 Sprint、測試與驗收計畫。'],
    generating: 'Engineer 正在使用 Prototype 工具分析公開資料並整理技術方案……',
    disabled: 'Engineer AI 回答目前未啟用，以下仍提供可用的公開 Prototype 來源。',
    modelUnavailable: 'Engineer AI 回答暫時無法使用，以下仍提供相關公開 Prototype 來源。',
    toolUnavailable: 'Engineer 的 Prototype 工具暫時無法讀取公開資料，請稍後再試。',
    forcedSourcesOnly: '目前以公開 Prototype 來源模式提供結果。',
    rateLimited: (seconds) => `請稍候 ${seconds} 秒後再提問。`,
    noSources: '目前公開的 Prototype Lab 資料中找不到足夠內容回答這個問題。',
    moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: 'Engineer 僅分析目前公開的 Prototype Lab 資料，不會執行程式碼、讀取秘密、修改 Repository 或部署。未經執行驗證的狀態一律視為 planned 或 unverified。',
    partial: '部分公開 Prototype 來源暫時無法讀取。', sourcesOnly: '以下仍提供相關公開 Prototype 來源。',
    source: '來源', type: '類型', updatedAt: '更新時間', viewSource: '查看來源', openExternal: '開啟已驗證公開連結',
    citationLabel: (sourceId) => `跳到來源 ${sourceId}`,
    userLabel: '你', assistantLabel: engineer.answerLabel, currentModule: '目前模組', defaultAgent: '預設 Agent', responseAgent: '回應 Agent',
    factTitle: '技術事實分級', factLabels: { verified: '已確認', inferred: '推論', recommended: '建議', unknown: '未知' }, factEmpty: '無',
    planTitle: '結構化開發計畫', planLabels: { objective: '目標', scope: '範圍', requirements: '需求', tasks: '任務', dependencies: '依賴', risks: '風險', tests: '測試', acceptanceCriteria: '驗收條件', verificationStatus: '驗證狀態' },
  },
  ko: {
    title: engineer.name,
    intro: '공개 Demo와 Prototype을 분석하고 기술 스택, 위험과 의존성을 정리하여 MVP, Sprint, 테스트 및 승인 계획을 제공합니다.',
    inputLabel: '분석하거나 계획할 프로토타입 및 기술 요구를 입력하세요',
    placeholder: '예: 현재 Demo를 기준으로 다음 MVP Sprint와 승인 기준을 분해해 주세요.',
    submit: '보내기', stop: '대기 중지', clear: '대화 지우기',
    suggestions: ['현재 어떤 공개 Demo가 있나요?', '기존 프로토타입의 기술 스택과 상태를 비교해 주세요.', '이 아이디어를 MVP 작업으로 분해해 주세요.', 'Sprint, 테스트 및 승인 계획을 만들어 주세요.'],
    generating: 'Engineer가 Prototype 도구로 공개 데이터를 분석하고 기술 계획을 정리하고 있습니다…',
    disabled: 'Engineer AI 답변이 현재 비활성화되어 있지만 공개 Prototype 출처는 계속 확인할 수 있습니다.',
    modelUnavailable: 'Engineer AI 답변을 일시적으로 사용할 수 없습니다. 관련 공개 Prototype 출처는 아래에 표시됩니다.',
    toolUnavailable: 'Engineer Prototype 도구가 공개 데이터를 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    forcedSourcesOnly: '현재 공개 Prototype 출처 모드로 결과를 제공합니다.',
    rateLimited: (seconds) => `${seconds}초 후에 다시 질문해 주세요.`,
    noSources: '현재 공개된 Prototype Lab 데이터에서 이 요청에 답할 충분한 내용을 찾지 못했습니다.',
    moderated: '이 요청은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: 'Engineer는 현재 공개된 Prototype Lab 데이터만 분석하며 코드 실행, 비밀 읽기, Repository 수정 또는 배포를 수행하지 않습니다. 실행 증거가 없는 상태는 planned 또는 unverified로 유지됩니다.',
    partial: '일부 공개 Prototype 출처를 일시적으로 불러오지 못했습니다.', sourcesOnly: '관련 공개 Prototype 출처는 아래에서 확인할 수 있습니다.',
    source: '출처', type: '유형', updatedAt: '업데이트', viewSource: '출처 보기', openExternal: '검증된 공개 링크 열기',
    citationLabel: (sourceId) => `${sourceId} 출처로 이동`,
    userLabel: '나', assistantLabel: engineer.answerLabel, currentModule: '현재 모듈', defaultAgent: '기본 Agent', responseAgent: '응답 Agent',
    factTitle: '기술 사실 분류', factLabels: { verified: '확인됨', inferred: '추론', recommended: '권장', unknown: '알 수 없음' }, factEmpty: '없음',
    planTitle: '구조화된 개발 계획', planLabels: { objective: '목표', scope: '범위', requirements: '요구사항', tasks: '작업', dependencies: '의존성', risks: '위험', tests: '테스트', acceptanceCriteria: '승인 기준', verificationStatus: '검증 상태' },
  },
  en: {
    title: engineer.name,
    intro: 'Analyze public Demos and Prototypes, organize technology stacks, risks, and dependencies, and plan MVPs, sprints, tests, and acceptance criteria.',
    inputLabel: 'Enter a prototype or technical need to analyze and plan',
    placeholder: 'Example: Break the current Demo into the next MVP sprint and acceptance criteria.',
    submit: 'Submit', stop: 'Cancel', clear: 'Clear chat',
    suggestions: ['Which public Demos are available?', 'Compare the technology stacks and status of existing prototypes.', 'Break this idea into MVP tasks.', 'Create a sprint, test, and acceptance plan.'],
    generating: 'Engineer is analyzing public data with the Prototype tools and preparing a technical plan…',
    disabled: 'Engineer AI answers are currently disabled. Public Prototype sources are still available.',
    modelUnavailable: 'Engineer AI answers are temporarily unavailable. Relevant public Prototype sources are still shown below.',
    toolUnavailable: 'Engineer’s Prototype tools cannot read the public data right now. Please try again later.',
    forcedSourcesOnly: 'Results are currently provided in public Prototype source mode.',
    rateLimited: (seconds) => `Please wait ${seconds} seconds before asking again.`,
    noSources: 'The currently public Prototype Lab data does not contain enough information to answer this request.',
    moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Engineer analyzes only currently public Prototype Lab data and cannot execute code, read secrets, modify repositories, or deploy. States without execution evidence remain planned or unverified.',
    partial: 'Some public Prototype sources are temporarily unavailable.', sourcesOnly: 'Relevant public Prototype sources are still shown below.',
    source: 'Source', type: 'Type', updatedAt: 'Updated At', viewSource: 'View source', openExternal: 'Open validated public link',
    citationLabel: (sourceId) => `Jump to source ${sourceId}`,
    userLabel: 'You', assistantLabel: engineer.answerLabel, currentModule: 'Current module', defaultAgent: 'Default Agent', responseAgent: 'Response Agent',
    factTitle: 'Technical fact classification', factLabels: { verified: 'Verified', inferred: 'Inferred', recommended: 'Recommended', unknown: 'Unknown' }, factEmpty: 'None',
    planTitle: 'Structured development plan', planLabels: { objective: 'Objective', scope: 'Scope', requirements: 'Requirements', tasks: 'Tasks', dependencies: 'Dependencies', risks: 'Risks', tests: 'Tests', acceptanceCriteria: 'Acceptance criteria', verificationStatus: 'Verification status' },
  },
});

export function getEngineerDetailItem(lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const localized = getAgentLocale(engineer, locale);
  return { id: 'nexaeon-engineer', category: localized.moduleLabel, status: 'MVP Active', moduleLabel: 'NexAeon Agent System', title: engineer.name };
}
