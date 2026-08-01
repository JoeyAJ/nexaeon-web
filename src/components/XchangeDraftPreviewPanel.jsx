import { useEffect, useMemo, useState } from 'react';

const COPY = Object.freeze({
  zh: {
    title: 'Xchange Draft Execution', intro: '先建立受控預覽，只有管理員明確確認後才會在 Learning Coaching 建立一筆私有草稿。',
    type: '草稿類型', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '標題',
    summary: '摘要／子主題', instructions: '活動指引', duration: '時間（分鐘）', difficulty: '難度',
    language: '內容語言', tags: '標籤（以逗號分隔）', actor: '管理員 ID', code: '存取碼', signIn: '驗證管理員',
    signOut: '登出', adminRequired: '需要管理員登入才能建立正式 Preview Audit。', preview: '建立 Preview', previewing: '正在驗證並建立 Preview Audit……',
    previewTitle: '結構化 Preview', target: '目標資料來源', permission: '寫入權限', expires: 'Preview 期限', writes: '預估 writes',
    warning: '警告', status: '安全狀態', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '尚未寫入', confirmNeeded: '需要管理員確認',
    confirmLabel: '我確認這將在 Learning Coaching 建立一筆 Private Draft', execute: '確認建立草稿', executing: '正在建立私有草稿……', created: '草稿建立成功', createdButton: '已建立', expired: 'Preview 已過期，請重新建立', notPublished: '此內容尚未公開', failed: '操作失敗', adminSession: '管理員 session', draftTypeLabel: '草稿類型', createdAt: '建立時間', recordId: 'Notion page ID',
  },
  ko: {
    title: 'Xchange Draft Execution', intro: '통제된 Preview를 만든 뒤 관리자가 명시적으로 확인한 경우에만 Learning Coaching에 비공개 초안을 하나 만듭니다.',
    type: '초안 유형', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '제목',
    summary: '요약／하위 주제', instructions: '활동 지침', duration: '시간(분)', difficulty: '난이도',
    language: '콘텐츠 언어', tags: '태그(쉼표로 구분)', actor: '관리자 ID', code: '접근 코드', signIn: '관리자 확인',
    signOut: '로그아웃', adminRequired: '정식 Preview Audit을 만들려면 관리자 로그인이 필요합니다.', preview: 'Preview 만들기', previewing: '검증 및 Preview Audit 생성 중…',
    previewTitle: '구조화된 Preview', target: '대상 데이터 소스', permission: '쓰기 권한', expires: 'Preview 만료', writes: '예상 writes',
    warning: '경고', status: '안전 상태', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '아직 쓰지 않음', confirmNeeded: '관리자 확인 필요',
    confirmLabel: 'Learning Coaching에 Private Draft 한 건을 만드는 것에 동의합니다', execute: '초안 생성 확인', executing: '비공개 초안을 만드는 중…', created: '초안 생성 성공', createdButton: '생성됨', expired: 'Preview가 만료되었습니다. 다시 만들어 주세요', notPublished: '이 콘텐츠는 아직 공개되지 않았습니다', failed: '작업 실패', adminSession: '관리자 session', draftTypeLabel: '초안 유형', createdAt: '생성 시간', recordId: 'Notion page ID',
  },
  en: {
    title: 'Xchange Draft Execution', intro: 'Create a controlled preview first. One private Learning Coaching draft is written only after explicit administrator confirmation.',
    type: 'Draft type', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: 'Title',
    summary: 'Summary / subtopic', instructions: 'Activity instructions', duration: 'Duration (minutes)', difficulty: 'Difficulty',
    language: 'Content language', tags: 'Tags (comma separated)', actor: 'Admin ID', code: 'Access code', signIn: 'Verify admin',
    signOut: 'Sign out', adminRequired: 'Admin sign-in is required to create the formal Preview Audit.', preview: 'Create Preview', previewing: 'Validating and creating the Preview Audit…',
    previewTitle: 'Structured Preview', target: 'Target data source', permission: 'Write permission', expires: 'Preview expiry', writes: 'Estimated writes',
    warning: 'Warning', status: 'Safety status', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: 'Not written', confirmNeeded: 'Admin confirmation required',
    confirmLabel: 'I confirm this will create one Private Draft in Learning Coaching', execute: 'Confirm draft creation', executing: 'Creating the private draft…', created: 'Draft created successfully', createdButton: 'Created', expired: 'Preview expired. Please create a new one', notPublished: 'This content is not published', failed: 'Operation failed', adminSession: 'Admin session', draftTypeLabel: 'Draft type', createdAt: 'Created at', recordId: 'Notion page ID',
  },
});

const EMPTY_AUTH = { phase: 'loading', actorId: '', csrfToken: '', errorCode: '' };

const ERROR_COPY = Object.freeze({
  zh: {
    AUTH_REQUIRED: '需要管理員登入', AUTH_SESSION_EXPIRED: '管理員 session 已過期', AUTH_ROLE_FORBIDDEN: '此帳號沒有管理員權限', CSRF_INVALID: '安全驗證已失效，請重新登入', ORIGIN_NOT_ALLOWED: '此來源不允許執行寫入', OPERATION_NOT_FOUND: '找不到 Operation', PREVIEW_NOT_FOUND: '找不到有效 Preview', PREVIEW_EXPIRED: 'Preview 已過期，請重新建立', PREVIEW_ALREADY_EXECUTED: '此 Preview 已執行，不能再次使用', CONFIRMATION_REQUIRED: '請先勾選明確確認', CONFIRMATION_INVALID: '確認憑證無效', CONFIRMATION_MISMATCH: '表單或 Preview 已改變，請重新建立 Preview', CONFIRMATION_REQUESTER_MISMATCH: '此 Preview 不屬於目前的管理員 session', TOOL_NOT_ALLOWED: '此工具不允許寫入', DATA_SOURCE_NOT_ALLOWED: '目標資料來源不允許寫入', MASS_ASSIGNMENT_REJECTED: '請求包含不允許的欄位', SCHEMA_MISMATCH: 'Learning Coaching schema 不符合安全寫入合約', NOTION_CONFIGURATION_MISSING: 'Notion 寫入設定未完成', NOTION_REQUEST_FAILED: 'Notion 建立草稿失敗', NOTION_INVALID_RESPONSE: 'Notion 回應無效', AUDIT_PERSISTENCE_FAILED: 'Audit 無法保存，已停止寫入', EXECUTION_IN_PROGRESS: '此草稿正在建立，請勿重複送出',
  },
  ko: {
    AUTH_REQUIRED: '관리자 로그인이 필요합니다', AUTH_SESSION_EXPIRED: '관리자 session이 만료되었습니다', AUTH_ROLE_FORBIDDEN: '관리자 권한이 없습니다', CSRF_INVALID: '보안 확인이 만료되었습니다. 다시 로그인해 주세요', ORIGIN_NOT_ALLOWED: '이 출처에서는 쓰기를 실행할 수 없습니다', OPERATION_NOT_FOUND: 'Operation을 찾을 수 없습니다', PREVIEW_NOT_FOUND: '유효한 Preview를 찾을 수 없습니다', PREVIEW_EXPIRED: 'Preview가 만료되었습니다. 다시 만들어 주세요', PREVIEW_ALREADY_EXECUTED: '이미 실행된 Preview입니다', CONFIRMATION_REQUIRED: '명시적 확인란을 선택해 주세요', CONFIRMATION_INVALID: '확인 토큰이 유효하지 않습니다', CONFIRMATION_MISMATCH: '양식 또는 Preview가 변경되었습니다. Preview를 다시 만들어 주세요', CONFIRMATION_REQUESTER_MISMATCH: '현재 관리자 session의 Preview가 아닙니다', TOOL_NOT_ALLOWED: '이 도구는 쓰기가 허용되지 않습니다', DATA_SOURCE_NOT_ALLOWED: '대상 데이터 소스에 쓸 수 없습니다', MASS_ASSIGNMENT_REJECTED: '허용되지 않은 필드가 포함되어 있습니다', SCHEMA_MISMATCH: 'Learning Coaching schema가 안전 쓰기 계약과 일치하지 않습니다', NOTION_CONFIGURATION_MISSING: 'Notion 쓰기 설정이 완료되지 않았습니다', NOTION_REQUEST_FAILED: 'Notion 초안 생성에 실패했습니다', NOTION_INVALID_RESPONSE: 'Notion 응답이 유효하지 않습니다', AUDIT_PERSISTENCE_FAILED: 'Audit을 저장할 수 없어 쓰기를 중단했습니다', EXECUTION_IN_PROGRESS: '이 초안을 생성 중입니다. 다시 제출하지 마세요',
  },
  en: {
    AUTH_REQUIRED: 'Administrator sign-in is required', AUTH_SESSION_EXPIRED: 'The administrator session expired', AUTH_ROLE_FORBIDDEN: 'This account is not an administrator', CSRF_INVALID: 'The security check expired; please sign in again', ORIGIN_NOT_ALLOWED: 'Writes are not allowed from this origin', OPERATION_NOT_FOUND: 'The operation was not found', PREVIEW_NOT_FOUND: 'No valid preview was found', PREVIEW_EXPIRED: 'The preview expired; create a new preview', PREVIEW_ALREADY_EXECUTED: 'This preview has already been executed', CONFIRMATION_REQUIRED: 'Select the explicit confirmation checkbox', CONFIRMATION_INVALID: 'The confirmation token is invalid', CONFIRMATION_MISMATCH: 'The form or preview changed; create a new preview', CONFIRMATION_REQUESTER_MISMATCH: 'This preview belongs to a different administrator session', TOOL_NOT_ALLOWED: 'This tool is not allowed to write', DATA_SOURCE_NOT_ALLOWED: 'This target data source is not allowed', MASS_ASSIGNMENT_REJECTED: 'The request contains a forbidden field', SCHEMA_MISMATCH: 'The Learning Coaching schema does not match the safe write contract', NOTION_CONFIGURATION_MISSING: 'Notion write configuration is incomplete', NOTION_REQUEST_FAILED: 'Notion could not create the draft', NOTION_INVALID_RESPONSE: 'Notion returned an invalid response', AUDIT_PERSISTENCE_FAILED: 'Audit could not be saved, so the write was stopped', EXECUTION_IN_PROGRESS: 'This draft is already being created; do not submit again',
  },
});

function errorText(lang, code) {
  return ERROR_COPY[lang]?.[code] || ERROR_COPY.en[code] || String(code || 'REQUEST_FAILED');
}

function tags(value) {
  return String(value || '').split(/[,，、]/u).map((item) => item.trim()).filter(Boolean);
}

export default function XchangeDraftPreviewPanel({ lang }) {
  const copy = COPY[lang] || COPY.en;
  const [draftType, setDraftType] = useState('course');
  const [form, setForm] = useState({ title: '', detail: '', duration: '90', difficulty: 'Beginner', contentLanguage: lang, tags: '' });
  const [auth, setAuth] = useState(EMPTY_AUTH);
  const [credentials, setCredentials] = useState({ actorId: '', accessSecret: '' });
  const [state, setState] = useState({ phase: 'idle', preview: null, result: null, errorCode: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [clock, setClock] = useState(Date.now());

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
      tags: tags(form.tags),
    };
    if (draftType === 'course') return {
      title: form.title,
      summary: form.detail,
      teachingCategory: 'Course',
      format: ['Course'],
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
    const data = await response.json();
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
      setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: '' });
    } catch (error) {
      setAuth((current) => ({ ...current, errorCode: error.code || 'LOGOUT_FAILED' }));
    }
  }

  async function createPreview(event) {
    event.preventDefault();
    setConfirmed(false);
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
  }

  const previewExpired = Boolean(state.preview && new Date(state.preview.previewExpiresAt).getTime() <= clock);

  async function executeDraft() {
    if (!state.preview || !confirmed || previewExpired || state.phase !== 'previewed') return;
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
      <div className="xchange-preview-heading"><div><span className="content-tag">Stage 5-3E-B · Confirmed write</span><h2>{copy.title}</h2><p>{copy.intro}</p></div></div>
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
        <label>{copy.duration}<input type="number" min="1" max="10080" value={form.duration} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, duration: event.target.value })))} required /></label>
        <label>{copy.difficulty}<select value={form.difficulty} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, difficulty: event.target.value })))}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label>{copy.language}<select value={form.contentLanguage} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, contentLanguage: event.target.value })))}><option value="zh">繁體中文</option><option value="ko">한국어</option><option value="en">English</option></select></label>
        <label>{copy.tags}<input value={form.tags} onChange={(event) => invalidatePreview(() => setForm((current) => ({ ...current, tags: event.target.value })))} /></label>
        <button className="mvp-action-button xchange-preview-submit" type="submit" disabled={auth.phase !== 'authenticated' || state.phase === 'previewing'}>{copy.preview}</button>
      </form>
      {state.phase === 'previewing' ? <p className="agent-state-message">{copy.previewing}</p> : null}
      {state.phase === 'executing' ? <p className="agent-state-message">{copy.executing}</p> : null}
      {state.phase === 'failed' ? <p className="agent-state-message" data-state="failed" data-testid="xchange-preview-failure">{copy.failed}: {errorText(lang, state.errorCode)} ({state.errorCode})</p> : null}
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
            {Object.entries(state.preview.createPayloadPreview || {}).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}
          </dl>
          {state.preview.warnings?.length ? <div className="xchange-preview-warnings"><strong>{copy.warning}</strong><ul>{state.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
          {state.phase !== 'succeeded' ? <div className="xchange-confirmation" data-testid="xchange-confirmation"><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={previewExpired || state.phase !== 'previewed'} />{copy.confirmLabel}</label>{previewExpired ? <p data-state="failed">{copy.expired}</p> : null}<button className="mvp-action-button" type="button" onClick={executeDraft} disabled={auth.phase !== 'authenticated' || !confirmed || previewExpired || state.phase !== 'previewed'}>{copy.execute}</button></div> : null}
          {state.result ? <div className="xchange-execution-success" data-testid="xchange-execution-success"><strong>{copy.created}</strong><dl><div><dt>{copy.operation}</dt><dd>{state.result.operationId}</dd></div><div><dt>{copy.status}</dt><dd>Succeeded · Draft · Private · Published=false</dd></div><div><dt>{copy.writes}</dt><dd>1 · performed 1</dd></div><div><dt>{copy.createdAt}</dt><dd>{state.result.createdAt}</dd></div><div><dt>{copy.recordId}</dt><dd>{state.result.externalRecordId}</dd></div></dl><p>{copy.notPublished}</p><button className="mvp-action-button" type="button" disabled>{copy.createdButton}</button></div> : null}
        </div>
      ) : null}
    </section>
  );
}
