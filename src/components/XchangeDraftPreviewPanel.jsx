import { useEffect, useMemo, useState } from 'react';

const COPY = Object.freeze({
  zh: {
    title: 'Xchange Draft Preview', intro: '將課程或學習活動整理成受控預覽；本階段不會寫入 Learning Coaching。',
    type: '草稿類型', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '標題',
    summary: '摘要／子主題', instructions: '活動指引', duration: '時間（分鐘）', difficulty: '難度',
    language: '內容語言', tags: '標籤（以逗號分隔）', actor: '管理員 ID', code: '存取碼', signIn: '驗證管理員',
    signOut: '登出', adminRequired: '需要管理員登入才能建立正式 Preview Audit。', preview: '建立 Preview', previewing: '正在驗證並建立 Preview Audit……',
    previewTitle: '結構化 Preview', target: '目標資料來源', permission: '寫入權限', expires: 'Preview 期限', writes: '預估 writes',
    warning: '警告', status: '安全狀態', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '尚未寫入', confirmNeeded: '需要管理員確認',
    coming: 'Coming in Stage 5-3E-B', failed: 'Preview 建立失敗', adminSession: '管理員 session',
  },
  ko: {
    title: 'Xchange Draft Preview', intro: '수업 또는 학습 활동을 통제된 미리보기로 정리합니다. 이 단계에서는 Learning Coaching에 쓰지 않습니다.',
    type: '초안 유형', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: '제목',
    summary: '요약／하위 주제', instructions: '활동 지침', duration: '시간(분)', difficulty: '난이도',
    language: '콘텐츠 언어', tags: '태그(쉼표로 구분)', actor: '관리자 ID', code: '접근 코드', signIn: '관리자 확인',
    signOut: '로그아웃', adminRequired: '정식 Preview Audit을 만들려면 관리자 로그인이 필요합니다.', preview: 'Preview 만들기', previewing: '검증 및 Preview Audit 생성 중…',
    previewTitle: '구조화된 Preview', target: '대상 데이터 소스', permission: '쓰기 권한', expires: 'Preview 만료', writes: '예상 writes',
    warning: '경고', status: '안전 상태', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: '아직 쓰지 않음', confirmNeeded: '관리자 확인 필요',
    coming: 'Coming in Stage 5-3E-B', failed: 'Preview 생성 실패', adminSession: '관리자 session',
  },
  en: {
    title: 'Xchange Draft Preview', intro: 'Normalize a course or learning activity into a controlled preview. This stage never writes to Learning Coaching.',
    type: 'Draft type', course: 'Course Draft', activity: 'Learning Activity Draft', draftTitle: 'Title',
    summary: 'Summary / subtopic', instructions: 'Activity instructions', duration: 'Duration (minutes)', difficulty: 'Difficulty',
    language: 'Content language', tags: 'Tags (comma separated)', actor: 'Admin ID', code: 'Access code', signIn: 'Verify admin',
    signOut: 'Sign out', adminRequired: 'Admin sign-in is required to create the formal Preview Audit.', preview: 'Create Preview', previewing: 'Validating and creating the Preview Audit…',
    previewTitle: 'Structured Preview', target: 'Target data source', permission: 'Write permission', expires: 'Preview expiry', writes: 'Estimated writes',
    warning: 'Warning', status: 'Safety status', operation: 'Operation ID', previewOnly: 'Preview only', notWritten: 'Not written', confirmNeeded: 'Admin confirmation required',
    coming: 'Coming in Stage 5-3E-B', failed: 'Preview failed', adminSession: 'Admin session',
  },
});

const EMPTY_AUTH = { phase: 'loading', actorId: '', csrfToken: '', errorCode: '' };

function tags(value) {
  return String(value || '').split(/[,，、]/u).map((item) => item.trim()).filter(Boolean);
}

export default function XchangeDraftPreviewPanel({ lang }) {
  const copy = COPY[lang] || COPY.en;
  const [draftType, setDraftType] = useState('course');
  const [form, setForm] = useState({ title: '', detail: '', duration: '90', difficulty: 'Beginner', contentLanguage: lang, tags: '' });
  const [auth, setAuth] = useState(EMPTY_AUTH);
  const [credentials, setCredentials] = useState({ actorId: '', accessSecret: '' });
  const [state, setState] = useState({ phase: 'idle', preview: null, errorCode: '' });

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
      setState({ phase: 'idle', preview: null, errorCode: '' });
      setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: '' });
    } catch (error) {
      setAuth((current) => ({ ...current, errorCode: error.code || 'LOGOUT_FAILED' }));
    }
  }

  async function createPreview(event) {
    event.preventDefault();
    setState({ phase: 'previewing', preview: null, errorCode: '' });
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
      setState({ phase: 'previewed', preview: await parse(response), errorCode: '' });
    } catch (error) {
      setState({ phase: 'failed', preview: null, errorCode: error.code || 'PREVIEW_FAILED' });
    }
  }

  return (
    <section className="xchange-draft-preview-panel" data-testid="xchange-draft-preview-panel" data-phase={state.phase}>
      <div className="xchange-preview-heading"><div><span className="content-tag">Stage 5-3E-A · Preview only</span><h2>{copy.title}</h2><p>{copy.intro}</p></div></div>
      {auth.phase !== 'authenticated' ? (
        <form className="agent-admin-auth" onSubmit={login} data-testid="xchange-admin-login">
          <strong>{copy.adminRequired}</strong>
          <label>{copy.actor}<input value={credentials.actorId} onChange={(event) => setCredentials((current) => ({ ...current, actorId: event.target.value }))} autoComplete="username" required /></label>
          <label>{copy.code}<input type="password" value={credentials.accessSecret} onChange={(event) => setCredentials((current) => ({ ...current, accessSecret: event.target.value }))} autoComplete="current-password" required /></label>
          <button className="mvp-action-button" type="submit" disabled={auth.phase === 'loading' || auth.phase === 'authenticating'}>{copy.signIn}</button>
          {auth.errorCode ? <p className="agent-state-message" data-state="failed">{copy.failed}: {auth.errorCode}</p> : null}
        </form>
      ) : (
        <div className="agent-admin-session"><span>{copy.adminSession}: {auth.actorId}</span><button type="button" onClick={logout}>{copy.signOut}</button></div>
      )}
      <form className="xchange-preview-form" onSubmit={createPreview}>
        <label>{copy.type}<select value={draftType} onChange={(event) => { setDraftType(event.target.value); setState({ phase: 'idle', preview: null, errorCode: '' }); }}><option value="course">{copy.course}</option><option value="learning_activity">{copy.activity}</option></select></label>
        <label>{copy.draftTitle}<input value={form.title} maxLength={320} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></label>
        <label className="xchange-preview-wide">{draftType === 'course' ? copy.summary : copy.instructions}<textarea value={form.detail} maxLength={4000} rows={5} onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))} required /></label>
        <label>{copy.duration}<input type="number" min="1" max="10080" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} required /></label>
        <label>{copy.difficulty}<select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label>{copy.language}<select value={form.contentLanguage} onChange={(event) => setForm((current) => ({ ...current, contentLanguage: event.target.value }))}><option value="zh">繁體中文</option><option value="ko">한국어</option><option value="en">English</option></select></label>
        <label>{copy.tags}<input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} /></label>
        <button className="mvp-action-button xchange-preview-submit" type="submit" disabled={auth.phase !== 'authenticated' || state.phase === 'previewing'}>{copy.preview}</button>
      </form>
      {state.phase === 'previewing' ? <p className="agent-state-message">{copy.previewing}</p> : null}
      {state.phase === 'failed' ? <p className="agent-state-message" data-state="failed" data-testid="xchange-preview-failure">{copy.failed}: {state.errorCode}</p> : null}
      {state.preview ? (
        <div className="agent-action-preview xchange-structured-preview" data-testid="xchange-structured-preview">
          <strong>{copy.previewTitle}</strong>
          <div className="xchange-preview-status"><span>{copy.previewOnly}</span><span>{copy.notWritten}</span><span>{copy.confirmNeeded}</span></div>
          <dl>
            <div><dt>{copy.target}</dt><dd>{state.preview.targetDataSource}</dd></div>
            <div><dt>{copy.status}</dt><dd>Draft · Private · Published=false</dd></div>
            <div><dt>{copy.operation}</dt><dd>{state.preview.operationId}</dd></div>
            <div><dt>{copy.expires}</dt><dd>{state.preview.previewExpiresAt}</dd></div>
            <div><dt>{copy.permission}</dt><dd>{state.preview.permissionLevel}</dd></div>
            <div><dt>{copy.writes}</dt><dd>{state.preview.estimatedWrites} · performed {state.preview.writesPerformed}</dd></div>
            {Object.entries(state.preview.createPayloadPreview || {}).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}
          </dl>
          {state.preview.warnings?.length ? <div className="xchange-preview-warnings"><strong>{copy.warning}</strong><ul>{state.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
          <button className="mvp-action-button" type="button" disabled>{copy.coming}</button>
        </div>
      ) : null}
    </section>
  );
}
