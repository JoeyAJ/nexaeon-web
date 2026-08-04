import { useEffect, useMemo, useState } from 'react';

const COPY = Object.freeze({
  zh: {
    title: 'Xchange Draft Execution', intro: '先建立受控預覽，只有管理員明確確認後才會在 Learning Coaching 建立一筆私有草稿。',
    type: '草稿類型', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '標題',
    summary: '摘要／子主題', instructions: '活動指引', duration: '時間（分鐘）', difficulty: '難度', targetAudience: '目標受眾', format: '形式',
    language: '內容語言', tags: '標籤（以逗號分隔）', actor: '管理員 ID', code: '存取碼', signIn: '驗證管理員',
    signOut: '登出', adminRequired: '需要管理員登入才能建立正式 Preview Audit。', preview: '建立 Preview', previewing: '正在驗證並建立 Preview Audit……',
    previewTitle: '結構化 Preview', target: '目標資料來源', permission: '寫入權限', expires: 'Preview 期限', writes: '預估 writes',
    warning: '警告', status: '安全狀態', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '尚未寫入', confirmNeeded: '需要管理員確認',
    confirmLabel: '我確認這將在 Learning Coaching 建立一筆 Private Draft', execute: '確認建立草稿', executing: '正在建立私有草稿……', created: '草稿建立成功', createdButton: '已建立', expired: 'Preview 已過期，請重新建立', notPublished: '此內容尚未公開', failed: '操作失敗', adminSession: '管理員 session', draftTypeLabel: '草稿類型', createdAt: '建立時間', recordId: 'Notion page ID',
    propertiesTitle: 'Draft Properties', contentTitle: 'Draft Page Content', qualityTitle: '品質檢查', quality: '品質狀態', durationTotal: '時間總和', bodyBlocks: '預計 Notion blocks', schema: '正文 schema', draftSafety: '此頁會以 Draft／非公開狀態建立，且不會自動發布。',
    requirementsTitle: '抽取需求', constraintsTitle: '保留條件', relevance: '主題相關性', overlap: 'Prompt 重疊率', qualityReasons: '判定理由',
    revisionTitle: 'Draft 修訂', editField: '編輯指定欄位', editSection: '修改指定區段', regenerateSection: '重新生成本區段', regenerateAll: '重新生成全部', targetPath: '修改目標', editInstruction: '修改要求', replacement: '替代值（區段請使用 JSON）', applyRevision: '套用修改', cancelRevision: '取消修改', revising: '正在建立新的修訂 Preview……', changeSummary: '變更摘要', before: '修改前', after: '修改後', changed: '修改區段', preserved: '未修改區段', automatic: '自動連帶調整區段', regenerated: '重新生成區段', qualityChange: '品質狀態變化', blockChange: 'Block 數量變化', timeChange: '時間變化', executable: '新 Preview 可執行', revision: 'Preview 版本', yes: '是', no: '否',
  },
  ko: {
    title: 'Xchange Draft Execution', intro: '통제된 Preview를 만든 뒤 관리자가 명시적으로 확인한 경우에만 Learning Coaching에 비공개 초안을 하나 만듭니다.',
    type: '초안 유형', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '제목',
    summary: '요약／하위 주제', instructions: '활동 지침', duration: '시간(분)', difficulty: '난이도', targetAudience: '대상 학습자', format: '형식',
    language: '콘텐츠 언어', tags: '태그(쉼표로 구분)', actor: '관리자 ID', code: '접근 코드', signIn: '관리자 확인',
    signOut: '로그아웃', adminRequired: '정식 Preview Audit을 만들려면 관리자 로그인이 필요합니다.', preview: 'Preview 만들기', previewing: '검증 및 Preview Audit 생성 중…',
    previewTitle: '구조화된 Preview', target: '대상 데이터 소스', permission: '쓰기 권한', expires: 'Preview 만료', writes: '예상 writes',
    warning: '경고', status: '안전 상태', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '아직 쓰지 않음', confirmNeeded: '관리자 확인 필요',
    confirmLabel: 'Learning Coaching에 Private Draft 한 건을 만드는 것에 동의합니다', execute: '초안 생성 확인', executing: '비공개 초안을 만드는 중…', created: '초안 생성 성공', createdButton: '생성됨', expired: 'Preview가 만료되었습니다. 다시 만들어 주세요', notPublished: '이 콘텐츠는 아직 공개되지 않았습니다', failed: '작업 실패', adminSession: '관리자 session', draftTypeLabel: '초안 유형', createdAt: '생성 시간', recordId: 'Notion page ID',
    propertiesTitle: 'Draft Properties', contentTitle: 'Draft Page Content', qualityTitle: '품질 검사', quality: '품질 상태', durationTotal: '시간 합계', bodyBlocks: '예상 Notion blocks', schema: '본문 schema', draftSafety: '이 페이지는 Draft/비공개로 생성되며 자동 게시되지 않습니다.',
    requirementsTitle: '추출된 요구사항', constraintsTitle: '보존된 조건', relevance: '주제 관련성', overlap: 'Prompt 중복률', qualityReasons: '판정 이유',
    revisionTitle: '초안 수정', editField: '필드 편집', editSection: '섹션 편집', regenerateSection: '이 섹션 다시 생성', regenerateAll: '전체 다시 생성', targetPath: '수정 대상', editInstruction: '수정 지시', replacement: '대체 값(섹션은 JSON)', applyRevision: '수정 적용', cancelRevision: '수정 취소', revising: '새 수정 Preview 생성 중…', changeSummary: '변경 요약', before: '변경 전', after: '변경 후', changed: '변경된 경로', preserved: '보존된 경로', automatic: '자동 조정 경로', regenerated: '재생성 경로', qualityChange: '품질 상태 변화', blockChange: 'Block 수 변화', timeChange: '시간 변화', executable: '새 Preview 실행 가능', revision: 'Preview 버전', yes: '예', no: '아니요',
  },
  en: {
    title: 'Xchange Draft Execution', intro: 'Create a controlled preview first. One private Learning Coaching draft is written only after explicit administrator confirmation.',
    type: 'Draft type', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: 'Title',
    summary: 'Summary / subtopic', instructions: 'Activity instructions', duration: 'Duration (minutes)', difficulty: 'Difficulty', targetAudience: 'Target audience', format: 'Format',
    language: 'Content language', tags: 'Tags (comma separated)', actor: 'Admin ID', code: 'Access code', signIn: 'Verify admin',
    signOut: 'Sign out', adminRequired: 'Admin sign-in is required to create the formal Preview Audit.', preview: 'Create Preview', previewing: 'Validating and creating the Preview Audit…',
    previewTitle: 'Structured Preview', target: 'Target data source', permission: 'Write permission', expires: 'Preview expiry', writes: 'Estimated writes',
    warning: 'Warning', status: 'Safety status', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: 'Not written', confirmNeeded: 'Admin confirmation required',
    confirmLabel: 'I confirm this will create one Private Draft in Learning Coaching', execute: 'Confirm draft creation', executing: 'Creating the private draft…', created: 'Draft created successfully', createdButton: 'Created', expired: 'Preview expired. Please create a new one', notPublished: 'This content is not published', failed: 'Operation failed', adminSession: 'Admin session', draftTypeLabel: 'Draft type', createdAt: 'Created at', recordId: 'Notion page ID',
    propertiesTitle: 'Draft Properties', contentTitle: 'Draft Page Content', qualityTitle: 'Quality checks', quality: 'Quality status', durationTotal: 'Duration total', bodyBlocks: 'Estimated Notion blocks', schema: 'Content schema', draftSafety: 'This page will be created as a non-public Draft and will not be published automatically.',
    requirementsTitle: 'Extracted requirements', constraintsTitle: 'Preserved constraints', relevance: 'Topic relevance', overlap: 'Prompt overlap', qualityReasons: 'Quality reasons',
    revisionTitle: 'Draft revision', editField: 'Edit field', editSection: 'Edit section', regenerateSection: 'Regenerate section', regenerateAll: 'Regenerate all', targetPath: 'Target path', editInstruction: 'Edit instruction', replacement: 'Replacement value (use JSON for sections)', applyRevision: 'Apply revision', cancelRevision: 'Cancel revision', revising: 'Creating a new revision Preview…', changeSummary: 'Change summary', before: 'Before', after: 'After', changed: 'Changed paths', preserved: 'Preserved paths', automatic: 'Auto-adjusted paths', regenerated: 'Regenerated paths', qualityChange: 'Quality status change', blockChange: 'Block count change', timeChange: 'Timing change', executable: 'New Preview executable', revision: 'Preview version', yes: 'Yes', no: 'No',
  },
});

const EMPTY_AUTH = { phase: 'loading', actorId: '', csrfToken: '', errorCode: '' };
const COURSE_FIELDS = ['title', 'targetAudience', 'durationMinutes', 'difficulty', 'format', 'language', 'teachingCategory', 'tags'];
const ACTIVITY_FIELDS = ['activityTitle', 'targetAudience', 'estimatedTimeMinutes', 'difficulty', 'language', 'tags'];
const COURSE_SECTIONS = ['overview', 'learningObjectives', 'learningOutcomes', 'sessionPlan', 'coreContent', 'activities', 'discussionQuestions', 'assessment', 'resources', 'risksAndNotes', 'extension'];
const ACTIVITY_SECTIONS = ['overview', 'learningOutcomes', 'materials', 'preparation', 'steps', 'teacherScript', 'discussionQuestions', 'expectedOutput', 'assessmentCriteria', 'differentiation', 'closing'];
const EMPTY_REVISION = { open: false, editMode: 'edit_field', targetPath: 'title', instruction: '', replacementText: '', replacementDirty: false };

const ERROR_COPY = Object.freeze({
  zh: {
    AUTH_REQUIRED: '需要管理員登入', AUTH_SESSION_EXPIRED: '管理員 session 已過期', AUTH_ROLE_FORBIDDEN: '此帳號沒有管理員權限', CSRF_INVALID: '安全驗證已失效，請重新登入', ORIGIN_NOT_ALLOWED: '此來源不允許執行寫入', OPERATION_NOT_FOUND: '找不到 Operation', PREVIEW_NOT_FOUND: '找不到有效 Preview', PREVIEW_EXPIRED: 'Preview 已過期，請重新建立', PREVIEW_ALREADY_EXECUTED: '此 Preview 已執行，不能再次使用', CONFIRMATION_REQUIRED: '請先勾選明確確認', CONFIRMATION_INVALID: '確認憑證無效', CONFIRMATION_MISMATCH: '表單或 Preview 已改變，請重新建立 Preview', CONFIRMATION_REQUESTER_MISMATCH: '此 Preview 不屬於目前的管理員 session', TOOL_NOT_ALLOWED: '此工具不允許寫入', DATA_SOURCE_NOT_ALLOWED: '目標資料來源不允許寫入', MASS_ASSIGNMENT_REJECTED: '請求包含不允許的欄位', CONTENT_VALIDATION_FAILED: '修訂後品質未通過，不能執行', INVALID_EDIT_MODE: '修訂模式無效', EDIT_TARGET_NOT_ALLOWED: '此欄位或區段不可修改', REPLACEMENT_REQUIRED: '請輸入替代值', INSTRUCTION_REQUIRED: '請輸入修改要求', NO_EFFECTIVE_CHANGE: '修改沒有產生有效差異，未建立新 Preview', SCHEMA_MISMATCH: 'Learning Coaching schema 不符合安全寫入合約', NOTION_CONFIGURATION_MISSING: 'Notion 寫入設定未完成', NOTION_REQUEST_FAILED: 'Notion 建立草稿失敗', NOTION_INVALID_RESPONSE: 'Notion 回應無效', AUDIT_PERSISTENCE_FAILED: 'Audit 無法保存，已停止寫入', EXECUTION_IN_PROGRESS: '此草稿正在建立，請勿重複送出',
  },
  ko: {
    AUTH_REQUIRED: '관리자 로그인이 필요합니다', AUTH_SESSION_EXPIRED: '관리자 session이 만료되었습니다', AUTH_ROLE_FORBIDDEN: '관리자 권한이 없습니다', CSRF_INVALID: '보안 확인이 만료되었습니다. 다시 로그인해 주세요', ORIGIN_NOT_ALLOWED: '이 출처에서는 쓰기를 실행할 수 없습니다', OPERATION_NOT_FOUND: 'Operation을 찾을 수 없습니다', PREVIEW_NOT_FOUND: '유효한 Preview를 찾을 수 없습니다', PREVIEW_EXPIRED: 'Preview가 만료되었습니다. 다시 만들어 주세요', PREVIEW_ALREADY_EXECUTED: '이미 실행된 Preview입니다', CONFIRMATION_REQUIRED: '명시적 확인란을 선택해 주세요', CONFIRMATION_INVALID: '확인 토큰이 유효하지 않습니다', CONFIRMATION_MISMATCH: '양식 또는 Preview가 변경되었습니다. Preview를 다시 만들어 주세요', CONFIRMATION_REQUESTER_MISMATCH: '현재 관리자 session의 Preview가 아닙니다', TOOL_NOT_ALLOWED: '이 도구는 쓰기가 허용되지 않습니다', DATA_SOURCE_NOT_ALLOWED: '대상 데이터 소스에 쓸 수 없습니다', MASS_ASSIGNMENT_REJECTED: '허용되지 않은 필드가 포함되어 있습니다', CONTENT_VALIDATION_FAILED: '수정 후 품질 검사를 통과하지 못해 실행할 수 없습니다', INVALID_EDIT_MODE: '수정 모드가 유효하지 않습니다', EDIT_TARGET_NOT_ALLOWED: '이 필드 또는 섹션은 수정할 수 없습니다', REPLACEMENT_REQUIRED: '대체 값을 입력하세요', INSTRUCTION_REQUIRED: '수정 지시를 입력하세요', NO_EFFECTIVE_CHANGE: '수정 결과에 유효한 차이가 없어 새 Preview를 만들지 않았습니다', SCHEMA_MISMATCH: 'Learning Coaching schema가 안전 쓰기 계약과 일치하지 않습니다', NOTION_CONFIGURATION_MISSING: 'Notion 쓰기 설정이 완료되지 않았습니다', NOTION_REQUEST_FAILED: 'Notion 초안 생성에 실패했습니다', NOTION_INVALID_RESPONSE: 'Notion 응답이 유효하지 않습니다', AUDIT_PERSISTENCE_FAILED: 'Audit을 저장할 수 없어 쓰기를 중단했습니다', EXECUTION_IN_PROGRESS: '이 초안을 생성 중입니다. 다시 제출하지 마세요',
  },
  en: {
    AUTH_REQUIRED: 'Administrator sign-in is required', AUTH_SESSION_EXPIRED: 'The administrator session expired', AUTH_ROLE_FORBIDDEN: 'This account is not an administrator', CSRF_INVALID: 'The security check expired; please sign in again', ORIGIN_NOT_ALLOWED: 'Writes are not allowed from this origin', OPERATION_NOT_FOUND: 'The operation was not found', PREVIEW_NOT_FOUND: 'No valid preview was found', PREVIEW_EXPIRED: 'The preview expired; create a new preview', PREVIEW_ALREADY_EXECUTED: 'This preview has already been executed', CONFIRMATION_REQUIRED: 'Select the explicit confirmation checkbox', CONFIRMATION_INVALID: 'The confirmation token is invalid', CONFIRMATION_MISMATCH: 'The form or preview changed; create a new preview', CONFIRMATION_REQUESTER_MISMATCH: 'This preview belongs to a different administrator session', TOOL_NOT_ALLOWED: 'This tool is not allowed to write', DATA_SOURCE_NOT_ALLOWED: 'This target data source is not allowed', MASS_ASSIGNMENT_REJECTED: 'The request contains a forbidden field', CONTENT_VALIDATION_FAILED: 'The revised content did not pass quality validation and cannot execute', INVALID_EDIT_MODE: 'The revision mode is invalid', EDIT_TARGET_NOT_ALLOWED: 'This field or section cannot be edited', REPLACEMENT_REQUIRED: 'Enter a replacement value', INSTRUCTION_REQUIRED: 'Enter an edit instruction', NO_EFFECTIVE_CHANGE: 'The edit made no effective change, so no new Preview was created', SCHEMA_MISMATCH: 'The Learning Coaching schema does not match the safe write contract', NOTION_CONFIGURATION_MISSING: 'Notion write configuration is incomplete', NOTION_REQUEST_FAILED: 'Notion could not create the draft', NOTION_INVALID_RESPONSE: 'Notion returned an invalid response', AUDIT_PERSISTENCE_FAILED: 'Audit could not be saved, so the write was stopped', EXECUTION_IN_PROGRESS: 'This draft is already being created; do not submit again',
  },
});

function errorText(lang, code) {
  return ERROR_COPY[lang]?.[code] || ERROR_COPY.en[code] || String(code || 'REQUEST_FAILED');
}

function tags(value) {
  return String(value || '').split(/[,，、]/u).map((item) => item.trim()).filter(Boolean);
}

function label(value) {
  return String(value).replace(/([a-z])([A-Z])/gu, '$1 $2').replace(/^./u, (character) => character.toUpperCase());
}

function ContentValue({ value }) {
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={`${index}-${typeof item === 'string' ? item : ''}`}>{typeof item === 'object' ? <ContentValue value={item} /> : String(item)}</li>)}</ul>;
  if (value && typeof value === 'object') return <div className="xchange-content-fields">{Object.entries(value).map(([key, item]) => <div key={key}><strong>{label(key)}</strong><ContentValue value={item} /></div>)}</div>;
  return <p>{String(value ?? '')}</p>;
}

export default function XchangeDraftPreviewPanel({ lang }) {
  const copy = COPY[lang] || COPY.en;
  const [draftType, setDraftType] = useState('course');
  const [form, setForm] = useState({ title: '', detail: '', audience: 'University students', format: 'Workshop', duration: '90', difficulty: 'Beginner', contentLanguage: lang, tags: '' });
  const [auth, setAuth] = useState(EMPTY_AUTH);
  const [credentials, setCredentials] = useState({ actorId: '', accessSecret: '' });
  const [state, setState] = useState({ phase: 'idle', preview: null, result: null, errorCode: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [revision, setRevision] = useState(EMPTY_REVISION);
  const [clock, setClock] = useState(Date.now());

  const revisionTargets = useMemo(() => {
    if (revision.editMode === 'regenerate_all') return [];
    if (revision.editMode === 'edit_field') return draftType === 'course' ? COURSE_FIELDS : ACTIVITY_FIELDS;
    return draftType === 'course' ? COURSE_SECTIONS : ACTIVITY_SECTIONS;
  }, [draftType, revision.editMode]);

  useEffect(() => {
    if (!state.preview || state.phase !== 'previewed') return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.phase, state.preview]);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!active) return;
        setAuth(response.ok
          ? { phase: 'authenticated', actorId: payload.actorId, csrfToken: payload.csrfToken, errorCode: '' }
          : { phase: 'anonymous', actorId: '', csrfToken: '', errorCode: payload.errorCode || '' });
      })
      .catch(() => { if (active) setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: 'AUTH_UNAVAILABLE' }); });
    return () => { active = false; };
  }, []);

  const payload = useMemo(() => {
    const shared = {
      difficulty: form.difficulty,
      language: [form.contentLanguage],
      targetAudience: [form.audience],
      tags: tags(form.tags),
    };
    if (draftType === 'course') return {
      title: form.title,
      summary: form.detail,
      teachingCategory: 'Course',
      format: [form.format],
      durationMinutes: Number(form.duration),
      ...shared,
    };
    return {
      activityTitle: form.title,
      activityType: 'Learning Activity',
      instructions: form.detail,
      estimatedTimeMinutes: Number(form.duration),
      ...shared,
    };
  }, [draftType, form]);

  async function parse(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      throw Object.assign(new Error(`HTTP_${response.status}`), { code: `HTTP_${response.status}` });
    }
    if (!response.ok) throw Object.assign(new Error(data.errorCode || 'REQUEST_FAILED'), { code: data.errorCode || 'REQUEST_FAILED' });
    return data;
  }

  async function login(event) {
    event.preventDefault();
    setAuth((current) => ({ ...current, phase: 'authenticating', errorCode: '' }));
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await parse(response);
      setCredentials((current) => ({ ...current, accessSecret: '' }));
      setAuth({ phase: 'authenticated', actorId: data.actorId, csrfToken: data.csrfToken, errorCode: '' });
    } catch (error) {
      setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: error.code || 'AUTH_FAILED' });
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-NexAeon-CSRF': auth.csrfToken }, body: '{}',
      });
      await parse(response);
      setAuth(EMPTY_AUTH);
      setState({ phase: 'idle', preview: null, result: null, errorCode: '' });
      setConfirmed(false);
      setRevision(EMPTY_REVISION);
      setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: '' });
    } catch (error) {
      setAuth((current) => ({ ...current, errorCode: error.code || 'LOGOUT_FAILED' }));
    }
  }

  async function createPreview(event) {
    event.preventDefault();
    setConfirmed(false);
    setRevision(EMPTY_REVISION);
    setState({ phase: 'previewing', preview: null, result: null, errorCode: '' });
    try {
      const response = await fetch('/api/agent/xchange/actions/preview', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexAeon-CSRF': auth.csrfToken },
        body: JSON.stringify({
          agentId: 'xchange',
          toolId: draftType === 'course' ? 'createCourseDraft' : 'createLearningActivityDraft',
          actionType: 'create',
          targetDataSource: 'notion-teaching-materials',
          draftType,
          language: lang,
          payload,
          contractVersion: 'v1',
          schemaVersion: 'v1',
        }),
      });
      setState({ phase: 'previewed', preview: await parse(response), result: null, errorCode: '' });
    } catch (error) {
      setState({ phase: 'failed', preview: null, result: null, errorCode: error.code || 'PREVIEW_FAILED' });
    }
  }

  function invalidatePreview(update) {
    update();
    if (state.preview && state.phase !== 'succeeded') setState({ phase: 'idle', preview: null, result: null, errorCode: '' });
    setConfirmed(false);
    setRevision(EMPTY_REVISION);
  }

  const previewExpired = Boolean(state.preview && new Date(state.preview.previewExpiresAt).getTime() <= clock);

  function beginRevision(editMode) {
    if (!state.preview || state.phase !== 'previewed') return;
    const fields = draftType === 'course' ? COURSE_FIELDS : ACTIVITY_FIELDS;
    const sections = draftType === 'course' ? COURSE_SECTIONS : ACTIVITY_SECTIONS;
    const targetPath = editMode === 'regenerate_all' ? '' : editMode === 'edit_field' ? fields[0] : sections[0];
    const currentValue = editMode === 'edit_field' ? state.preview.normalizedPayload?.[targetPath] : state.preview.contentPreview?.[targetPath];
    setConfirmed(false);
    setState((current) => ({ ...current, errorCode: '' }));
    setRevision({ open: true, editMode, targetPath, instruction: '', replacementText: editMode.startsWith('edit_') ? JSON.stringify(currentValue, null, 2) : '', replacementDirty: false });
  }

  function updateRevisionMode(editMode) {
    beginRevision(editMode);
  }

  function updateRevisionTarget(targetPath) {
    const currentValue = revision.editMode === 'edit_field' ? state.preview?.normalizedPayload?.[targetPath] : state.preview?.contentPreview?.[targetPath];
    setRevision((current) => ({ ...current, targetPath, replacementText: current.editMode.startsWith('edit_') ? JSON.stringify(currentValue, null, 2) : '', replacementDirty: false }));
  }

  function replacementValue() {
    if (!revision.editMode.startsWith('edit_')) return undefined;
    if (revision.editMode === 'edit_section' && !revision.replacementDirty) return undefined;
    const trimmed = revision.replacementText.trim();
    if (!trimmed && revision.editMode === 'edit_section') return undefined;
    if (revision.editMode === 'edit_section' || ['targetAudience', 'format', 'language', 'tags'].includes(revision.targetPath)) return JSON.parse(revision.replacementText);
    if (['durationMinutes', 'estimatedTimeMinutes'].includes(revision.targetPath)) return Number(revision.replacementText);
    if (trimmed.startsWith('"')) return JSON.parse(trimmed);
    return trimmed;
  }

  async function applyRevision(event) {
    event.preventDefault();
    if (!state.preview || !revision.open || state.phase !== 'previewed') return;
    const source = state.preview;
    setConfirmed(false);
    setState((current) => ({ ...current, phase: 'revising', errorCode: '' }));
    try {
      const response = await fetch('/api/agent/xchange/actions/revise', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexAeon-CSRF': auth.csrfToken },
        body: JSON.stringify({
          sourceOperationId: source.operationId, sourcePreviewHash: source.previewHash,
          editMode: revision.editMode, targetPath: revision.targetPath,
          instruction: revision.instruction, replacementValue: replacementValue(), preserveOtherSections: true,
          contractVersion: 'v1', contentSchemaVersion: source.contentSchemaVersion,
        }),
      });
      const nextPreview = await parse(response);
      setState({ phase: 'previewed', preview: nextPreview, result: null, errorCode: '' });
      setRevision(EMPTY_REVISION);
    } catch (error) {
      setState({ phase: 'previewed', preview: source, result: null, errorCode: error.code || 'REVISION_FAILED' });
    }
  }

  async function executeDraft() {
    if (!state.preview || !state.preview.canExecute || revision.open || !confirmed || previewExpired || state.phase !== 'previewed') return;
    const preview = state.preview;
    setState((current) => ({ ...current, phase: 'executing', errorCode: '' }));
    try {
      const response = await fetch('/api/agent/xchange/actions/execute', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexAeon-CSRF': auth.csrfToken },
        body: JSON.stringify({
          operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId,
          targetDataSource: preview.targetDataSource, draftType: preview.draftType, language: preview.language,
          payload: preview.normalizedPayload, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey,
          confirmationToken: preview.confirmationToken, confirm: true,
          contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion,
        }),
      });
      const result = await parse(response);
      setState({ phase: 'succeeded', preview, result, errorCode: '' });
    } catch (error) {
      setState({ phase: 'failed', preview, result: null, errorCode: error.code || 'EXECUTION_FAILED' });
    }
  }

  return (
    <section className="xchange-draft-preview-panel" data-testid="xchange-draft-preview-panel" data-phase={state.phase}>
      <div className="xchange-preview-heading"><div><span className="content-tag">Stage 5-3E-D · Draft revision</span><h2>{copy.title}</h2><p>{copy.intro}</p></div></div>
      {auth.phase !== 'authenticated' ? (
        <form className="agent-admin-auth" onSubmit={login} data-testid="xchange-admin-login">
          <strong>{copy.adminRequired}</strong>
          <label>{copy.actor}<input value={credentials.actorId} onChange={(event) => setCredentials((current) => ({ ...current, actorId: event.target.value }))} autoComplete="username" required /></label>
          <label>{copy.code}<input type="password" value={credentials.accessSecret} onChange={(event) => setCredentials((current) => ({ ...current, accessSecret: event.target.value }))} autoComplete="current-password" required /></label>
          <button className="mvp-action-button" type="submit" disabled={auth.phase === 'loading' || auth.phase === 'authenticating'}>{copy.signIn}</button>
          {auth.errorCode ? <p className="agent-state-message" data-state="failed">{copy.failed}: {errorText(lang, auth.errorCode)} ({auth.errorCode})</p> : null}
        </form>
      ) : (
        <div className="agent-admin-session"><span>{copy.adminSession}: {auth.actorId}</span><button type="button" onClick={logout}>{copy.signOut}</button></div>
      )}
      <form className="xchange-preview-form" onSubmit={createPreview}>
        <label>{copy.type}<select value={draftType} onChange={(event) => invalidatePreview(() => setDraftType(event.target.value))}><option value="course">{copy.course}</option><option value="learning_activity">{copy.activity}</option></select></label>
        <label>{copy.draftTitle}<input value={form.title} maxLength={320} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, title: event.target.value })))} required /></label>
        <label className="xchange-preview-wide">{draftType === 'course' ? copy.summary : copy.instructions}<textarea value={form.detail} maxLength={4000} rows={5} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, detail: event.target.value })))} required /></label>
        <label>{copy.targetAudience}<input value={form.audience} maxLength={180} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, audience: event.target.value })))} required /></label>
        {draftType === 'course' ? <label>{copy.format}<select value={form.format} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, format: event.target.value })))}><option>Workshop</option><option>Course</option><option>Slides</option></select></label> : null}
        <label>{copy.duration}<input type="number" min="1" max="10080" value={form.duration} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, duration: event.target.value })))} required /></label>
        <label>{copy.difficulty}<select value={form.difficulty} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, difficulty: event.target.value })))}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label>{copy.language}<select value={form.contentLanguage} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, contentLanguage: event.target.value })))}><option value="zh">繁體中文</option><option value="ko">한국어</option><option value="en">English</option></select></label>
        <label>{copy.tags}<input value={form.tags} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, tags: event.target.value })))} /></label>
        <button className="mvp-action-button xchange-preview-submit" type="submit" disabled={auth.phase !== 'authenticated' || state.phase === 'previewing'}>{copy.preview}</button>
      </form>
      {state.phase === 'previewing' ? <p className="agent-state-message">{copy.previewing}</p> : null}
      {state.phase === 'revising' ? <p className="agent-state-message">{copy.revising}</p> : null}
      {state.phase === 'executing' ? <p className="agent-state-message">{copy.executing}</p> : null}
      {state.errorCode ? <p className="agent-state-message" data-state="failed" data-testid="xchange-preview-failure">{copy.failed}: {errorText(lang, state.errorCode)} ({state.errorCode})</p> : null}
      {state.preview ? (
        <div className="agent-action-preview xchange-structured-preview" data-testid="xchange-structured-preview">
          <strong>{copy.previewTitle}</strong>
          <div className="xchange-preview-status"><span>{copy.previewOnly}</span><span>{copy.notWritten}</span><span>{copy.confirmNeeded}</span></div>
          <dl>
            <div><dt>{copy.target}</dt><dd>{state.preview.targetDataSource}</dd></div>
            <div><dt>{copy.draftTypeLabel}</dt><dd>{state.preview.draftType}</dd></div>
            <div><dt>{copy.status}</dt><dd>Draft · Private · Published=false</dd></div>
            <div><dt>{copy.operation}</dt><dd>{state.preview.operationId}</dd></div>
            <div><dt>{copy.expires}</dt><dd>{state.preview.previewExpiresAt}</dd></div>
            <div><dt>{copy.permission}</dt><dd>{state.preview.permissionLevel}</dd></div>
            <div><dt>{copy.writes}</dt><dd>{state.preview.estimatedWrites} · performed {state.preview.writesPerformed}</dd></div>
            <div><dt>{copy.quality}</dt><dd>{state.preview.contentQuality?.status}</dd></div>
            <div><dt>{copy.durationTotal}</dt><dd>{state.preview.durationValidation?.actualMinutes} / {state.preview.durationValidation?.expectedMinutes} min · {state.preview.durationValidation?.valid ? 'valid' : 'invalid'}</dd></div>
            <div><dt>{copy.bodyBlocks}</dt><dd>{state.preview.estimatedBodyBlocks}</dd></div>
            <div><dt>{copy.schema}</dt><dd>{state.preview.contentSchemaVersion} · renderer {state.preview.rendererVersion}</dd></div>
            <div><dt>{copy.revision}</dt><dd>{state.preview.previewVersion || 1} · parent {state.preview.parentOperationId || '—'}</dd></div>
          </dl>
          <section className="xchange-preview-properties"><h3>{copy.propertiesTitle}</h3><dl>
            {Object.entries(state.preview.createPayloadPreview || {}).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}
          </dl></section>
          <section className="xchange-content-quality"><h3>{copy.requirementsTitle}</h3><ContentValue value={state.preview.extractedRequirements || {}} /></section>
          <section className="xchange-content-quality"><h3>{copy.constraintsTitle}</h3><ContentValue value={state.preview.preservedConstraints || {}} /></section>
          <section className="xchange-content-preview" data-testid="xchange-content-preview"><h3>{copy.contentTitle}</h3>{Object.entries(state.preview.contentPreview || {}).map(([section, value]) => <article key={section}><h4>{label(section)}</h4><ContentValue value={value} /></article>)}</section>
          <section className="xchange-content-quality"><h3>{copy.qualityTitle}</h3><p>{state.preview.contentQuality?.status}</p><dl><div><dt>{copy.relevance}</dt><dd>{Math.round((state.preview.contentQuality?.topicRelevance?.score || 0) * 100)}% · {state.preview.contentQuality?.topicRelevance?.valid ? 'valid' : 'invalid'}</dd></div><div><dt>{copy.overlap}</dt><dd>{Math.round((state.preview.contentQuality?.promptOverlap?.ratio || 0) * 100)}% · {state.preview.contentQuality?.promptOverlap?.valid ? 'valid' : 'invalid'}</dd></div></dl><strong>{copy.qualityReasons}</strong>{state.preview.contentQuality?.qualityReasons?.length ? <ul>{state.preview.contentQuality.qualityReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</section>
          {state.preview.changeSummary ? <section className="xchange-change-summary" data-testid="xchange-change-summary"><h3>{copy.changeSummary}</h3><dl><div><dt>{copy.changed}</dt><dd>{state.preview.changedPaths?.join(', ') || '—'}</dd></div><div><dt>{copy.preserved}</dt><dd>{state.preview.preservedPaths?.join(', ') || '—'}</dd></div><div><dt>{copy.automatic}</dt><dd>{state.preview.autoAdjustedPaths?.join(', ') || '—'}</dd></div><div><dt>{copy.regenerated}</dt><dd>{state.preview.regeneratedPaths?.join(', ') || '—'}</dd></div><div><dt>{copy.qualityChange}</dt><dd>{state.preview.changeSummary.qualityBefore} → {state.preview.changeSummary.qualityAfter}</dd></div><div><dt>{copy.blockChange}</dt><dd>{state.preview.changeSummary.estimatedBlocksBefore} → {state.preview.changeSummary.estimatedBlocksAfter}</dd></div><div><dt>{copy.timeChange}</dt><dd>{state.preview.changeSummary.durationBefore?.actualMinutes} → {state.preview.changeSummary.durationAfter?.actualMinutes} min</dd></div><div><dt>{copy.executable}</dt><dd>{state.preview.canExecute ? copy.yes : copy.no}</dd></div></dl><div className="xchange-change-values"><article><h4>{copy.before}</h4><ContentValue value={state.preview.changeSummary.before} /></article><article><h4>{copy.after}</h4><ContentValue value={state.preview.changeSummary.after} /></article></div></section> : null}
          {state.phase !== 'succeeded' ? <section className="xchange-revision-panel" data-testid="xchange-revision-panel"><h3>{copy.revisionTitle}</h3><div className="xchange-revision-actions"><button type="button" onClick={() => beginRevision('edit_field')} disabled={state.phase !== 'previewed'}>{copy.editField}</button><button type="button" onClick={() => beginRevision('edit_section')} disabled={state.phase !== 'previewed'}>{copy.editSection}</button><button type="button" onClick={() => beginRevision('regenerate_section')} disabled={state.phase !== 'previewed'}>{copy.regenerateSection}</button><button type="button" onClick={() => beginRevision('regenerate_all')} disabled={state.phase !== 'previewed'}>{copy.regenerateAll}</button></div>{revision.open ? <form className="xchange-revision-form" onSubmit={applyRevision}><label>{copy.revisionTitle}<select value={revision.editMode} onChange={(event) => updateRevisionMode(event.target.value)}><option value="edit_field">{copy.editField}</option><option value="edit_section">{copy.editSection}</option><option value="regenerate_section">{copy.regenerateSection}</option><option value="regenerate_all">{copy.regenerateAll}</option></select></label>{revisionTargets.length ? <label>{copy.targetPath}<select value={revision.targetPath} onChange={(event) => updateRevisionTarget(event.target.value)}>{revisionTargets.map((path) => <option key={path} value={path}>{label(path)}</option>)}</select></label> : null}<label className="xchange-preview-wide">{copy.editInstruction}<textarea rows={3} value={revision.instruction} onChange={(event) => setRevision((current) => ({ ...current, instruction: event.target.value }))} required={revision.editMode === 'edit_section'} /></label>{revision.editMode.startsWith('edit_') ? <label className="xchange-preview-wide">{copy.replacement}<textarea rows={6} value={revision.replacementText} onChange={(event) => setRevision((current) => ({ ...current, replacementText: event.target.value, replacementDirty: true }))} required={revision.editMode === 'edit_field'} /></label> : null}<div className="xchange-revision-submit"><button className="mvp-action-button" type="submit" disabled={state.phase !== 'previewed'}>{copy.applyRevision}</button><button type="button" onClick={() => setRevision(EMPTY_REVISION)}>{copy.cancelRevision}</button></div></form> : null}</section> : null}
          <p className="xchange-draft-safety">{copy.draftSafety}</p>
          {state.preview.warnings?.length ? <div className="xchange-preview-warnings"><strong>{copy.warning}</strong><ul>{state.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
          {state.phase !== 'succeeded' ? <div className="xchange-confirmation" data-testid="xchange-confirmation"><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!state.preview.canExecute || revision.open || previewExpired || state.phase !== 'previewed'} />{copy.confirmLabel}</label>{previewExpired ? <p data-state="failed">{copy.expired}</p> : null}<button className="mvp-action-button" type="button" onClick={executeDraft} disabled={auth.phase !== 'authenticated' || !state.preview.canExecute || revision.open || !confirmed || previewExpired || state.phase !== 'previewed'}>{copy.execute}</button></div> : null}
          {state.result ? <div className="xchange-execution-success" data-testid="xchange-execution-success"><strong>{copy.created}</strong><dl><div><dt>{copy.operation}</dt><dd>{state.result.operationId}</dd></div><div><dt>{copy.status}</dt><dd>Succeeded · Draft · Private · Published=false</dd></div><div><dt>{copy.writes}</dt><dd>1 · performed 1</dd></div><div><dt>{copy.createdAt}</dt><dd>{state.result.createdAt}</dd></div><div><dt>{copy.recordId}</dt><dd>{state.result.externalRecordId}</dd></div></dl><p>{copy.notPublished}</p><button className="mvp-action-button" type="button" disabled>{copy.createdButton}</button></div> : null}
        </div>
      ) : null}
    </section>
  );
}
