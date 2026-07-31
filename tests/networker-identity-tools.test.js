import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NETWORKER_TOOL_NAMES,
  buildNetworkerCollaborationMap,
  buildNetworkerFactClassification,
  compareIdentityProfiles,
  executeNetworkerIdentityTool,
  filterIdentityProfiles,
  findPotentialConnections,
  listIdentityTopics,
  listOrganizations,
  loadPublicIdentityProfiles,
  normalizeIdentityToolProfile,
  searchIdentityProfiles,
} from '../lib/agent/networkerIdentityTools.js';
import { normalizeIdentityProfile } from '../lib/identityProfiles.js';

const rawProfiles = [
  {
    id: 'profile-joey', name: 'Joey', publicStatus: 'Public', identityType: 'Researcher',
    shortPositioning: 'AI education researcher and learning-system builder.',
    expertise: ['AI Education', 'Learning Analytics'], researchInterests: ['AI Tutor'],
    organizations: ['NexAeon'], collaborationInterests: ['Research', 'Teaching'],
    projects: ['Tutor MVP'], languages: ['English', 'Korean'], region: 'Daejeon',
    publicContact: ['public@example.org'], profileUrl: 'https://example.org/joey',
  },
  {
    id: 'profile-institute', name: 'NexAeon Institute', publicStatus: 'Published', identityType: 'Organization',
    shortPositioning: 'Digital institute for research and practice.',
    expertise: ['Knowledge Systems'], researchInterests: ['AI Tutor'],
    organizations: ['NexAeon'], collaborationInterests: ['Research'],
    projects: ['Knowledge Lab'], languages: ['English'], region: 'Daejeon',
  },
];

function data() {
  return { sourcePlatform: 'notion', items: rawProfiles.map((item) => normalizeIdentityToolProfile(item, 'notion')) };
}

test('Networker exposes exactly eight read-only Identity tools and rejects action tools', () => {
  assert.deepEqual(NETWORKER_TOOL_NAMES, [
    'searchIdentityProfiles', 'getIdentityProfile', 'filterIdentityProfiles', 'listIdentityTopics',
    'listOrganizations', 'findPotentialConnections', 'compareIdentityProfiles', 'buildCollaborationMap',
  ]);
  for (const name of ['sendEmail', 'createContact', 'createCalendarEvent', 'scrapeLinkedIn', 'updateNotion']) {
    assert.throws(() => executeNetworkerIdentityTool(name, {}, { items: [] }), /networker_tool_not_allowed/);
  }
});

test('normalization fails closed and excludes private contact, notes, secrets, and unsafe URLs', () => {
  for (const visibility of ['Draft', 'Hidden', 'Private', 'Archived', 'Unknown', '']) {
    assert.equal(normalizeIdentityToolProfile({ id: visibility, name: 'Blocked', publicStatus: visibility }, 'notion'), null);
  }
  const item = normalizeIdentityToolProfile({
    ...rawProfiles[0],
    shortPositioning: 'private@example.com token=secret-value',
    email: 'private@example.com', phone: '+82 10 1234 5678', address: 'Private address', internalNotes: 'secret',
    publicContact: ['public@example.org'], profileUrl: 'https://notion.so/private',
  }, 'notion');
  assert.deepEqual(item.publicContact, ['public@example.org']);
  assert.equal(item.profileUrl, '');
  assert.doesNotMatch(JSON.stringify(item), /private@example|secret-value|1234 5678|Private address|internalNotes/);
  for (const key of ['email', 'phone', 'address', 'internalNotes', 'publicStatus']) assert.equal(key in item, false);
});

test('missing optional Notion fields never borrow unrelated select or rich-text values', () => {
  const item = normalizeIdentityProfile({
    properties: {
      Name: { type: 'title', title: [{ plain_text: 'Exact-only Profile' }] },
      Status: { type: 'select', select: { name: 'Published' } },
      Description: { type: 'rich_text', rich_text: [{ plain_text: 'Public profile summary, not a contact channel.' }] },
      Featured: { type: 'checkbox', checkbox: false },
      Order: { type: 'number', number: 3 },
    },
    created_time: '2026-07-31T00:00:00.000Z',
    last_edited_time: '2026-07-31T00:00:00.000Z',
  });

  assert.deepEqual(item.organizations, []);
  assert.equal(item.region, '');
  assert.deepEqual(item.publicContact, []);
  assert.equal(item.profileUrl, '');
  assert.equal(item.shortPositioning, 'Public profile summary, not a contact channel.');
});

test('loader reuses public Identity Profiles and returns only normalized public fields', async () => {
  const loaded = await loadPublicIdentityProfiles({ getIdentityProfilesImpl: async () => ({
    source: 'notion', items: [...rawProfiles, { id: 'private', name: 'Private', publicStatus: 'Private' }],
  }) });
  assert.equal(loaded.sourcePlatform, 'notion');
  assert.deepEqual(loaded.items.map(({ id }) => id), ['profile-joey', 'profile-institute']);
  assert.equal(loaded.items[0].sourceDatabase, 'identity-profiles');
  assert.deepEqual(loaded.items[0].publicContact, ['public@example.org']);
});

test('search, filters, topics, organizations, comparison, and connection analysis are deterministic', () => {
  const publicData = data();
  assert.deepEqual(searchIdentityProfiles(publicData, { query: 'Learning Analytics' }).items.map(({ id }) => id), ['profile-joey']);
  assert.deepEqual(filterIdentityProfiles(publicData, { language: 'Korean', region: 'Daejeon' }).items.map(({ id }) => id), ['profile-joey']);
  assert.ok(listIdentityTopics(publicData).topics.some(({ name }) => name === 'AI Tutor'));
  assert.ok(listOrganizations(publicData).organizations.some(({ name }) => name === 'NexAeon'));
  const comparison = compareIdentityProfiles(publicData, { profileIds: ['profile-joey', 'profile-institute'] });
  assert.deepEqual(comparison.comparison.sharedInterests, ['AI Tutor', 'Research']);
  assert.equal(comparison.comparison.verificationStatus, 'inferred');
  const connections = findPotentialConnections(publicData, { profileId: 'profile-joey' });
  assert.equal(connections.connections[0].status, 'inferred');
});

test('classification and collaboration map keep relationships inferred or recommended, never verified', () => {
  const results = [executeNetworkerIdentityTool('buildCollaborationMap', { objective: 'Build a collaboration map' }, data())];
  const facts = buildNetworkerFactClassification(results, { lang: 'en' });
  assert.equal(facts.verified.length, 2);
  assert.ok(facts.inferred.length && facts.recommended.length && facts.unknown.length);
  assert.match(facts.unknown[0].text, /does not confirm willingness/i);
  const map = buildNetworkerCollaborationMap(results, { query: 'Build a collaboration map' });
  assert.equal(map.verificationStatus, 'unverified');
  assert.equal(map.nodes.length, 2);
  assert.ok(map.nodes.every(({ verificationStatus }) => verificationStatus === 'verified'));
  assert.ok(map.proposedRelations.every(({ status }) => ['inferred', 'recommended'].includes(status)));
  assert.doesNotMatch(JSON.stringify(map), /willing|consented|contacted|introduced|matched/iu);
});

test('empty and invalid Identity sources remain explicit', async () => {
  await assert.rejects(() => loadPublicIdentityProfiles({ getIdentityProfilesImpl: async () => ({ source: 'notion' }) }), /identity_source_invalid/);
  assert.deepEqual(searchIdentityProfiles({ sourcePlatform: 'notion', items: [] }, { query: 'nothing' }).items, []);
});
