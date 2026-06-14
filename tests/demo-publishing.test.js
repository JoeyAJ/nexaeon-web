import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEMO_SUCCESS_CACHE_CONTROL,
  normalizePublicAirtableDemos,
  sendDemoJsonResponse,
} from '../api/modules/demos.js';
import {
  getDuplicatePublicDemoSlugs,
  validateDemoPublishing,
} from '../lib/demoPublishing.js';

const FIXED_UPDATED_AT = '2026-06-12T05:40:00.000Z';

function makeDemoRecord(fields = {}) {
  return {
    id: 'recSecretDemo',
    fields: {
      'Demo Name': '繁中名稱',
      'Demo Name KO': '한국어 이름',
      'Demo Name EN': 'English Name',
      Summary: '繁中摘要',
      'Summary KO': '한국어 요약',
      'Summary EN': 'English summary',
      Slug: 'demo-one',
      'Demo Type': 'AI Tutor',
      Status: 'Testing',
      Version: 'v1',
      'Launch Mode': 'External',
      'Demo URL': 'https://example.com/demo',
      'GitHub URL': 'https://github.com/JoeyAJ/nexaeon-web',
      'Research Link': 'https://example.com/research',
      Visibility: 'Public',
      Notes: 'private notes',
      'Updated At': FIXED_UPDATED_AT,
      ...fields,
    },
  };
}

function createFakeResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function validate(fields = {}, options = {}) {
  return validateDemoPublishing(makeDemoRecord(fields), options);
}

test('complete Public Demo is Showcase Ready', () => {
  const report = validate();
  assert.equal(report.showcaseReady, true);
  assert.deepEqual(report.blockers, []);
});

test('Internal visibility is not public', () => {
  const report = validate({ Visibility: 'Internal' });
  assert.equal(report.showcaseReady, false);
  assert.ok(report.blockers.includes('not_public'));
});

test('Private visibility is not public', () => {
  const report = validate({ Visibility: 'Private' });
  assert.equal(report.showcaseReady, false);
  assert.ok(report.blockers.includes('not_public'));
});

test('blank Visibility is not public', () => {
  const report = validate({ Visibility: '' });
  assert.equal(report.showcaseReady, false);
  assert.ok(report.blockers.includes('not_public'));
});

test('Archived Public Demo is not public', () => {
  const report = validate({ Status: 'Archived' });
  assert.equal(report.showcaseReady, false);
  assert.ok(report.blockers.includes('archived'));
});

test('missing zh name is blocked', () => {
  assert.ok(validate({ 'Demo Name': '' }).blockers.includes('missing_name_zh'));
});

test('missing ko name is blocked', () => {
  assert.ok(validate({ 'Demo Name KO': '' }).blockers.includes('missing_name_ko'));
});

test('missing en name is blocked', () => {
  assert.ok(validate({ 'Demo Name EN': '' }).blockers.includes('missing_name_en'));
});

test('missing summaries are blocked per locale', () => {
  const report = validate({ Summary: '', 'Summary KO': '', 'Summary EN': '' });
  assert.ok(report.blockers.includes('missing_summary_zh'));
  assert.ok(report.blockers.includes('missing_summary_ko'));
  assert.ok(report.blockers.includes('missing_summary_en'));
});

test('invalid Slug is blocked', () => {
  const report = validate({ Slug: 'Bad Slug!' });
  assert.ok(report.blockers.includes('invalid_slug'));
});

test('duplicate Public Slug blocks every duplicate record', () => {
  const records = [
    makeDemoRecord({ 'Demo Name': 'A', Slug: 'same-slug' }),
    makeDemoRecord({ 'Demo Name': 'B', Slug: 'same-slug' }),
  ];
  const duplicateSlugs = getDuplicatePublicDemoSlugs(records);

  for (const record of records) {
    const report = validateDemoPublishing(record, { duplicateSlugs });
    assert.equal(report.showcaseReady, false);
    assert.ok(report.blockers.includes('duplicate_slug'));
  }
  assert.equal(normalizePublicAirtableDemos(records).length, 0);
});

test('Concept without Demo URL can still Showcase', () => {
  const report = validate({ Status: 'Concept', 'Demo URL': '' });
  assert.equal(report.showcaseReady, true);
  assert.equal(report.launchReady, false);
});

test('External with legal URL is Launch Ready', () => {
  const report = validate({ 'Launch Mode': 'External', 'Demo URL': 'https://example.com/demo' });
  assert.equal(report.launchReady, true);
  assert.equal(report.launchActionMode, 'External');
});

test('Embedded with legal URL is Launch Ready', () => {
  const report = validate({ 'Launch Mode': 'Embedded', 'Demo URL': 'https://example.com/demo' });
  assert.equal(report.launchReady, true);
  assert.equal(report.launchActionMode, 'Embedded');
});

test('External with invalid URL is not Launch Ready', () => {
  const report = validate({ 'Launch Mode': 'External', 'Demo URL': 'javascript:alert(1)' });
  assert.equal(report.launchReady, false);
  assert.equal(report.launchActionMode, null);
});

test('Internal registered slug is Launch Ready', () => {
  const report = validate({ 'Launch Mode': 'Internal', Slug: 'demo-one', 'Demo URL': '' }, {
    internalRegistry: { 'demo-one': () => null },
  });
  assert.equal(report.launchReady, true);
  assert.equal(report.launchActionMode, 'Internal');
});

test('Internal unregistered slug is not Launch Ready', () => {
  const report = validate({ 'Launch Mode': 'Internal', Slug: 'demo-one', 'Demo URL': '' }, {
    internalRegistry: {},
  });
  assert.equal(report.launchReady, false);
  assert.equal(report.launchActionMode, null);
});

test('blank Launch Mode with legal URL safely behaves as External', () => {
  const report = validate({ 'Launch Mode': '', 'Demo URL': 'https://example.com/demo' });
  assert.equal(report.launchReady, true);
  assert.equal(report.launchActionMode, 'External');
});

test('optional fields do not block Showcase', () => {
  const report = validate({
    Version: '',
    'Cover Image': [],
    'GitHub URL': '',
    'Research Link': '',
  });
  assert.equal(report.showcaseReady, true);
  assert.deepEqual(report.blockers, []);
  assert.ok(report.warnings.includes('missing_version'));
  assert.ok(report.warnings.includes('missing_cover'));
});

test('Demo API omits Visibility, Notes, record IDs, and validation details', () => {
  const payload = normalizePublicAirtableDemos([makeDemoRecord()]);
  assert.equal(payload.length, 1);

  const serialized = JSON.stringify(payload[0]).toLowerCase();
  assert.equal(serialized.includes('visibility'), false);
  assert.equal(serialized.includes('private notes'), false);
  assert.equal(serialized.includes('recsecretdemo'), false);
  assert.equal(serialized.includes('blockers'), false);
  assert.equal(serialized.includes('warnings'), false);
});

test('Demo endpoint uses short CDN cache for healthy Airtable payload', () => {
  const response = createFakeResponse();
  sendDemoJsonResponse({ method: 'GET' }, response, {
    source: 'airtable',
    reason: null,
    items: [],
    data: [],
    count: 0,
    updatedAt: null,
  });

  assert.equal(response.headers['cache-control'], DEMO_SUCCESS_CACHE_CONTROL);
});
