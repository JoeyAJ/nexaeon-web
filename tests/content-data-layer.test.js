import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContentItem,
  normalizeIsoDate,
  normalizeStringArray,
  sanitizeContentMetadata,
  validateContentItem,
} from '../lib/content/contentSchema.js';
import {
  localizedTextFromLegacy,
  normalizeContentLocale,
  normalizeLocalizedText,
  resolveLocalizedText,
  resolveLocalizedTextDetailed,
} from '../lib/content/localization.js';
import { createContentRepository, createContentRepositoryFromPublicPayloads } from '../lib/content/contentRepository.js';
import { adaptAirtableItem } from '../lib/content/sourceAdapters/airtableAdapter.js';
import { adaptLocalItem } from '../lib/content/sourceAdapters/localAdapter.js';
import { adaptNotionItem } from '../lib/content/sourceAdapters/notionAdapter.js';
import { adaptPublicApiItem, adaptPublicApiPayload } from '../lib/content/sourceAdapters/publicApiAdapter.js';
import { filterPublishedContent, normalizeVisibilityStatus } from '../lib/content/visibility.js';
import { createKnowledgeDocumentsFromPayloads } from '../lib/agent/knowledgeDocuments.js';

function contentInput(overrides = {}) {
  return {
    id: 'research:item-1', source: 'notion', sourceId: 'item-1', module: 'research',
    contentType: 'research_literature', title: { 'zh-Hant': '研究標題', ko: '연구 제목', en: 'Research title' },
    summary: { en: 'Summary' }, visibility: 'Published', workflowStatus: 'Reading',
    tags: ['AI', ' AI ', 'Research'], categories: ['Literature'], updatedAt: '2026-07-16T01:00:00Z',
    metadata: { theory: 'TAM' }, ...overrides,
  };
}

test('valid ContentItem normalizes core fields and preserves metadata', () => {
  const result = createContentItem(contentInput());
  assert.equal(result.ok, true);
  assert.equal(result.item.status, 'published');
  assert.deepEqual(result.item.tags, ['AI', 'Research']);
  assert.equal(result.item.updatedAt, '2026-07-16T01:00:00.000Z');
  assert.equal(result.item.metadata.theory, 'TAM');
});

test('missing required id and title are isolated safely', () => {
  assert.equal(createContentItem(contentInput({ id: '' })).ok, false);
  assert.equal(createContentItem(contentInput({ title: {} })).ok, false);
  assert.deepEqual(validateContentItem(null).issues, ['invalid_item']);
});

test('invalid status is fail-closed and never public', () => {
  const result = createContentItem(contentInput({ visibility: 'mystery' }));
  assert.equal(result.ok, true);
  assert.equal(result.item.status, 'hidden');
  assert.deepEqual(filterPublishedContent([result.item]), []);
});

test('invalid dates become undefined without crashing', () => {
  assert.equal(normalizeIsoDate('not-a-date'), undefined);
  assert.equal(createContentItem(contentInput({ updatedAt: 'bad date' })).item.updatedAt, undefined);
});

test('source-specific and sensitive metadata cannot pollute core output', () => {
  const metadata = sanitizeContentMetadata({ theory: 'TAM', API_KEY: 'secret', databaseId: 'db', raw: { title: 'private' }, nested: { safe: true } });
  assert.deepEqual(metadata, { theory: 'TAM', nested: { safe: true } });
  const item = createContentItem(contentInput({ randomSourceColumn: 'ignored' })).item;
  assert.equal('randomSourceColumn' in item, false);
});

test('tags and categories normalize arrays, scalars, whitespace, and duplicates', () => {
  assert.deepEqual(normalizeStringArray([' AI ', ['ai', 'TAM'], '', null]), ['AI', 'TAM']);
  assert.deepEqual(normalizeStringArray('Research'), ['Research']);
});

test('core locale aliases normalize to zh-Hant, ko, and en', () => {
  assert.equal(normalizeContentLocale('zh-TW'), 'zh-Hant');
  assert.equal(normalizeContentLocale('zh'), 'zh-Hant');
  assert.equal(normalizeContentLocale('kr'), 'ko');
  assert.equal(normalizeContentLocale('eng'), 'en');
});

test('localized resolver supports all three locales and deterministic fallback', () => {
  const value = { 'zh-Hant': '中文', ko: '한국어', en: 'English' };
  assert.equal(resolveLocalizedText(value, 'zh'), '中文');
  assert.equal(resolveLocalizedText(value, 'ko'), '한국어');
  assert.equal(resolveLocalizedText(value, 'en'), 'English');
  assert.equal(resolveLocalizedText({ 'zh-Hant': '只有中文' }, 'ko'), '只有中文');
  assert.equal(resolveLocalizedTextDetailed({ en: 'Only English' }, 'ko').usedFallback, true);
});

test('empty translations are not treated as completed translations', () => {
  assert.deepEqual(normalizeLocalizedText({ zh: '中文', ko: ' ', en: '' }), { 'zh-Hant': '中文' });
});

test('legacy translation keys and nested demo translations normalize centrally', () => {
  const legacy = localizedTextFromLegacy({ titleZh: '中文', titleKo: '한국어', titleEn: 'English' }, 'title');
  assert.deepEqual(legacy, { 'zh-Hant': '中文', ko: '한국어', en: 'English' });
  const demo = localizedTextFromLegacy({ translations: { zh: { name: '展示' }, en: { name: 'Demo' } } }, 'name');
  assert.equal(resolveLocalizedText(demo, 'en'), 'Demo');
});

test('visibility policy separates Published, Draft, Hidden, archived, and unknown', () => {
  assert.equal(normalizeVisibilityStatus('Published'), 'published');
  assert.equal(normalizeVisibilityStatus('live'), 'published');
  assert.equal(normalizeVisibilityStatus('Draft'), 'draft');
  assert.equal(normalizeVisibilityStatus('Hidden'), 'hidden');
  assert.equal(normalizeVisibilityStatus('archived'), 'hidden');
  assert.equal(normalizeVisibilityStatus('unexpected'), 'hidden');
});

const adapterCases = [
  ['identity', { id: 'joey', name: 'Joey', shortPositioning: 'Researcher' }, 'identity', 'identity_profile'],
  ['research', { id: 'paper', title: 'Paper', summaryEn: 'Summary', status: 'Reading' }, 'research', 'research_literature'],
  ['teaching', { id: 'course', title: 'Course', summary: 'Learning' }, 'coaching', 'coaching_material'],
  ['knowledge', { id: 'note', title: 'Note', sourceDatabase: 'inspiration' }, 'knowledge', 'inspiration'],
  ['demos', { id: 'demo', slug: 'demo', translations: { zh: { name: '展示' }, ko: { name: '데모' }, en: { name: 'Demo' } } }, 'prototype', 'demo'],
  ['action', { id: 'task', name: 'Task', publicSummary: 'Do it', progress: 25 }, 'action', 'task'],
  ['collaboration', { id: 'option', title: 'Collaboration' }, 'identity', 'collaboration_option'],
];

for (const [sourceId, item, module, contentType] of adapterCases) {
  test(`${sourceId} public adapter maps to unified module and content type`, () => {
    const result = adaptPublicApiItem(sourceId, item, { source: sourceId === 'demos' ? 'airtable' : 'notion' });
    assert.equal(result.ok, true);
    assert.equal(result.item.module, module);
    assert.equal(result.item.contentType, contentType);
    assert.equal(result.item.status, 'published');
  });
}

test('named Notion, Airtable, and local adapters retain explicit source provenance', () => {
  assert.equal(adaptNotionItem('research', { id: 'n1', title: 'Notion' }).item.source, 'notion');
  assert.equal(adaptAirtableItem('demos', { id: 'a1', slug: 'demo', name: 'Airtable' }).item.source, 'airtable');
  assert.equal(adaptLocalItem('research', { id: 'l1', title: 'Local' }).item.source, 'fallback');
});

test('adapter isolates malformed items and records only safe issue codes', () => {
  const adapted = adaptPublicApiPayload('research', { source: 'notion', items: [null, { id: '', title: '' }, { id: 'ok', title: 'Valid' }] });
  assert.equal(adapted.items.length, 1);
  assert.equal(adapted.warnings.length, 2);
  assert.deepEqual(Object.keys(adapted.warnings[0]).sort(), ['index', 'issueCodes', 'sourceId']);
});

test('explicit Draft and Hidden records never enter repository or Agent context', () => {
  const payloads = {
    research: { source: 'notion', items: [
      { id: 'published', title: 'Public research', visibility: 'Published' },
      { id: 'draft', title: 'Draft research', visibility: 'Draft' },
      { id: 'hidden', title: 'Hidden research', visibility: 'Hidden' },
    ] },
  };
  const repository = createContentRepositoryFromPublicPayloads(payloads);
  assert.deepEqual(repository.list().map((item) => item.sourceId), ['published']);
  assert.deepEqual(repository.getAgentContext(['research']).map((item) => item.sourceId), ['published']);
  assert.deepEqual(createKnowledgeDocumentsFromPayloads(payloads, 'en').map((item) => item.canonicalId), ['published']);
});

test('repository filters modules, types, source, tags, categories, and locale', () => {
  const a = createContentItem(contentInput({ id: 'research:a', sourceId: 'a', tags: ['AI'], categories: ['Paper'] })).item;
  const b = createContentItem(contentInput({ id: 'knowledge:b', sourceId: 'b', module: 'knowledge', contentType: 'knowledge_note', title: { en: 'Note' }, tags: ['TAM'], categories: ['Note'] })).item;
  const repository = createContentRepository({ items: [a, b] });
  assert.equal(repository.getContentByModule('research').length, 1);
  assert.equal(repository.getContentByType('knowledge_note').length, 1);
  assert.equal(repository.list({ tags: ['tam'] })[0].id, 'knowledge:b');
  assert.equal(repository.list({ categories: ['paper'] })[0].id, 'research:a');
  assert.equal(repository.list({ module: 'research', locale: 'en' })[0].localized.title, 'Research title');
});

test('repository de-duplicates ids, keeps newest item, orders stably, and supports limit/offset', () => {
  const old = createContentItem(contentInput({ id: 'same', sourceId: 'same', title: { en: 'Old' }, updatedAt: '2026-01-01' })).item;
  const latest = createContentItem(contentInput({ id: 'same', sourceId: 'same', title: { en: 'New' }, updatedAt: '2026-02-01' })).item;
  const other = createContentItem(contentInput({ id: 'other', sourceId: 'other', title: { en: 'Other' }, updatedAt: '2026-03-01' })).item;
  const repository = createContentRepository({ items: [old, latest, other] });
  assert.deepEqual(repository.list().map((item) => item.id), ['other', 'same']);
  assert.equal(resolveLocalizedText(repository.list({ limit: 1, offset: 1 })[0].title, 'en'), 'New');
});

test('repository reports source partial failure without dropping healthy sources', () => {
  const repository = createContentRepositoryFromPublicPayloads({
    identity: { source: 'notion', reason: null, items: [{ id: 'joey', name: 'Joey' }] },
    knowledge: { source: 'notion', reason: 'partial_source_failure', items: [{ id: 'note', title: 'Note' }] },
  });
  assert.equal(repository.list().length, 2);
  assert.equal(repository.diagnostics.sources.find((source) => source.sourceId === 'knowledge').partial, true);
});

test('repository search and agent context preserve citations and merge supporting scopes', () => {
  const repository = createContentRepositoryFromPublicPayloads({
    research: { source: 'notion', items: [{ id: 'paper', title: 'AI Tutor Research', sourceUrl: 'https://example.com/paper' }] },
    teaching: { source: 'notion', items: [{ id: 'course', title: 'AI Tutor Course' }] },
  });
  assert.equal(repository.searchContent('AI Tutor', { locale: 'en' }).length, 2);
  const context = repository.getAgentContext(['research', 'teaching']);
  assert.equal(context.length, 2);
  assert.ok(context.find((item) => item.sourceId === 'paper').sourceUrl);
});

test('agent context remains bounded by caller limit', () => {
  const items = Array.from({ length: 20 }, (_, index) => ({ id: `p${index}`, title: `Paper ${index}` }));
  const repository = createContentRepositoryFromPublicPayloads({ research: { source: 'notion', items } });
  assert.equal(repository.getAgentContext(['research'], { limit: 5 }).length, 5);
});
