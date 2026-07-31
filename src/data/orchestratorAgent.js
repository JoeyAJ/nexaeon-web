import { getAgentByKey, getAgentLocale } from './agentRegistry.js';

const orchestrator = getAgentByKey('orchestrator');

export const ORCHESTRATOR_AGENT_PAGE = Object.freeze({
  id: 'orchestrator', endpoint: '/api/agent/orchestrator/chat', route: orchestrator.route,
  inputId: 'orchestrator-agent-query', testId: 'orchestrator-agent-page', requestPrefix: 'orchestrator',
  moduleId: 'field-lab', sourceIds: ['action'], answerLabel: orchestrator.answerLabel,
});

const planListKeys = Object.freeze(['currentState', 'tasks', 'priority', 'dependencies', 'blockers', 'milestones', 'risks', 'acceptanceCriteria', 'nextActions', 'crossModulePlan']);

export const ORCHESTRATOR_ASSISTANT_UI = Object.freeze({
  zh: {
    title: orchestrator.name, intro: '根據公開 Action Center 資料整理任務、優先順序、依賴與阻塞，並建立唯讀的 proposed 執行計畫。',
    inputLabel: '輸入你想整理、排序或規劃的目標與行動需求', placeholder: '例如：整理目前專案優先順序，建立里程碑與下一步。',
    submit: '送出', stop: '停止等待', clear: '清除對話',
    suggestions: ['目前有哪些公開任務？', '依優先級整理 Action Center。', '找出目前阻塞與依賴。', '建立跨模組 proposed 執行計畫。'],
    generating: 'Orchestrator 正在使用 Action 工具整理公開任務與執行計畫……',
    disabled: 'Orchestrator AI 回答目前未啟用，以下仍提供公開 Action Center 來源。', modelUnavailable: 'Orchestrator AI 回答暫時無法使用，以下仍提供相關公開 Action Center 來源。',
    toolUnavailable: 'Orchestrator 的 Action 工具暫時無法讀取公開資料，請稍後再試。', forcedSourcesOnly: '目前以公開 Action Center 來源模式提供結果。',
    rateLimited: (seconds) => `請稍候 ${seconds} 秒後再提問。`, noSources: '目前公開的 Action Center 資料中找不到足夠內容回答這個問題。', moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: 'Orchestrator 僅分析公開 Action Center 資料；不建立或更新任務、不通知、不排程、不部署，也不自動呼叫其他 Agent。跨模組內容一律為 proposed plan。',
    partial: '部分公開 Action Center 來源暫時無法讀取。', sourcesOnly: '以下仍提供相關公開 Action Center 來源。',
    source: '來源', type: '類型', updatedAt: '更新時間', viewSource: '查看來源', openExternal: '開啟已驗證公開連結', citationLabel: (sourceId) => `跳到來源 ${sourceId}`,
    userLabel: '你', assistantLabel: orchestrator.answerLabel, currentModule: '目前模組', defaultAgent: '預設 Agent', responseAgent: '回應 Agent',
    factTitle: '任務事實分級', factLabels: { verified: '已確認', inferred: '推論', recommended: '建議', unknown: '未知' }, factEmpty: '無', factTestId: 'orchestrator-fact-classification',
    planTitle: '結構化執行計畫', planListKeys, planTestId: 'orchestrator-execution-plan',
    planLabels: { objective: '目標', currentState: '現況', tasks: '任務', priority: '優先順序', dependencies: '依賴', blockers: '阻塞', milestones: '里程碑', risks: '風險', acceptanceCriteria: '驗收條件', nextActions: '下一步', crossModulePlan: '跨模組 proposed plan', verificationStatus: '驗證狀態' },
    actionDraft: { title: 'Action Center 任務草稿', notice: '此操作會寫入外部 Action Center 草稿；不會啟動任務、通知任何人或執行後續工作。', adminRequired: '需要管理員授權才能預覽或建立草稿。', actorId: '管理員 ID', accessCode: '存取碼', signIn: '驗證管理員', signOut: '登出', adminSession: '管理員 session', authFailed: '授權失敗', createPreview: '建立任務草稿', previewTitle: '寫入預覽', previewing: '正在由伺服器產生寫入預覽……', confirm: '確認建立任務草稿', cancel: '取消，不建立草稿', executing: '正在建立 Action Center 草稿……', succeeded: '任務草稿建立成功，record ID', failed: '任務草稿建立失敗', cancelled: '已取消，未建立草稿。', expiresAt: '確認期限', rollback: '支援回滾', yes: '是', no: '否', replayed: '已回傳先前成功結果，未重複建立' },
  },
  ko: {
    title: orchestrator.name, intro: '공개 Action Center 데이터를 기준으로 작업, 우선순위, 의존성과 차단 요소를 정리하고 읽기 전용 proposed 실행 계획을 만듭니다.',
    inputLabel: '정리, 우선순위 지정 또는 계획할 목표와 행동 요구를 입력하세요', placeholder: '예: 현재 프로젝트 우선순위를 정리하고 마일스톤과 다음 행동을 만들어 주세요.',
    submit: '보내기', stop: '대기 중지', clear: '대화 지우기', suggestions: ['현재 어떤 공개 작업이 있나요?', 'Action Center를 우선순위별로 정리해 주세요.', '현재 차단 요소와 의존성을 찾아 주세요.', '모듈 간 proposed 실행 계획을 만들어 주세요.'],
    generating: 'Orchestrator가 Action 도구로 공개 작업과 실행 계획을 정리하고 있습니다…',
    disabled: 'Orchestrator AI 답변은 현재 비활성화되어 있지만 공개 Action Center 출처는 계속 확인할 수 있습니다.', modelUnavailable: 'Orchestrator AI 답변을 일시적으로 사용할 수 없습니다. 관련 공개 Action Center 출처는 아래에 표시됩니다.',
    toolUnavailable: 'Orchestrator Action 도구가 공개 데이터를 일시적으로 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', forcedSourcesOnly: '현재 공개 Action Center 출처 모드로 결과를 제공합니다.',
    rateLimited: (seconds) => `${seconds}초 후에 다시 질문해 주세요.`, noSources: '현재 공개된 Action Center 데이터에서 이 요청에 답할 충분한 내용을 찾지 못했습니다.', moderated: '이 요청은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: 'Orchestrator는 공개 Action Center 데이터만 분석하며 작업 생성·수정, 알림, 일정, 배포 또는 다른 Agent 자동 호출을 수행하지 않습니다. 모듈 간 내용은 항상 proposed plan입니다.',
    partial: '일부 공개 Action Center 출처를 일시적으로 불러오지 못했습니다.', sourcesOnly: '관련 공개 Action Center 출처는 아래에서 확인할 수 있습니다.',
    source: '출처', type: '유형', updatedAt: '업데이트', viewSource: '출처 보기', openExternal: '검증된 공개 링크 열기', citationLabel: (sourceId) => `${sourceId} 출처로 이동`,
    userLabel: '나', assistantLabel: orchestrator.answerLabel, currentModule: '현재 모듈', defaultAgent: '기본 Agent', responseAgent: '응답 Agent',
    factTitle: '작업 사실 분류', factLabels: { verified: '확인됨', inferred: '추론', recommended: '권장', unknown: '알 수 없음' }, factEmpty: '없음', factTestId: 'orchestrator-fact-classification',
    planTitle: '구조화된 실행 계획', planListKeys, planTestId: 'orchestrator-execution-plan',
    planLabels: { objective: '목표', currentState: '현재 상태', tasks: '작업', priority: '우선순위', dependencies: '의존성', blockers: '차단 요소', milestones: '마일스톤', risks: '위험', acceptanceCriteria: '승인 기준', nextActions: '다음 행동', crossModulePlan: '모듈 간 proposed plan', verificationStatus: '검증 상태' },
    actionDraft: { title: 'Action Center 작업 초안', notice: '이 작업은 외부 Action Center에 초안을 작성합니다. 작업을 시작하거나 누구에게도 알리지 않으며 후속 작업을 실행하지 않습니다.', adminRequired: '초안을 미리 보거나 만들려면 관리자 승인이 필요합니다.', actorId: '관리자 ID', accessCode: '접근 코드', signIn: '관리자 확인', signOut: '로그아웃', adminSession: '관리자 session', authFailed: '승인 실패', createPreview: '작업 초안 만들기', previewTitle: '쓰기 미리보기', previewing: '서버에서 쓰기 미리보기를 생성하고 있습니다…', confirm: '작업 초안 생성 확인', cancel: '취소하고 초안 만들지 않기', executing: 'Action Center 초안을 만들고 있습니다…', succeeded: '작업 초안 생성 성공, record ID', failed: '작업 초안 생성 실패', cancelled: '취소되었습니다. 초안이 생성되지 않았습니다.', expiresAt: '확인 만료', rollback: '롤백 지원', yes: '예', no: '아니요', replayed: '이전 성공 결과를 반환했으며 중복 생성하지 않았습니다' },
  },
  en: {
    title: orchestrator.name, intro: 'Organize tasks, priorities, dependencies, and blockers from public Action Center data into read-only proposed execution plans.',
    inputLabel: 'Enter a goal or action need to organize, prioritize, or plan', placeholder: 'Example: Prioritize the current projects and create milestones and next actions.',
    submit: 'Submit', stop: 'Cancel', clear: 'Clear chat', suggestions: ['Which public actions are available?', 'Prioritize the Action Center items.', 'Find current blockers and dependencies.', 'Create a cross-module proposed execution plan.'],
    generating: 'Orchestrator is using the Action tools to organize public tasks and an execution plan…',
    disabled: 'Orchestrator AI answers are currently disabled. Public Action Center sources are still available.', modelUnavailable: 'Orchestrator AI answers are temporarily unavailable. Relevant public Action Center sources are still shown below.',
    toolUnavailable: 'Orchestrator’s Action tools cannot read public data right now. Please try again later.', forcedSourcesOnly: 'Results are currently provided in public Action Center source mode.',
    rateLimited: (seconds) => `Please wait ${seconds} seconds before asking again.`, noSources: 'The currently public Action Center data does not contain enough information to answer this request.', moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Orchestrator analyzes only public Action Center data. It cannot create or update tasks, notify, schedule, deploy, or automatically call another Agent. Cross-module content is always a proposed plan.',
    partial: 'Some public Action Center sources are temporarily unavailable.', sourcesOnly: 'Relevant public Action Center sources are still shown below.',
    source: 'Source', type: 'Type', updatedAt: 'Updated At', viewSource: 'View source', openExternal: 'Open validated public link', citationLabel: (sourceId) => `Jump to source ${sourceId}`,
    userLabel: 'You', assistantLabel: orchestrator.answerLabel, currentModule: 'Current module', defaultAgent: 'Default Agent', responseAgent: 'Response Agent',
    factTitle: 'Task fact classification', factLabels: { verified: 'Verified', inferred: 'Inferred', recommended: 'Recommended', unknown: 'Unknown' }, factEmpty: 'None', factTestId: 'orchestrator-fact-classification',
    planTitle: 'Structured execution plan', planListKeys, planTestId: 'orchestrator-execution-plan',
    planLabels: { objective: 'Objective', currentState: 'Current state', tasks: 'Tasks', priority: 'Priority', dependencies: 'Dependencies', blockers: 'Blockers', milestones: 'Milestones', risks: 'Risks', acceptanceCriteria: 'Acceptance criteria', nextActions: 'Next actions', crossModulePlan: 'Cross-module proposed plan', verificationStatus: 'Verification status' },
    actionDraft: { title: 'Action Center task draft', notice: 'This writes one external Action Center draft. It will not start work, notify anyone, or execute follow-up actions.', adminRequired: 'Admin authorization is required to preview or create a draft.', actorId: 'Admin ID', accessCode: 'Access code', signIn: 'Verify admin', signOut: 'Sign out', adminSession: 'Admin session', authFailed: 'Authorization failed', createPreview: 'Create task draft', previewTitle: 'Write preview', previewing: 'The server is preparing the write preview…', confirm: 'Confirm action draft creation', cancel: 'Cancel without creating draft', executing: 'Creating the Action Center draft…', succeeded: 'Task draft created, record ID', failed: 'Task draft creation failed', cancelled: 'Cancelled. No draft was created.', expiresAt: 'Confirmation expires', rollback: 'Rollback supported', yes: 'Yes', no: 'No', replayed: 'Prior successful result returned; no duplicate created' },
  },
});

export function getOrchestratorDetailItem(lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const localized = getAgentLocale(orchestrator, locale);
  return { id: 'nexaeon-orchestrator', category: localized.moduleLabel, status: 'MVP Active', moduleLabel: 'NexAeon Agent System', title: orchestrator.name };
}
