import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('admin route and heavy non-home pages use lazy imports with a localized loading fallback', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const component of ['AdminAuditPage', 'AgentScaffoldPage', 'DemoRuntimePage', 'DetailPage', 'RoleDetailPage']) {
    assert.match(source, new RegExp(`const ${component} = lazy`));
  }
  assert.match(source, /<Suspense fallback=/); assert.match(source, /正在載入頁面/); assert.match(source, /페이지를 불러오는 중/); assert.match(source, /Loading page/);
});

test('migration interface includes tri-language dry-run, explicit confirmation, consistency, and safe-repair copy', () => {
  const source = readFileSync(new URL('../src/components/AdminMigrationPanel.jsx', import.meta.url), 'utf8');
  for (const phrase of ['產生 Migration Dry Run', '마이그레이션 Dry Run 생성', 'Generate migration dry run', '確認修復 ID 關聯', 'ID 링크 수정 확인', 'Confirm ID-link repair']) assert.match(source, new RegExp(phrase));
  assert.match(source, /type="checkbox"/); assert.match(source, /confirm: true/); assert.match(source, /repairable/);
});
