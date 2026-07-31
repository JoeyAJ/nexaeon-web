import assert from 'node:assert/strict';
import test from 'node:test';

import {
  XCHANGE_TOOL_NAMES,
  executeXchangeLearningTool,
  filterLearningMaterials,
  listCourseStructures,
  listLearningTopics,
  loadPublicLearningMaterials,
  normalizeLearningToolItem,
  searchLearningMaterials,
} from '../lib/agent/xchangeLearningTools.js';

const publicItems = [
  {
    id: 'public-course',
    title: 'AI Literacy Coaching Workshop',
    summary: 'A reflection-led AI literacy workshop.',
    visibility: 'Published',
    teachingCategory: 'Workshop',
    format: ['Coaching', 'Reflection'],
    targetAudience: ['University students'],
    difficulty: 'Beginner',
    language: ['English'],
    tags: ['AI literacy', 'Reflection'],
    updatedAt: '2026-07-01',
  },
  {
    id: 'public-activity',
    title: 'Prompt Critique Activity',
    summary: 'Learners compare and revise prompts.',
    publicStatus: 'Public',
    courseType: 'Activity',
    teachingMethods: ['Peer feedback'],
    targetAudience: ['Teachers'],
    difficulty: 'Intermediate',
    language: ['English'],
    tags: ['Prompt engineering'],
  },
];

test('Learning tools expose the exact read-only Xchange allowlist', () => {
  assert.deepEqual(XCHANGE_TOOL_NAMES, [
    'searchLearningMaterials',
    'getLearningMaterial',
    'filterLearningMaterials',
    'listLearningTopics',
    'listCourseStructures',
  ]);
  assert.throws(
    () => executeXchangeLearningTool('deleteLearningMaterial', {}, { items: [] }),
    /xchange_tool_not_allowed/,
  );
});

test('Learning normalization excludes Draft, Hidden, Private, Archived, and unknown explicit visibility', () => {
  for (const visibility of ['Draft', 'Hidden', 'Private', 'Archived', 'Other', '']) {
    assert.equal(normalizeLearningToolItem({
      id: `blocked-${visibility}`,
      title: 'Blocked',
      visibility,
    }, 'notion'), null);
  }
  assert.equal(normalizeLearningToolItem(publicItems[0], 'notion').id, 'public-course');
  assert.equal(normalizeLearningToolItem(publicItems[1], 'notion').id, 'public-activity');
});

test('public Learning source loader preserves only safe normalized schema fields', async () => {
  const loaded = await loadPublicLearningMaterials({
    getTeachingCoursesImpl: async () => ({
      source: 'notion',
      items: [
        ...publicItems,
        { id: 'draft', title: 'Draft lesson', visibility: 'Draft' },
      ],
    }),
  });
  assert.equal(loaded.sourcePlatform, 'notion');
  assert.deepEqual(loaded.items.map(({ id }) => id), ['public-course', 'public-activity']);
  assert.equal(loaded.items[0].sourcePlatform, 'notion');
  assert.deepEqual(loaded.items[0].targetAudience, ['University students']);
  assert.equal('notes' in loaded.items[0], false);
});

test('search, schema filters, topics, and course structures return deterministic public results', () => {
  const data = {
    sourcePlatform: 'notion',
    items: publicItems.map((item) => normalizeLearningToolItem(item, 'notion')),
  };
  assert.deepEqual(searchLearningMaterials(data, { query: 'reflection' }).items.map(({ id }) => id), ['public-course']);
  assert.deepEqual(filterLearningMaterials(data, {
    audience: 'Teachers',
    difficulty: 'Intermediate',
    teachingMethod: 'Peer',
  }).items.map(({ id }) => id), ['public-activity']);
  assert.ok(listLearningTopics(data, {}).topics.some(({ name }) => name === 'AI literacy'));
  assert.deepEqual(listCourseStructures(data, { courseType: 'Workshop' }).items.map(({ id }) => id), ['public-course']);
});

test('Learning source failures and empty results remain explicit', async () => {
  await assert.rejects(
    () => loadPublicLearningMaterials({ getTeachingCoursesImpl: async () => ({ source: 'notion' }) }),
    /learning_source_invalid/,
  );
  const result = searchLearningMaterials({ sourcePlatform: 'notion', items: [] }, { query: 'nothing' });
  assert.equal(result.count, 0);
  assert.deepEqual(result.items, []);
});
