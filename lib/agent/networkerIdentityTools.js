import { getIdentityProfiles } from '../identityProfiles.js';
import { isPublishedVisibility } from '../content/visibility.js';
import { getValidatedDemoUrl } from '../../src/lib/demoRuntime.js';

export const NETWORKER_TOOL_NAMES = Object.freeze([
  'searchIdentityProfiles', 'getIdentityProfile', 'filterIdentityProfiles', 'listIdentityTopics',
  'listOrganizations', 'findPotentialConnections', 'compareIdentityProfiles', 'buildCollaborationMap',
]);

export const NETWORKER_TOOL_DEFINITIONS = Object.freeze([
  { type: 'function', name: 'searchIdentityProfiles', description: 'Search currently public Identity Profiles by public identity, expertise, research interest, organization, region, language, or collaboration interest.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['query'], additionalProperties: false } },
  { type: 'function', name: 'getIdentityProfile', description: 'Retrieve one currently public Identity Profile by its public identifier.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } },
  { type: 'function', name: 'filterIdentityProfiles', description: 'Filter public Identity Profiles using fields that actually exist in the public schema.', parameters: { type: 'object', properties: { expertise: { type: 'string' }, researchInterest: { type: 'string' }, organization: { type: 'string' }, region: { type: 'string' }, language: { type: 'string' }, collaborationType: { type: 'string' }, identityType: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, additionalProperties: false } },
  { type: 'function', name: 'listIdentityTopics', description: 'List topics explicitly represented by public expertise, research-interest, role-tag, and collaboration-interest fields.', parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false } },
  { type: 'function', name: 'listOrganizations', description: 'List organizations explicitly represented by currently public Identity Profiles.', parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false } },
  { type: 'function', name: 'findPotentialConnections', description: 'Analyze shared public interests and complementary capabilities as possible connections; never assert willingness, consent, availability, or a private relationship.', parameters: { type: 'object', properties: { query: { type: 'string' }, profileId: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, additionalProperties: false } },
  { type: 'function', name: 'compareIdentityProfiles', description: 'Compare two public Identity Profiles using only their supplied public fields.', parameters: { type: 'object', properties: { profileIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 } }, required: ['profileIds'], additionalProperties: false } },
  { type: 'function', name: 'buildCollaborationMap', description: 'Build a read-only collaboration-map structure with verified nodes and inferred or recommended proposed relations.', parameters: { type: 'object', properties: { objective: { type: 'string' }, profileIds: { type: 'array', items: { type: 'string' }, maxItems: 12 }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['objective'], additionalProperties: false } },
]);

const TOOL_NAME_SET = new Set(NETWORKER_TOOL_NAMES);
const MAX_ITEMS = 12;
const SECRET_PATTERN = /\b(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+)/giu;
const PRIVATE_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PRIVATE_PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/gu;

function cleanText(value, limit = 2000, { allowContact = false } = {}) {
  let text = String(value || '').replace(SECRET_PATTERN, '[redacted]');
  if (!allowContact) text = text.replace(PRIVATE_EMAIL_PATTERN, '[redacted]').replace(PRIVATE_PHONE_PATTERN, '[redacted]');
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanArray(value, limit = 40, options) {
  const input = Array.isArray(value) ? value.flat(Infinity) : value ? [value] : [];
  const output = []; const seen = new Set();
  for (const raw of input) {
    const text = cleanText(typeof raw === 'object' ? raw?.name || raw?.title || '' : raw, 240, options);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key); output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

function cleanLimit(value, fallback = 8, maximum = MAX_ITEMS) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function safeDate(value) {
  const text = cleanText(value, 80);
  if (!text) return '';
  return Number.isNaN(new Date(text).getTime()) ? '' : text;
}

function safePublicUrl(value) {
  const validated = getValidatedDemoUrl(value, { environment: 'production' });
  if (!validated) return '';
  try {
    const url = new URL(validated);
    if (url.username || url.password || !/^https:$/u.test(url.protocol)) return '';
    if (/(^|\.)(?:airtable\.com|notion\.so)$/u.test(url.hostname)) return '';
    if (/^(?:localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/u.test(url.hostname) || /^(?:\[?::1\]?)$/u.test(url.hostname)) return '';
    for (const key of url.searchParams.keys()) if (/token|key|secret|password/iu.test(key)) return '';
    return url.href;
  } catch { return ''; }
}

function getExplicitVisibility(item) {
  for (const key of ['visibility', 'publicStatus', '公開狀態', 'Public Status']) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key];
  }
  return undefined;
}

export function normalizeIdentityToolProfile(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const visibility = getExplicitVisibility(item);
  if (visibility !== undefined && !isPublishedVisibility(visibility)) return null;
  const id = cleanText(item.id, 240);
  const displayName = cleanText(item.displayName || item.name || item.title, 320);
  if (!id || !displayName) return null;
  return {
    id, displayName,
    identityType: cleanText(item.identityType || item.type, 160) || 'Identity',
    identitySummary: cleanText(item.identitySummary || item.shortPositioning || item.fullIntroduction || item.summary, 1800),
    expertise: cleanArray(item.expertise || item.roleTags),
    researchInterests: cleanArray(item.researchInterests),
    organizations: cleanArray(item.organizations || item.affiliation),
    collaborationInterests: cleanArray(item.collaborationInterests),
    projects: cleanArray(item.projects || item.relatedModules),
    languages: cleanArray(item.languages),
    region: cleanText(item.region, 240),
    publicContact: cleanArray(item.publicContact || item.publicContactChannel, 8, { allowContact: true }),
    profileUrl: safePublicUrl(item.profileUrl || item.externalUrl),
    corePhilosophy: cleanText(item.corePhilosophy, 1200),
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback', sourceDatabase: 'identity-profiles',
    sourceRoute: '/identity', sourceUrl: safePublicUrl(item.profileUrl || item.externalUrl),
    updatedAt: safeDate(item.updatedAt),
  };
}

export async function loadPublicIdentityProfiles({ getIdentityProfilesImpl = getIdentityProfiles } = {}) {
  const payload = await getIdentityProfilesImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) throw new Error('identity_source_invalid');
  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  return { sourcePlatform, reason: cleanText(payload.reason, 80) || null, items: (payload.items || payload.data).map((item) => normalizeIdentityToolProfile(item, sourcePlatform)).filter(Boolean) };
}

function searchableText(item) {
  return [item.id, item.displayName, item.identityType, item.identitySummary, item.region, item.corePhilosophy, ...item.expertise, ...item.researchInterests, ...item.organizations, ...item.collaborationInterests, ...item.projects, ...item.languages].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  return [...new Set(cleanText(value, 500).toLocaleLowerCase().split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1))];
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

function selectByIds(data, profileIds, limit) {
  const ids = new Set(cleanArray(profileIds).map((id) => id.toLocaleLowerCase()));
  const selected = ids.size ? data.items.filter((item) => ids.has(item.id.toLocaleLowerCase())) : data.items;
  return selected.slice(0, cleanLimit(limit));
}

export function searchIdentityProfiles(data, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const items = data.items.map((item) => ({ item, score: tokens.reduce((sum, token) => sum + (searchableText(item).includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => !tokens.length || score > 0).sort((a, b) => b.score - a.score || a.item.displayName.localeCompare(b.item.displayName))
    .slice(0, cleanLimit(limit)).map(({ item }) => item);
  return { ok: true, tool: 'searchIdentityProfiles', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function getIdentityProfile(data, { id = '' } = {}) {
  const normalized = cleanText(id, 240).toLocaleLowerCase();
  const item = data.items.find((candidate) => candidate.id.toLocaleLowerCase() === normalized);
  return { ok: true, tool: 'getIdentityProfile', sourcePlatform: data.sourcePlatform, count: item ? 1 : 0, items: item ? [item] : [] };
}

export function filterIdentityProfiles(data, filters = {}) {
  const items = data.items.filter((item) => includesText(item.expertise.join(' '), filters.expertise)
    && includesText(item.researchInterests.join(' '), filters.researchInterest)
    && includesText(item.organizations.join(' '), filters.organization)
    && includesText(item.region, filters.region) && includesText(item.languages.join(' '), filters.language)
    && includesText(item.collaborationInterests.join(' '), filters.collaborationType)
    && includesText(item.identityType, filters.identityType)).slice(0, cleanLimit(filters.limit));
  return { ok: true, tool: 'filterIdentityProfiles', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

function countValues(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([name, count]) => ({ name, count }));
}

export function listIdentityTopics(data, { limit } = {}) {
  const topics = countValues(data.items.flatMap((item) => [...item.expertise, ...item.researchInterests, ...item.collaborationInterests]), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listIdentityTopics', sourcePlatform: data.sourcePlatform, count: topics.length, topics, items: data.items.slice(0, MAX_ITEMS) };
}

export function listOrganizations(data, { limit } = {}) {
  const organizations = countValues(data.items.flatMap((item) => item.organizations), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listOrganizations', sourcePlatform: data.sourcePlatform, count: organizations.length, organizations, items: data.items.filter((item) => item.organizations.length).slice(0, MAX_ITEMS) };
}

function intersection(left, right) {
  const rightSet = new Set(right.map((value) => value.toLocaleLowerCase()));
  return left.filter((value) => rightSet.has(value.toLocaleLowerCase()));
}

function complementaryCapabilities(left, right) {
  const leftValues = new Set([...left.expertise, ...left.researchInterests].map((value) => value.toLocaleLowerCase()));
  return [...right.expertise, ...right.researchInterests].filter((value) => !leftValues.has(value.toLocaleLowerCase()));
}

function buildComparison(left, right) {
  const sharedInterests = intersection([...left.expertise, ...left.researchInterests, ...left.collaborationInterests], [...right.expertise, ...right.researchInterests, ...right.collaborationInterests]);
  return {
    profileIds: [left.id, right.id], sharedInterests,
    complementaryCapabilities: [...complementaryCapabilities(left, right).map((capability) => `${right.displayName}: ${capability}`), ...complementaryCapabilities(right, left).map((capability) => `${left.displayName}: ${capability}`)].slice(0, 20),
    verificationStatus: sharedInterests.length ? 'inferred' : 'unknown',
  };
}

export function compareIdentityProfiles(data, { profileIds = [] } = {}) {
  const items = selectByIds(data, profileIds, 2);
  const comparison = items.length === 2 ? buildComparison(items[0], items[1]) : null;
  return { ok: true, tool: 'compareIdentityProfiles', sourcePlatform: data.sourcePlatform, count: items.length, items, comparison };
}

export function findPotentialConnections(data, { query = '', profileId = '', limit } = {}) {
  const seed = profileId ? data.items.find((item) => item.id === profileId) : null;
  const searched = query ? searchIdentityProfiles(data, { query, limit: MAX_ITEMS }).items : data.items;
  const items = searched.filter((item) => !seed || item.id !== seed.id).slice(0, cleanLimit(limit));
  const connections = seed ? items.map((item) => ({ ...buildComparison(seed, item), relation: 'potential collaboration', status: 'inferred' })) : [];
  return { ok: true, tool: 'findPotentialConnections', sourcePlatform: data.sourcePlatform, count: items.length, items: seed ? [seed, ...items].slice(0, MAX_ITEMS) : items, connections };
}

export function buildIdentityToolCollaborationMap(data, { objective = '', profileIds = [], limit } = {}) {
  const items = selectByIds(data, profileIds, limit); const proposedRelations = [];
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const comparison = buildComparison(items[i], items[j]);
    proposedRelations.push({ from: items[i].id, to: items[j].id, relation: comparison.sharedInterests.length ? 'shared public interest' : 'possible complementary connection', status: comparison.sharedInterests.length ? 'inferred' : 'recommended', evidence: comparison.sharedInterests, sourceIds: comparison.profileIds });
  }
  return {
    ok: true, tool: 'buildCollaborationMap', sourcePlatform: data.sourcePlatform, count: items.length, items,
    collaborationMap: { objective: cleanText(objective, 500), nodes: items.map((item) => ({ id: item.id, label: item.displayName, nodeType: item.identityType, sourceIds: [item.id], verificationStatus: 'verified' })), proposedRelations, sourceIds: items.map((item) => item.id), verificationStatus: 'unverified' },
  };
}

export function executeNetworkerIdentityTool(name, args, data) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('networker_tool_not_allowed');
  if (!data || !Array.isArray(data.items)) throw new Error('identity_source_invalid');
  if (name === 'searchIdentityProfiles') return searchIdentityProfiles(data, args);
  if (name === 'getIdentityProfile') return getIdentityProfile(data, args);
  if (name === 'filterIdentityProfiles') return filterIdentityProfiles(data, args);
  if (name === 'listIdentityTopics') return listIdentityTopics(data, args);
  if (name === 'listOrganizations') return listOrganizations(data, args);
  if (name === 'findPotentialConnections') return findPotentialConnections(data, args);
  if (name === 'compareIdentityProfiles') return compareIdentityProfiles(data, args);
  return buildIdentityToolCollaborationMap(data, args);
}

function uniqueItems(toolResults) {
  const items = new Map();
  for (const result of toolResults) for (const item of result.items || []) if (!items.has(item.id)) items.set(item.id, item);
  return [...items.values()];
}

const COPY = Object.freeze({
  zh: {
    verified: (item) => `${item.displayName} — 身份類型：${item.identityType}；專長／研究興趣：${[...item.expertise, ...item.researchInterests].join('、') || '未公開'}`,
    inferred: '共同興趣與能力互補僅代表可能的合作連結，不代表合作意願、可聯絡性、私人關係或成功機率。',
    recommended: '合作前應由人員確認身份、合作意願、聯絡權限與適當的公開聯絡管道。',
    unknown: '公開資料無法確認合作意願、可聯絡性、既有私人關係或對方是否同意介紹。', noData: '目前沒有公開 Identity Profile 支持此要求。',
  },
  ko: {
    verified: (item) => `${item.displayName} — 정체성 유형: ${item.identityType}; 전문성/연구 관심: ${[...item.expertise, ...item.researchInterests].join(', ') || '공개되지 않음'}`,
    inferred: '공통 관심사와 상호 보완 역량은 잠재적 연결을 뜻할 뿐 협업 의사, 연락 가능 여부, 사적 관계 또는 성공 가능성을 의미하지 않습니다.',
    recommended: '협업 전에 사람이 정체성, 협업 의사, 연락 권한과 적절한 공개 연락 채널을 확인해야 합니다.',
    unknown: '공개 데이터로는 협업 의사, 연락 가능 여부, 기존 사적 관계 또는 소개 동의를 확인할 수 없습니다.', noData: '이 요청을 뒷받침하는 공개 Identity Profile이 없습니다.',
  },
  en: {
    verified: (item) => `${item.displayName} — identity type: ${item.identityType}; expertise/research interests: ${[...item.expertise, ...item.researchInterests].join(', ') || 'not public'}`,
    inferred: 'Shared interests and complementary capabilities indicate only a possible connection, not willingness, availability, a private relationship, or likely success.',
    recommended: 'Before collaboration, a person should confirm identity, willingness, contact authorization, and an appropriate public contact channel.',
    unknown: 'Public data does not confirm willingness to collaborate, contact availability, a pre-existing private relationship, or consent to an introduction.', noData: 'No currently public Identity Profile supports this request.',
  },
});

export function buildNetworkerFactClassification(toolResults = [], { lang = 'en' } = {}) {
  const items = uniqueItems(toolResults); const copy = COPY[lang] || COPY.en;
  return {
    verified: items.map((item) => ({ text: copy.verified(item), sourceIds: [item.id] })),
    inferred: items.length > 1 ? [{ text: copy.inferred, sourceIds: items.map((item) => item.id) }] : [],
    recommended: [{ text: copy.recommended, sourceIds: [] }],
    unknown: [{ text: items.length ? copy.unknown : copy.noData, sourceIds: [] }],
  };
}

export function isCollaborationMapRequest(query) {
  return /(合作地圖|合作地图|關係地圖|关系地图|連結|媒合|比較|比较|互補|共同興趣|협업 지도|관계 지도|연결|비교|상호 보완|공통 관심|collaboration map|relationship map|connection|compare|complement|shared interest|shortlist)/iu.test(query);
}

export function buildNetworkerCollaborationMap(toolResults = [], { query = '' } = {}) {
  if (!isCollaborationMapRequest(query)) return null;
  const items = uniqueItems(toolResults);
  const relations = toolResults.flatMap((result) => result.connections || result.collaborationMap?.proposedRelations || (result.comparison ? [result.comparison] : []));
  return {
    objective: cleanText(query, 500),
    nodes: items.map((item) => ({ id: item.id, label: item.displayName, nodeType: item.identityType, sourceIds: [item.id], verificationStatus: 'verified' })),
    nodeType: [...new Set(items.map((item) => item.identityType))], profileIds: items.map((item) => item.id),
    organizations: [...new Set(items.flatMap((item) => item.organizations))],
    sharedInterests: [...new Set(relations.flatMap((relation) => relation.sharedInterests || relation.evidence || []))],
    complementaryCapabilities: [...new Set(relations.flatMap((relation) => relation.complementaryCapabilities || []))],
    proposedRelations: relations.map((relation, index) => ({ id: `proposed-relation-${index + 1}`, title: relation.relation || 'Potential collaboration', status: ['inferred', 'recommended'].includes(relation.status || relation.verificationStatus) ? (relation.status || relation.verificationStatus) : 'recommended', sourceIds: relation.sourceIds || relation.profileIds || [] })),
    evidence: items.map((item) => ({ profileId: item.id, sourceIds: [item.id], verificationStatus: 'verified' })),
    sourceIds: items.map((item) => item.id), verificationStatus: 'unverified',
  };
}
