import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARCHIVIST_TOOL_NAMES,
  buildArchivistConceptMap,
  executeArchivistKnowledgeTool,
  filterKnowledgeItems,
  findRelatedKnowledge,
  groupKnowledgeByTheme,
  listKnowledgeTopics,
  loadPublicKnowledgeItems,
  normalizeKnowledgeToolItem,
  searchKnowledgeItems,
} from '../lib/agent/archivistKnowledgeTools.js';

const publicItems = [
  {
    id: 'note-ai-tutor', title: 'AI Tutor Note', summary: 'Personalized learning support.',
    visibility: 'Published', type: 'research_note', category: 'AI Education',
    tags: ['AI Tutor', 'Personalization'], sourceDatabase: 'research',
    explicitRelationIds: ['case-ai-tutor'], updatedAt: '2026-07-01',
  },
  {
    id: 'case-ai-tutor', title: 'AI Tutor Classroom Case', summary: 'A classroom case.',
    publicStatus: 'Public', type: 'case', category: 'AI Education',
    tags: ['AI Tutor', 'Classroom'], sourceDatabase: 'inspiration', updatedAt: '2026-06-01',
  },
  {
    id: 'tool-reflection', title: 'Reflection Tool', summary: 'Reflection prompts.',
    visibility: 'Live', type: 'tool', category: 'Learning Design',
    tags: ['Reflection', 'Personalization'], sourceDatabase: 'teaching', updatedAt: '2025-05-01',
  },
];

function knowledgeData() {
  return { sourcePlatform: 'notion', items: publicItems.map((item) => normalizeKnowledgeToolItem(item, 'notion')) };
}

test('Knowledge tools expose the exact read-only Archivist allowlist', () => {
  assert.deepEqual(ARCHIVIST_TOOL_NAMES, [
    'searchKnowledgeItems', 'getKnowledgeItem', 'filterKnowledgeItems',
    'listKnowledgeTopics', 'findRelatedKnowledge', 'groupKnowledgeByTheme',
  ]);
  assert.throws(() => executeArchivistKnowledgeTool('deleteKnowledgeItem', {}, { items: [] }), /archivist_tool_not_allowed/);
});

test('Knowledge normalization excludes Draft, Hidden, Private, Archived, and unknown explicit visibility', () => {
  for (const visibility of ['Draft', 'Hidden', 'Private', 'Archived', 'Other', '']) {
    assert.equal(normalizeKnowledgeToolItem({ id: `blocked-${visibility}`, title: 'Blocked', visibility }, 'notion'), null);
  }
  assert.equal(normalizeKnowledgeToolItem(publicItems[0], 'notion').id, 'note-ai-tutor');
});

test('public Knowledge loader keeps normalized Notion provenance and omits blocked records', async () => {
  const loaded = await loadPublicKnowledgeItems({
    getKnowledgeResourcesImpl: async () => ({
      source: 'notion',
      items: [...publicItems, { id: 'private', title: 'Private', visibility: 'Private' }],
    }),
  });
  assert.equal(loaded.sourcePlatform, 'notion');
  assert.deepEqual(loaded.items.map(({ id }) => id), ['note-ai-tutor', 'case-ai-tutor', 'tool-reflection']);
  assert.equal(loaded.items[0].sourceDatabase, 'research');
  assert.equal('visibility' in loaded.items[0], false);
});

test('Knowledge search, filters, topics, and grouping are deterministic', () => {
  const data = knowledgeData();
  assert.deepEqual(searchKnowledgeItems(data, { query: 'classroom' }).items.map(({ id }) => id), ['case-ai-tutor']);
  assert.deepEqual(filterKnowledgeItems(data, { contentType: 'tool', year: 2025 }).items.map(({ id }) => id), ['tool-reflection']);
  assert.ok(listKnowledgeTopics(data).topics.some(({ name }) => name === 'AI Tutor'));
  const groups = groupKnowledgeByTheme(data, {}).groups;
  assert.deepEqual(groups.find(({ theme }) => theme === 'AI Education').itemIds, ['note-ai-tutor', 'case-ai-tutor']);
});

test('related Knowledge distinguishes explicit database facts from inferred possible relations', () => {
  const result = findRelatedKnowledge(knowledgeData(), { id: 'note-ai-tutor' });
  const explicit = result.relations.find(({ targetId }) => targetId === 'case-ai-tutor');
  const inferred = result.relations.find(({ targetId }) => targetId === 'tool-reflection');
  assert.equal(explicit.evidenceType, 'database_explicit');
  assert.equal(explicit.inferred, false);
  assert.equal(explicit.confidence, 1);
  assert.equal(inferred.relationType, 'possible_shared_theme');
  assert.equal(inferred.evidenceType, 'inferred_similarity');
  assert.equal(inferred.inferred, true);

  const conceptMap = buildArchivistConceptMap([result]);
  assert.equal(conceptMap.nodes.length, 3);
  assert.deepEqual(conceptMap.sourceIds, ['note-ai-tutor', 'case-ai-tutor', 'tool-reflection']);
  assert.ok(conceptMap.relationships.some(({ evidenceType }) => evidenceType === 'database_explicit'));
  assert.ok(conceptMap.relationships.some(({ evidenceType }) => evidenceType === 'inferred_similarity'));
});

test('Knowledge source failures and empty results remain explicit', async () => {
  await assert.rejects(() => loadPublicKnowledgeItems({ getKnowledgeResourcesImpl: async () => ({ source: 'notion' }) }), /knowledge_source_invalid/);
  const result = searchKnowledgeItems({ sourcePlatform: 'notion', items: [] }, { query: 'nothing' });
  assert.equal(result.count, 0);
  assert.deepEqual(result.items, []);
});
