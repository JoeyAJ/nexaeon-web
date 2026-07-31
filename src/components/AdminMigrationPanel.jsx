import { useMemo, useState } from 'react';

const COPY = {
  zh: { title: 'Legacy Migration 與一致性', notice: 'Migration 不會刪除原始資料，也不會修改 Project Name。執行前必須先產生 dry-run 並明確確認。', dryRun: '產生 Migration Dry Run', running: '處理中…', audits: '將遷移 Audit', drafts: '將更新 Draft', skip: '將跳過', invalid: '無效紀錄', writes: '預估 writes', expires: '確認期限', warnings: '警告', confirm: '我確認依此 dry-run 執行，且原始資料不會刪除', execute: '執行已確認 Migration', result: 'Migration 結果', consistency: '檢查 Action／Audit 一致性', filter: '問題類型', all: '全部', repairPreview: '預覽安全修復', repairConfirm: '確認修復 ID 關聯', noIssues: '沒有符合篩選的問題。', failed: '操作失敗' },
  ko: { title: '레거시 마이그레이션 및 일관성', notice: '마이그레이션은 원본 데이터를 삭제하거나 Project Name을 변경하지 않습니다. 실행 전에 dry run과 명시적 확인이 필요합니다.', dryRun: '마이그레이션 Dry Run 생성', running: '처리 중…', audits: '마이그레이션할 Audit', drafts: '업데이트할 Draft', skip: '건너뛸 레코드', invalid: '잘못된 레코드', writes: '예상 writes', expires: '확인 만료', warnings: '경고', confirm: '이 dry run으로 실행하며 원본 데이터가 삭제되지 않음을 확인합니다', execute: '확인된 마이그레이션 실행', result: '마이그레이션 결과', consistency: 'Action/Audit 일관성 검사', filter: '문제 유형', all: '전체', repairPreview: '안전 수정 미리보기', repairConfirm: 'ID 링크 수정 확인', noIssues: '필터와 일치하는 문제가 없습니다.', failed: '작업 실패' },
  en: { title: 'Legacy migration and consistency', notice: 'Migration never deletes source data or changes Project Name. A dry run and explicit confirmation are required before execution.', dryRun: 'Generate migration dry run', running: 'Working…', audits: 'Audits to migrate', drafts: 'Drafts to update', skip: 'Records to skip', invalid: 'Invalid records', writes: 'Estimated writes', expires: 'Confirmation expires', warnings: 'Warnings', confirm: 'I confirm this dry run and understand source data will not be deleted', execute: 'Execute confirmed migration', result: 'Migration result', consistency: 'Check Action/Audit consistency', filter: 'Issue type', all: 'All', repairPreview: 'Preview safe repair', repairConfirm: 'Confirm ID-link repair', noIssues: 'No issues match this filter.', failed: 'Operation failed' },
};

const CATEGORIES = ['consistent', 'action-missing-audit', 'audit-missing-action', 'link-mismatch', 'operation-mismatch', 'idempotency-mismatch', 'duplicate', 'legacy', 'unknown'];

async function request(path, { method = 'GET', csrfToken, body } = {}) {
  const response = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-NexAeon-CSRF': csrfToken } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.errorCode || 'ADMIN_REQUEST_FAILED'), { code: payload.errorCode || 'ADMIN_REQUEST_FAILED' });
  return payload;
}

export default function AdminMigrationPanel({ lang, csrfToken }) {
  const copy = COPY[lang] || COPY.en;
  const [busy, setBusy] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [category, setCategory] = useState('');
  const [repairPreview, setRepairPreview] = useState(null);
  const filteredIssues = useMemo(() => (consistency?.results || []).filter((issue) => !category || issue.category === category), [category, consistency]);

  async function perform(key, operation) {
    setBusy(key); setErrorCode('');
    try { return await operation(); } catch (error) { setErrorCode(error.code || 'ADMIN_REQUEST_FAILED'); return null; }
    finally { setBusy(''); }
  }

  async function loadPreview() {
    const payload = await perform('preview', () => request('/api/admin/migration/preview', { method: 'POST', csrfToken, body: {} }));
    if (payload) { setPreview(payload); setConfirmed(false); setMigrationResult(null); }
  }

  async function executeMigration() {
    if (!preview || !confirmed) return;
    const payload = await perform('execute', () => request('/api/admin/migration/execute', { method: 'POST', csrfToken, body: { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken } }));
    if (payload) setMigrationResult(payload);
  }

  async function loadConsistency() {
    const payload = await perform('consistency', () => request('/api/admin/consistency'));
    if (payload) { setConsistency(payload); setRepairPreview(null); }
  }

  async function previewRepair(issue) {
    const payload = await perform(`repair:${issue.actionRecordId || issue.auditRecordId}`, () => request('/api/admin/repair/preview', { method: 'POST', csrfToken, body: { issue } }));
    if (payload) setRepairPreview({ ...payload, issue });
  }

  async function confirmRepair() {
    if (!repairPreview) return;
    const payload = await perform('repair-confirm', () => request('/api/admin/repair/execute', { method: 'POST', csrfToken, body: { ...repairPreview, confirm: true } }));
    if (payload) { setRepairPreview(null); await loadConsistency(); }
  }

  return (
    <section className="admin-migration-panel" data-testid="admin-migration-panel">
      <h2>{copy.title}</h2><p>{copy.notice}</p>
      <button type="button" onClick={loadPreview} disabled={Boolean(busy)}>{busy === 'preview' ? copy.running : copy.dryRun}</button>
      {preview ? (
        <div className="admin-migration-preview" data-testid="migration-dry-run">
          <strong>{preview.migrationBatchId}</strong>
          <dl><div><dt>{copy.audits}</dt><dd>{preview.recordsToCreate.length}</dd></div><div><dt>{copy.drafts}</dt><dd>{preview.recordsToUpdate.length}</dd></div><div><dt>{copy.skip}</dt><dd>{preview.recordsToSkip.length}</dd></div><div><dt>{copy.invalid}</dt><dd>{preview.invalidRecordCount}</dd></div><div><dt>{copy.writes}</dt><dd>{preview.estimatedWrites}</dd></div><div><dt>{copy.expires}</dt><dd>{preview.expiresAt}</dd></div></dl>
          {preview.warnings.length ? <div><strong>{copy.warnings}</strong><ul>{preview.warnings.map((warning) => <li key={`${warning.recordId}:${warning.code}`}>{warning.recordId}: {warning.code}</li>)}</ul></div> : null}
          <label className="admin-migration-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{copy.confirm}</label>
          <button type="button" onClick={executeMigration} disabled={!confirmed || Boolean(busy)}>{busy === 'execute' ? copy.running : copy.execute}</button>
        </div>
      ) : null}
      {migrationResult ? <pre className="admin-migration-result"><strong>{copy.result}</strong>{'\n'}{JSON.stringify(migrationResult, null, 2)}</pre> : null}
      <div className="admin-consistency-heading"><button type="button" onClick={loadConsistency} disabled={Boolean(busy)}>{busy === 'consistency' ? copy.running : copy.consistency}</button>{consistency ? <label>{copy.filter}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{copy.all}</option>{CATEGORIES.map((item) => <option key={item} value={item}>{item} ({consistency.counts?.[item] || 0})</option>)}</select></label> : null}</div>
      {consistency ? <div className="admin-consistency-list">{filteredIssues.length ? filteredIssues.map((issue, index) => <article key={`${issue.category}:${issue.actionRecordId || ''}:${issue.auditRecordId || ''}:${index}`}><strong>{issue.category}</strong><span>{issue.operationId || '—'}</span><span>{issue.actionRecordId || '—'} / {issue.auditRecordId || '—'}</span>{issue.repairable ? <button type="button" onClick={() => previewRepair(issue)} disabled={Boolean(busy)}>{copy.repairPreview}</button> : null}</article>) : <p>{copy.noIssues}</p>}</div> : null}
      {repairPreview ? <div className="admin-repair-preview"><pre>{JSON.stringify(repairPreview.updates, null, 2)}</pre><button type="button" onClick={confirmRepair} disabled={Boolean(busy)}>{busy === 'repair-confirm' ? copy.running : copy.repairConfirm}</button></div> : null}
      {errorCode ? <p className="agent-state-message" data-state="failed">{copy.failed}: {errorCode}</p> : null}
    </section>
  );
}

