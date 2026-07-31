import { getAgentByKey, getAgentLocale } from './agentRegistry.js';

const networker = getAgentByKey('networker');

export const NETWORKER_AGENT_PAGE = Object.freeze({
  id: 'networker', endpoint: '/api/agent/networker/chat', route: networker.route,
  inputId: 'networker-agent-query', testId: 'networker-agent-page', requestPrefix: 'networker',
  moduleId: 'identity', sourceIds: ['identity'], answerLabel: networker.answerLabel,
});

const planListKeys = Object.freeze(['nodes', 'nodeType', 'profileIds', 'organizations', 'sharedInterests', 'complementaryCapabilities', 'proposedRelations', 'evidence', 'sourceIds']);

export const NETWORKER_ASSISTANT_UI = Object.freeze({
  zh: {
    title: networker.name, intro: '根據公開 Identity Profiles 搜尋身份、專長與合作方向，分析可能的連結並建立唯讀合作地圖。',
    inputLabel: '輸入你想搜尋、比較或分析的身份與合作需求', placeholder: '例如：比較公開 Profiles，整理共同興趣、互補能力與待確認資訊。',
    submit: '送出', stop: '停止等待', clear: '清除對話',
    suggestions: ['目前有哪些公開 Identity Profiles？', '比較兩個公開 Profile。', '找出共同研究興趣與互補能力。', '建立 proposed 合作關係地圖。'],
    generating: 'Networker 正在使用 Identity 工具整理公開身份與可能的合作連結……',
    disabled: 'Networker AI 回答目前未啟用，以下仍提供公開 Identity Profiles 來源。', modelUnavailable: 'Networker AI 回答暫時無法使用，以下仍提供相關公開 Identity Profiles 來源。',
    toolUnavailable: 'Networker 的 Identity 工具暫時無法讀取公開資料，請稍後再試。', forcedSourcesOnly: '目前以公開 Identity Profiles 來源模式提供結果。',
    rateLimited: (seconds) => `請稍候 ${seconds} 秒後再提問。`, noSources: '目前公開的 Identity Profiles 資料中找不到足夠內容回答這個問題。', moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: 'Networker 僅分析公開 Identity Profiles；不外部搜尋個資、不推測合作意願或私人關係，也不寄信、傳訊息、建立聯絡人、邀請或日曆事件。',
    partial: '部分公開 Identity Profiles 來源暫時無法讀取。', sourcesOnly: '以下仍提供相關公開 Identity Profiles 來源。',
    source: '來源', type: '類型', updatedAt: '更新時間', viewSource: '查看來源', openExternal: '開啟已驗證公開連結', citationLabel: (sourceId) => `跳到來源 ${sourceId}`,
    userLabel: '你', assistantLabel: networker.answerLabel, currentModule: '目前模組', defaultAgent: '預設 Agent', responseAgent: '回應 Agent',
    factTitle: '合作關係分級', factLabels: { verified: '已確認', inferred: '推論', recommended: '建議', unknown: '未知' }, factEmpty: '無', factTestId: 'networker-fact-classification',
    planTitle: '結構化合作地圖', planListKeys, planTestId: 'networker-collaboration-map',
    planLabels: { objective: '目標', nodes: '節點', nodeType: '節點類型', profileIds: 'Profile IDs', organizations: '機構', sharedInterests: '共同興趣', complementaryCapabilities: '互補能力', proposedRelations: 'Proposed 關係', evidence: '證據', sourceIds: '來源 IDs', verificationStatus: '驗證狀態' },
  },
  ko: {
    title: networker.name, intro: '공개 Identity Profiles에서 정체성, 전문성과 협업 방향을 검색하고 잠재적 연결을 분석해 읽기 전용 협업 지도를 만듭니다.',
    inputLabel: '검색, 비교 또는 분석할 정체성과 협업 요구를 입력하세요', placeholder: '예: 공개 Profile을 비교하고 공통 관심사, 상호 보완 역량과 확인할 정보를 정리해 주세요.',
    submit: '보내기', stop: '대기 중지', clear: '대화 지우기', suggestions: ['현재 어떤 공개 Identity Profile이 있나요?', '두 공개 Profile을 비교해 주세요.', '공통 연구 관심사와 상호 보완 역량을 찾아 주세요.', 'proposed 협업 관계 지도를 만들어 주세요.'],
    generating: 'Networker가 Identity 도구로 공개 정체성과 잠재적 협업 연결을 정리하고 있습니다…',
    disabled: 'Networker AI 답변은 현재 비활성화되어 있지만 공개 Identity Profiles 출처는 계속 확인할 수 있습니다.', modelUnavailable: 'Networker AI 답변을 일시적으로 사용할 수 없습니다. 관련 공개 Identity Profiles 출처는 아래에 표시됩니다.',
    toolUnavailable: 'Networker Identity 도구가 공개 데이터를 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', forcedSourcesOnly: '현재 공개 Identity Profiles 출처 모드로 결과를 제공합니다.',
    rateLimited: (seconds) => `${seconds}초 후에 다시 질문해 주세요.`, noSources: '현재 공개된 Identity Profiles 데이터에서 이 요청에 답할 충분한 내용을 찾지 못했습니다.', moderated: '이 요청은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: 'Networker는 공개 Identity Profiles만 분석합니다. 외부 개인 정보 검색, 협업 의사나 사적 관계 추측, 이메일·메시지·연락처·초대·캘린더 작업을 수행하지 않습니다.',
    partial: '일부 공개 Identity Profiles 출처를 일시적으로 불러오지 못했습니다.', sourcesOnly: '관련 공개 Identity Profiles 출처는 아래에서 확인할 수 있습니다.',
    source: '출처', type: '유형', updatedAt: '업데이트', viewSource: '출처 보기', openExternal: '검증된 공개 링크 열기', citationLabel: (sourceId) => `${sourceId} 출처로 이동`,
    userLabel: '나', assistantLabel: networker.answerLabel, currentModule: '현재 모듈', defaultAgent: '기본 Agent', responseAgent: '응답 Agent',
    factTitle: '협업 관계 분류', factLabels: { verified: '확인됨', inferred: '추론', recommended: '권장', unknown: '알 수 없음' }, factEmpty: '없음', factTestId: 'networker-fact-classification',
    planTitle: '구조화된 협업 지도', planListKeys, planTestId: 'networker-collaboration-map',
    planLabels: { objective: '목표', nodes: '노드', nodeType: '노드 유형', profileIds: 'Profile IDs', organizations: '기관', sharedInterests: '공통 관심사', complementaryCapabilities: '상호 보완 역량', proposedRelations: '제안 관계', evidence: '근거', sourceIds: '출처 IDs', verificationStatus: '검증 상태' },
  },
  en: {
    title: networker.name, intro: 'Search public Identity Profiles for identities, expertise, and collaboration directions, then analyze possible connections in a read-only collaboration map.',
    inputLabel: 'Enter an identity or collaboration need to search, compare, or analyze', placeholder: 'Example: Compare public profiles and summarize shared interests, complementary capabilities, and open questions.',
    submit: 'Submit', stop: 'Cancel', clear: 'Clear chat', suggestions: ['Which public Identity Profiles are available?', 'Compare two public profiles.', 'Find shared research interests and complementary capabilities.', 'Build a proposed collaboration map.'],
    generating: 'Networker is using Identity tools to organize public profiles and possible collaboration connections…',
    disabled: 'Networker AI answers are currently disabled. Public Identity Profiles sources are still available.', modelUnavailable: 'Networker AI answers are temporarily unavailable. Relevant public Identity Profiles sources are still shown below.',
    toolUnavailable: 'Networker’s Identity tools cannot read public data right now. Please try again later.', forcedSourcesOnly: 'Results are currently provided in public Identity Profiles source mode.',
    rateLimited: (seconds) => `Please wait ${seconds} seconds before asking again.`, noSources: 'The currently public Identity Profiles data does not contain enough information to answer this request.', moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Networker analyzes only public Identity Profiles. It cannot search external personal data, infer willingness or private relationships, email, message, create contacts, invite, or schedule calendar events.',
    partial: 'Some public Identity Profiles sources are temporarily unavailable.', sourcesOnly: 'Relevant public Identity Profiles sources are still shown below.',
    source: 'Source', type: 'Type', updatedAt: 'Updated At', viewSource: 'View source', openExternal: 'Open validated public link', citationLabel: (sourceId) => `Jump to source ${sourceId}`,
    userLabel: 'You', assistantLabel: networker.answerLabel, currentModule: 'Current module', defaultAgent: 'Default Agent', responseAgent: 'Response Agent',
    factTitle: 'Collaboration relationship classification', factLabels: { verified: 'Verified', inferred: 'Inferred', recommended: 'Recommended', unknown: 'Unknown' }, factEmpty: 'None', factTestId: 'networker-fact-classification',
    planTitle: 'Structured collaboration map', planListKeys, planTestId: 'networker-collaboration-map',
    planLabels: { objective: 'Objective', nodes: 'Nodes', nodeType: 'Node types', profileIds: 'Profile IDs', organizations: 'Organizations', sharedInterests: 'Shared interests', complementaryCapabilities: 'Complementary capabilities', proposedRelations: 'Proposed relations', evidence: 'Evidence', sourceIds: 'Source IDs', verificationStatus: 'Verification status' },
  },
});

export function getNetworkerDetailItem(lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const localized = getAgentLocale(networker, locale);
  return { id: 'nexaeon-networker', category: localized.moduleLabel, status: 'MVP Active', moduleLabel: 'NexAeon Agent System', title: networker.name };
}
