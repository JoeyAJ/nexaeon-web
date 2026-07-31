import { useEffect, useState } from 'react';
import AdminMigrationPanel from './AdminMigrationPanel.jsx';

const COPY = {
  zh: { title: '管理員稽核紀錄', subtitle: '僅限已授權管理員。紀錄為 append-only，敏感資訊已在伺服器端移除。', actor: '管理員 ID', code: '存取碼', login: '驗證管理員', logout: '登出', refresh: '重新整理', from: '起始日期', to: '結束日期', agent: 'Agent', tool: '工具', status: '狀態', recordType: 'Schema 類型', operation: 'Operation ID', externalRecord: '外部紀錄 ID', all: '全部', formal: '正式', legacy: '舊版', empty: '沒有符合條件的稽核紀錄。', failed: '無法載入', back: '返回首頁' },
  ko: { title: '관리자 감사 로그', subtitle: '승인된 관리자 전용입니다. 로그는 append-only이며 민감한 정보는 서버에서 제거됩니다.', actor: '관리자 ID', code: '접근 코드', login: '관리자 확인', logout: '로그아웃', refresh: '새로고침', from: '시작일', to: '종료일', agent: 'Agent', tool: '도구', status: '상태', recordType: '스키마 유형', operation: 'Operation ID', externalRecord: '외부 레코드 ID', all: '전체', formal: '정식', legacy: '레거시', empty: '조건에 맞는 감사 로그가 없습니다.', failed: '불러오기 실패', back: '홈으로' },
  en: { title: 'Admin audit log', subtitle: 'Authorized administrators only. Records are append-only and secrets are removed server-side.', actor: 'Admin ID', code: 'Access code', login: 'Verify admin', logout: 'Sign out', refresh: 'Refresh', from: 'Date from', to: 'Date to', agent: 'Agent', tool: 'Tool', status: 'Status', recordType: 'Schema type', operation: 'Operation ID', externalRecord: 'External record ID', all: 'All', formal: 'Formal', legacy: 'Legacy', empty: 'No audit records match these filters.', failed: 'Unable to load', back: 'Back home' },
};

const EMPTY_AUTH = { phase: 'loading', actorId: '', csrfToken: '', errorCode: '' };

export default function AdminAuditPage({ lang, setLang, navigate }) {
  const copy = COPY[lang] || COPY.en;
  const [auth, setAuth] = useState(EMPTY_AUTH);
  const [credentials, setCredentials] = useState({ actorId: '', accessSecret: '' });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', agentId: '', toolId: '', executionStatus: '', recordType: '', operationId: '', externalRecordId: '' });

  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        setAuth(response.ok ? { phase: 'authenticated', actorId: payload.actorId, csrfToken: payload.csrfToken, errorCode: '' } : { phase: 'anonymous', actorId: '', csrfToken: '', errorCode: payload.errorCode || '' });
        if (response.ok) {
          setLoading(true);
          fetch('/api/admin/audit', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(async (auditResponse) => ({ auditResponse, auditPayload: await auditResponse.json() }))
            .then(({ auditResponse, auditPayload }) => {
              if (!auditResponse.ok) throw Object.assign(new Error(auditPayload.errorCode), { code: auditPayload.errorCode });
              setRecords(auditPayload.records || []);
            })
            .catch((error) => setErrorCode(error.code || 'AUDIT_LOAD_FAILED'))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: 'AUTH_UNAVAILABLE' }));
  }, []);

  async function loadRecords(nextFilters = filters) {
    setLoading(true); setErrorCode('');
    const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
    if (nextFilters.dateFrom) params.set('dateFrom', `${nextFilters.dateFrom}T00:00:00.000Z`);
    if (nextFilters.dateTo) params.set('dateTo', `${nextFilters.dateTo}T23:59:59.999Z`);
    try {
      const response = await fetch(`/api/admin/audit?${params}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.errorCode), { code: payload.errorCode });
      setRecords(payload.records || []);
    } catch (error) { setErrorCode(error.code || 'AUDIT_LOAD_FAILED'); }
    finally { setLoading(false); }
  }

  async function login(event) {
    event.preventDefault(); setAuth((current) => ({ ...current, phase: 'authenticating', errorCode: '' }));
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(credentials) });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.errorCode), { code: payload.errorCode });
      setCredentials((current) => ({ ...current, accessSecret: '' }));
      setAuth({ phase: 'authenticated', actorId: payload.actorId, csrfToken: payload.csrfToken, errorCode: '' });
      await loadRecords();
    } catch (error) { setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: error.code || 'AUTH_FAILED' }); }
  }

  async function logout() {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-NexAeon-CSRF': auth.csrfToken }, body: '{}' });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.errorCode), { code: payload.errorCode });
      setAuth({ phase: 'anonymous', actorId: '', csrfToken: '', errorCode: '' }); setRecords([]);
    } catch (error) { setAuth((current) => ({ ...current, errorCode: error.code || 'LOGOUT_FAILED' })); }
  }

  return (
    <main className="admin-audit-page" data-testid="admin-audit-page">
      <header className="admin-audit-header"><div><span className="content-tag">NexAeon · Restricted</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div><div className="admin-audit-actions"><select aria-label="Language" value={lang} onChange={(event) => setLang(event.target.value)}><option value="zh">繁中</option><option value="ko">한국어</option><option value="en">EN</option></select><button type="button" onClick={() => navigate('/')}>{copy.back}</button></div></header>
      {auth.phase !== 'authenticated' ? (
        <form className="admin-audit-login" onSubmit={login}><label>{copy.actor}<input value={credentials.actorId} onChange={(event) => setCredentials((current) => ({ ...current, actorId: event.target.value }))} autoComplete="username" required /></label><label>{copy.code}<input type="password" value={credentials.accessSecret} onChange={(event) => setCredentials((current) => ({ ...current, accessSecret: event.target.value }))} autoComplete="current-password" required /></label><button type="submit" disabled={auth.phase === 'loading' || auth.phase === 'authenticating'}>{copy.login}</button>{auth.errorCode ? <p data-state="failed">{copy.failed}: {auth.errorCode}</p> : null}</form>
      ) : (
        <>
          <div className="admin-audit-session"><span>{auth.actorId} · admin</span><button type="button" onClick={logout}>{copy.logout}</button></div>{auth.errorCode ? <p data-state="failed">{copy.failed}: {auth.errorCode}</p> : null}
          <form className="admin-audit-filters" onSubmit={(event) => { event.preventDefault(); loadRecords(); }}><label>{copy.from}<input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /></label><label>{copy.to}<input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></label><label>{copy.agent}<select value={filters.agentId} onChange={(event) => setFilters((current) => ({ ...current, agentId: event.target.value }))}><option value="">{copy.all}</option><option value="orchestrator">orchestrator</option></select></label><label>{copy.tool}<select value={filters.toolId} onChange={(event) => setFilters((current) => ({ ...current, toolId: event.target.value }))}><option value="">{copy.all}</option><option value="createActionDraft">createActionDraft</option></select></label><label>{copy.status}<select value={filters.executionStatus} onChange={(event) => setFilters((current) => ({ ...current, executionStatus: event.target.value }))}><option value="">{copy.all}</option>{['previewed', 'confirmed', 'executing', 'succeeded', 'failed', 'expired', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>{copy.recordType}<select value={filters.recordType} onChange={(event) => setFilters((current) => ({ ...current, recordType: event.target.value }))}><option value="">{copy.all}</option><option value="formal">{copy.formal}</option><option value="legacy">{copy.legacy}</option></select></label><label>{copy.operation}<input value={filters.operationId} onChange={(event) => setFilters((current) => ({ ...current, operationId: event.target.value }))} /></label><label>{copy.externalRecord}<input value={filters.externalRecordId} onChange={(event) => setFilters((current) => ({ ...current, externalRecordId: event.target.value }))} /></label><button type="submit" disabled={loading}>{copy.refresh}</button></form>
          {errorCode ? <p className="agent-state-message" data-state="failed">{copy.failed}: {errorCode}</p> : null}
          {!loading && !errorCode && records.length === 0 ? <p>{copy.empty}</p> : null}
          <div className="admin-audit-list">{records.map((record) => <article key={record.auditId}><div><strong>{record.executionStatus}</strong><time>{record.timestamp}</time></div><dl><div><dt>operation</dt><dd>{record.operationId}</dd></div><div><dt>idempotency</dt><dd>{record.idempotencyKey || '—'}</dd></div><div><dt>actor</dt><dd>{record.actorId} · {record.actorRole}</dd></div><div><dt>agent / tool</dt><dd>{record.agentId} / {record.toolId}</dd></div><div><dt>confirmation</dt><dd>{record.confirmationStatus || '—'}</dd></div><div><dt>target</dt><dd>{record.targetDataSource}</dd></div><div><dt>record</dt><dd>{record.externalRecordId || '—'}</dd></div><div><dt>audit record</dt><dd>{record.auditRecordId || record.auditId}</dd></div><div><dt>schema</dt><dd>{record.schemaVersion || 'legacy'} · {record.recordType || 'legacy'}</dd></div><div><dt>error</dt><dd>{record.errorCode || '—'}</dd></div><div><dt>duration</dt><dd>{record.duration} ms</dd></div></dl></article>)}</div>
          <AdminMigrationPanel lang={lang} csrfToken={auth.csrfToken} />
        </>
      )}
    </main>
  );
}
