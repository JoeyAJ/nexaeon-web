import { getAgentByKey, getAgentLocale } from './agentRegistry.js';

const archivist = getAgentByKey('archivist');

export const ARCHIVIST_AGENT_PAGE = Object.freeze({
  id: 'archivist',
  endpoint: '/api/agent/archivist/chat',
  route: archivist.route,
  inputId: 'archivist-agent-query',
  testId: 'archivist-agent-page',
  requestPrefix: 'archivist',
  moduleId: 'knowledge-lab',
  sourceIds: ['knowledge'],
  answerLabel: archivist.answerLabel,
});

export const ARCHIVIST_ASSISTANT_UI = Object.freeze({
  zh: {
    title: archivist.name,
    intro: '搜尋、整理、分類並連結目前公開的文獻、研究筆記、案例、概念、知識卡片與工具。',
    inputLabel: '輸入你想整理或探索的知識問題',
    placeholder: '例如：整理 AI Tutor 與自我調節學習的知識關聯。',
    submit: '送出', stop: '停止等待', clear: '清除對話',
    suggestions: ['目前有哪些公開知識主題？', '整理與 AI Tutor 相關的筆記。', '找出文獻與案例的可能關聯。', '產生概念地圖的節點與關係。'],
    generating: 'Archivist 正在使用 Knowledge 工具搜尋與整理公開資料……',
    disabled: 'Archivist AI 回答目前未啟用，以下仍提供可用的公開知識來源。',
    modelUnavailable: 'Archivist AI 回答暫時無法使用，以下仍提供相關公開知識來源。',
    toolUnavailable: 'Archivist 的 Knowledge 工具暫時無法讀取公開資料，請稍後再試。',
    forcedSourcesOnly: '目前以公開知識來源模式提供結果。',
    rateLimited: (seconds) => `請稍候 ${seconds} 秒後再提問。`,
    noSources: '目前公開的 Knowledge Lab 資料中找不到足夠內容回答這個問題。',
    moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: 'Archivist 僅使用目前公開的 Knowledge Lab 資料；不會讀取 Draft、Hidden、Private、Archived 或未知狀態內容。推論關聯會明確標示為可能關聯。',
    partial: '部分公開知識來源暫時無法讀取。', sourcesOnly: '以下仍提供相關公開知識來源。',
    source: '來源', type: '類型', updatedAt: '更新時間', viewSource: '查看來源', openExternal: '開啟原始來源',
    citationLabel: (sourceId) => `跳到來源 ${sourceId}`,
    userLabel: '你', assistantLabel: archivist.answerLabel, currentModule: '目前模組', defaultAgent: '預設 Agent', responseAgent: '回應 Agent',
  },
  ko: {
    title: archivist.name,
    intro: '현재 공개된 문헌, 연구 노트, 사례, 개념, 지식 카드와 도구를 검색하고 정리하며 분류하고 연결합니다.',
    inputLabel: '정리하거나 탐색할 지식 질문을 입력하세요',
    placeholder: '예: AI Tutor와 자기조절학습의 지식 관계를 정리해 주세요.',
    submit: '보내기', stop: '대기 중지', clear: '대화 지우기',
    suggestions: ['현재 어떤 공개 지식 주제가 있나요?', 'AI Tutor 관련 노트를 정리해 주세요.', '문헌과 사례의 가능한 관계를 찾아 주세요.', '개념 지도 노드와 관계를 만들어 주세요.'],
    generating: 'Archivist가 Knowledge 도구로 공개 데이터를 검색하고 정리하고 있습니다…',
    disabled: 'Archivist AI 답변이 현재 비활성화되어 있지만 공개 지식 출처는 계속 확인할 수 있습니다.',
    modelUnavailable: 'Archivist AI 답변을 일시적으로 사용할 수 없습니다. 관련 공개 지식 출처는 아래에 표시됩니다.',
    toolUnavailable: 'Archivist Knowledge 도구가 공개 데이터를 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    forcedSourcesOnly: '현재 공개 지식 출처 모드로 결과를 제공합니다.',
    rateLimited: (seconds) => `${seconds}초 후에 다시 질문해 주세요.`,
    noSources: '현재 공개된 Knowledge Lab 데이터에서 이 질문에 답할 충분한 내용을 찾지 못했습니다.',
    moderated: '이 요청은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: 'Archivist는 현재 공개된 Knowledge Lab 데이터만 사용하며 Draft, Hidden, Private, Archived 또는 알 수 없는 상태의 콘텐츠를 읽지 않습니다. 추론 관계는 가능한 관계로 표시합니다.',
    partial: '일부 공개 지식 출처를 일시적으로 불러오지 못했습니다.', sourcesOnly: '관련 공개 지식 출처는 아래에서 확인할 수 있습니다.',
    source: '출처', type: '유형', updatedAt: '업데이트', viewSource: '출처 보기', openExternal: '원본 출처 열기',
    citationLabel: (sourceId) => `${sourceId} 출처로 이동`,
    userLabel: '나', assistantLabel: archivist.answerLabel, currentModule: '현재 모듈', defaultAgent: '기본 Agent', responseAgent: '응답 Agent',
  },
  en: {
    title: archivist.name,
    intro: 'Search, organize, classify, and connect currently public literature, research notes, cases, concepts, knowledge cards, and tools.',
    inputLabel: 'Enter a knowledge question to organize or explore',
    placeholder: 'Example: Map the knowledge connections between AI Tutors and self-regulated learning.',
    submit: 'Submit', stop: 'Cancel', clear: 'Clear chat',
    suggestions: ['Which public knowledge topics are available?', 'Organize the notes related to AI Tutors.', 'Find possible relations between literature and cases.', 'Create concept-map nodes and relationships.'],
    generating: 'Archivist is searching and organizing public data with the Knowledge tools…',
    disabled: 'Archivist AI answers are currently disabled. Public knowledge sources are still available.',
    modelUnavailable: 'Archivist AI answers are temporarily unavailable. Relevant public knowledge sources are still shown below.',
    toolUnavailable: 'Archivist’s Knowledge tools cannot read the public data right now. Please try again later.',
    forcedSourcesOnly: 'Results are currently provided in public Knowledge source mode.',
    rateLimited: (seconds) => `Please wait ${seconds} seconds before asking again.`,
    noSources: 'The currently public Knowledge Lab data does not contain enough information to answer this request.',
    moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Archivist uses only currently public Knowledge Lab data and does not read Draft, Hidden, Private, Archived, or unknown-status content. Inferred links are labeled as possible relations.',
    partial: 'Some public knowledge sources are temporarily unavailable.', sourcesOnly: 'Relevant public knowledge sources are still shown below.',
    source: 'Source', type: 'Type', updatedAt: 'Updated At', viewSource: 'View source', openExternal: 'Open original source',
    citationLabel: (sourceId) => `Jump to source ${sourceId}`,
    userLabel: 'You', assistantLabel: archivist.answerLabel, currentModule: 'Current module', defaultAgent: 'Default Agent', responseAgent: 'Response Agent',
  },
});

export function getArchivistDetailItem(lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const localized = getAgentLocale(archivist, locale);
  return {
    id: 'nexaeon-archivist',
    category: localized.moduleLabel,
    status: 'MVP Active',
    moduleLabel: 'NexAeon Agent System',
    title: archivist.name,
  };
}
