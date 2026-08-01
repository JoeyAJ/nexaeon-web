import { useMemo, useState } from 'react';

const COPY = {
  zh: { title: 'Legacy Migration 與一致性', notice: 'Migration 不會刪除原始資料，也不會修改 Project Name。執行前必須先產生 dry-run 並明確確認。', dryRun: '產生 Migration Dry Run', running: '處理中…', audits: '將遷移 Audit', drafts: '將更新 Draft', skip: '將跳過', invalid: '無效紀錄', writes: '預估 writes', expires: '確認期限', warnings: '警告', confirm: '我確認依此 dry-run 執行，且原始資料不會刪除', execute: '執行已確認 Migration', result: 'Migration 結果', consistency: '檢查 Action／Audit 一致性', checkedActions: 'Action 總數', checkedAudits: 'Audit 總數', filter: '問題類型', all: '全部', repairPreview: '預覽安全修復', repairConfirm: '確認修復 ID 關聯', action: 'Action', audit: 'Audit', candidate: '候選 Audit', candidateCount: '候選數量', score: '匹配分數', evidence: '證據', safe: '安全修復', recommended: '建議操作', actionFields: 'Action 鑑識欄位', current: '目前關聯', expected: '預期關聯', basis: '判定依據', before: '修復前', after: '修復後', noIssues: '沒有符合篩選的問題。', failed: '操作失敗' },
  ko: { title: '레거시 마이그레이션 및 일관성', notice: '마이그레이션은 원본 데이터를 삭제하거나 Project Name을 변경하지 않습니다. 실행 전에 dry run과 명시적 확인이 필요합니다.', dryRun: '마이그레이션 Dry Run 생성', running: '처리 중…', audits: '마이그레이션할 Audit', drafts: '업데이트할 Draft', skip: '건너뛸 레코드', invalid: '잘못된 레코드', writes: '예상 writes', expires: '확인 만료', warnings: '경고', confirm: '이 dry run으로 실행하며 원본 데이터가 삭제되지 않음을 확인합니다', execute: '확인된 마이그레이션 실행', result: '마이그레이션 결과', consistency: 'Action/Audit 일관성 검사', checkedActions: 'Action 합계', checkedAudits: 'Audit 합계', filter: '문제 유형', all: '전체', repairPreview: '안전 수정 미리보기', repairConfirm: 'ID 링크 수정 확인', action: 'Action', audit: 'Audit', candidate: '후보 Audit', candidateCount: '후보 수', score: '일치 점수', evidence: '근거', safe: '안전 수정', recommended: '권장 조치', actionFields: 'Action 조사 필드', current: '현재 링크', expected: '예상 링크', basis: '판정 기준', before: '수정 전', after: '수정 후', noIssues: '필터와 일치하는 문제가 없습니다.', failed: '작업 실패' },
  en: { title: 'Legacy migration and consistency', notice: 'Migration never deletes source data or changes Project Name. A dry run and explicit confirmation are required before execution.', dryRun: 'Generate migration dry run', running: 'Working…', audits: 'Audits to migrate', drafts: 'Drafts to update', skip: 'Records to skip', invalid: 'Invalid records', writes: 'Estimated writes', expires: 'Confirmation expires', warnings: 'Warnings', confirm: 'I confirm this dry run and understand source data will not be deleted', execute: 'Execute confirmed migration', result: 'Migration result', consistency: 'Check Action/Audit consistency', checkedActions: 'Total actions', checkedAudits: 'Total audits', filter: 'Issue type', all: 'All', repairPreview: 'Preview safe repair', repairConfirm: 'Confirm ID-link repair', action: 'Action', audit: 'Audit', candidate: 'Candidate Audit', candidateCount: 'Candidate count', score: 'Match score', evidence: 'Evidence', safe: 'Safe repair', recommended: 'Recommended action', actionFields: 'Action forensic fields', current: 'Current link', expected: 'Expected link', basis: 'Match basis', before: 'Before', after: 'After', noIssues: 'No issues match this filter.', failed: 'Operation failed' },
};

const CATEGORIES = ['consistent', 'action-missing-audit', 'audit-missing-action', 'link-mismatch', 'operation-mismatch', 'idempotency-mismatch', 'duplicate', 'legacy', 'unknown'];
const PREFLIGHT_COPY = { zh: 'Schema Preflight／Partial Write 檢查', ko: '스키마 Preflight / Partial Write 검사', en: 'Schema preflight / partial-write check' };
const PREFLIGHT_UI = {
  zh: { passed: 'Preflight 通過', failed: 'Preflight 失敗', issues: 'Schema 問題', writes: 'Writes performed', partial: 'Partial writes', audits: '剩餘 legacy Audit', drafts: '剩餘 legacy Draft', table: 'Table', field: 'Field', current: 'Current Type', expected: 'Expected Type', next: '下一步', ready: '產生新的 dry-run，經管理員確認後再決定是否執行。', blocked: '先修正下列 schema 問題；在全部通過前 Migration write 會維持封鎖。', details: '顯示技術詳情' },
  ko: { passed: 'Preflight 통과', failed: 'Preflight 실패', issues: '스키마 문제', writes: 'Writes performed', partial: 'Partial writes', audits: '남은 legacy Audit', drafts: '남은 legacy Draft', table: 'Table', field: 'Field', current: 'Current Type', expected: 'Expected Type', next: '다음 단계', ready: '새 dry-run을 생성하고 관리자 확인 후 실행 여부를 결정하세요.', blocked: '아래 스키마 문제를 먼저 수정하세요. 모두 통과하기 전에는 쓰기가 차단됩니다.', details: '기술 세부정보 표시' },
  en: { passed: 'Preflight passed', failed: 'Preflight failed', issues: 'Schema issues', writes: 'Writes performed', partial: 'Partial writes', audits: 'Remaining legacy Audits', drafts: 'Remaining legacy Drafts', table: 'Table', field: 'Field', current: 'Current type', expected: 'Expected type', next: 'Next step', ready: 'Generate a fresh dry run, then let an administrator decide whether to execute it.', blocked: 'Resolve the schema issues below. Migration writes remain blocked until every check passes.', details: 'Show technical details' },
};

function partialWriteCount(report) {
  const partial = report?.partialWrites || {};
  const migratedAudits = (partial.legacyAudits || []).filter(({ state }) => state === 'written').length;
  const migratedDrafts = (partial.drafts || []).filter(({ migrationBatchId }) => Boolean(migrationBatchId)).length;
  return migratedAudits + migratedDrafts + (partial.migrationAudits || []).length;
}

function IssueDetails({ issue, copy }) {
  const candidates = issue.candidateAuditRecordIds || (issue.candidateAuditRecordId ? [issue.candidateAuditRecordId] : []);
  const duplicateIds = issue.auditRecordIds || issue.actionRecordIds || [];
  return <>
    <span>{copy.action}: {issue.actionRecordId || '—'} / {copy.audit}: {issue.auditRecordId || '—'}</span>
    {issue.category === 'action-missing-audit' ? <span>{copy.candidateCount}: {issue.candidateCount ?? candidates.length} / {copy.safe}: {issue.safe === true ? 'true' : 'false'}</span> : null}
    {candidates.length ? <span>{copy.candidate}: {candidates.join(', ')}</span> : null}
    {(issue.candidateMatches || []).map((candidate) => <span key={candidate.auditRecordId}>{candidate.auditRecordId} — {copy.score}: {candidate.matchScore}; {copy.evidence}: {(candidate.evidence || []).map(({ field, match }) => `${field} (${match})`).join(', ') || '—'}</span>)}
    {issue.recommendedAction ? <span>{copy.recommended}: {issue.recommendedAction}</span> : null}
    {issue.currentAuditRecordId || issue.expectedAuditRecordId ? <span>{copy.current}: {issue.currentAuditRecordId || '—'} / {copy.expected}: {issue.expectedAuditRecordId || '—'}</span> : null}
    {duplicateIds.length ? <span>{issue.auditRecordIds ? copy.audit : copy.action}: {duplicateIds.join(', ')}</span> : null}
    {issue.auditId ? <span>Audit ID: {issue.auditId}</span> : null}
    {issue.sourceRecordId ? <span>Source record: {issue.sourceRecordId}</span> : null}
    {issue.duplicateBasis || issue.candidateBasis ? <span>{copy.basis}: {issue.duplicateBasis || issue.candidateBasis}</span> : null}
    {issue.actionDetails ? <details><summary>{copy.actionFields}</summary><pre>{JSON.stringify(issue.actionDetails, null, 2)}</pre></details> : null}
  </>;
}

async function request(path, { method = 'GET', csrfToken, body } = {}) {
  const response = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-NexAeon-CSRF': csrfToken } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.errorCode || 'ADMIN_REQUEST_FAILED'), { code: payload.errorCode || 'ADMIN_REQUEST_FAILED', details: payload.details || {} });
  return payload;
}

export default function AdminMigrationPanel({ lang, csrfToken }) {
  const copy = COPY[lang] || COPY.en;
  const preflightCopy = PREFLIGHT_UI[lang] || PREFLIGHT_UI.en;
  const [busy, setBusy] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [safetyReport, setSafetyReport] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [category, setCategory] = useState('');
  const [repairPreview, setRepairPreview] = useState(null);
  const filteredIssues = useMemo(() => (consistency?.results || []).filter((issue) => !category || issue.category === category), [category, consistency]);

  async function perform(key, operation) {
    setBusy(key); setErrorCode('');
    try { return await operation(); } catch (error) {
      const detail = [error.details?.tableName || error.details?.tableRole, error.details?.fieldName, error.details?.airtableErrorType, error.details?.actualType && error.details?.expectedType ? `${error.details.actualType} → ${error.details.expectedType}` : ''].filter(Boolean).join(' · ');
      setErrorCode(`${error.code || 'ADMIN_REQUEST_FAILED'}${detail ? ` — ${detail}` : ''}`); return null;
    }
    finally { setBusy(''); }
  }

  async function loadPreview() {
    const payload = await perform('preview', () => request('/api/admin/migration/preview', { method: 'POST', csrfToken, body: {} }));
    if (payload) { setPreview(payload); setConfirmed(false); setMigrationResult(null); }
  }

  async function loadSafetyReport() {
    const payload = await perform('preflight', () => request('/api/admin/migration/preflight'));
    if (payload) setSafetyReport(payload);
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
      <button type="button" onClick={loadSafetyReport} disabled={Boolean(busy)}>{busy === 'preflight' ? copy.running : PREFLIGHT_COPY[lang] || PREFLIGHT_COPY.en}</button>
      {safetyReport ? (
        <section className="admin-migration-preview" data-testid="migration-safety-report">
          <h3>{safetyReport.preflight?.ok ? preflightCopy.passed : preflightCopy.failed}</h3>
          <dl>
            <div><dt>{preflightCopy.issues}</dt><dd>{safetyReport.preflight?.issues?.length || 0}</dd></div>
            <div><dt>{preflightCopy.writes}</dt><dd>{safetyReport.preflight?.writesPerformed || 0}</dd></div>
            <div><dt>{preflightCopy.partial}</dt><dd>{partialWriteCount(safetyReport)}</dd></div>
            <div><dt>{preflightCopy.audits}</dt><dd>{safetyReport.partialWrites?.remainingLegacyAuditCount || 0}</dd></div>
            <div><dt>{preflightCopy.drafts}</dt><dd>{safetyReport.partialWrites?.remainingLegacyDraftCount || 0}</dd></div>
          </dl>
          {safetyReport.preflight?.issues?.length ? <div className="admin-consistency-list">{safetyReport.preflight.issues.map((issue, index) => <article key={`${issue.code}:${issue.tableRole}:${issue.fieldName || ''}:${index}`}><strong>{issue.code}</strong><span>{preflightCopy.table}: {safetyReport.preflight.tables?.find(({ role }) => role === issue.tableRole)?.tableName || issue.tableRole || '—'}</span><span>{preflightCopy.field}: {issue.fieldName || '—'}</span><span>{preflightCopy.current}: {issue.actualType || '—'} / {preflightCopy.expected}: {issue.expectedType || '—'}</span></article>)}</div> : null}
          <p><strong>{preflightCopy.next}:</strong> {safetyReport.preflight?.ok ? preflightCopy.ready : preflightCopy.blocked}</p>
          <details><summary>{preflightCopy.details}</summary><pre className="admin-migration-result">{JSON.stringify(safetyReport, null, 2)}</pre></details>
        </section>
      ) : null}
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
      {consistency ? <dl className="admin-consistency-summary" data-testid="consistency-summary"><div><dt>{copy.checkedActions}</dt><dd>{consistency.actionCount || 0}</dd></div><div><dt>{copy.checkedAudits}</dt><dd>{consistency.auditCount || 0}</dd></div>{CATEGORIES.map((item) => <div key={item}><dt>{item}</dt><dd>{consistency.counts?.[item] || 0}</dd></div>)}</dl> : null}
      {consistency ? <div className="admin-consistency-list">{filteredIssues.length ? filteredIssues.map((issue, index) => <article key={`${issue.category}:${issue.actionRecordId || ''}:${issue.auditRecordId || ''}:${index}`}><strong>{issue.category}</strong><span>{issue.operationId || '—'}</span><IssueDetails issue={issue} copy={copy} />{issue.repairable && issue.safe === true ? <button type="button" onClick={() => previewRepair(issue)} disabled={Boolean(busy)}>{copy.repairPreview}</button> : null}</article>) : <p>{copy.noIssues}</p>}</div> : null}
      {repairPreview ? <div className="admin-repair-preview" data-testid="repair-preview"><p><strong>{copy.action}:</strong> {repairPreview.actionRecordId} / <strong>{copy.audit}:</strong> {repairPreview.auditRecordId}</p><p><strong>{copy.basis}:</strong> {repairPreview.reason}</p><div><strong>{copy.before}</strong><pre>{JSON.stringify(repairPreview.before, null, 2)}</pre></div><div><strong>{copy.after}</strong><pre>{JSON.stringify(repairPreview.after, null, 2)}</pre></div><button type="button" onClick={confirmRepair} disabled={Boolean(busy)}>{busy === 'repair-confirm' ? copy.running : copy.repairConfirm}</button></div> : null}
      {errorCode ? <p className="agent-state-message" data-state="failed">{copy.failed}: {errorCode}</p> : null}
    </section>
  );
}
