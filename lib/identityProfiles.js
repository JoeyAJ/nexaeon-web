import { createFallbackIdentityProfilesResponse } from '../src/data/identityProfileData.js';
import { createApiResponse, getUpstreamFailureReason } from '../api/_response.js';
import { getNotionIdentityConfig, queryAllNotionDatabasePages } from './notion.js';
import { isPublishedNotionPage } from './publicFilters.js';
import {
  findProperty,
  getCheckbox,
  getDate,
  getMultiSelect,
  getNumber,
  getSelect,
  getText,
  getTitle,
  getUrl,
} from './notionProperties.js';

const FIELD_NAMES = {
  name: ['身份名稱', 'Identity Name', 'Name', 'Title'],
  identityType: ['身份類型', 'Identity Type', 'Type'],
  shortPositioning: ['簡短定位', 'Short Positioning', 'Positioning', 'Subtitle'],
  fullIntroduction: ['完整介紹', 'Full Introduction', 'Introduction', 'Description'],
  corePhilosophy: ['核心理念', '核心理論', 'Core Philosophy', 'Philosophy'],
  roleTags: ['角色標籤', 'Role Tags', 'Tags'],
  relatedModules: ['對應模塊', 'Related Modules', 'Modules'],
  expertise: ['專長', 'Expertise', 'Skills'],
  researchInterests: ['研究興趣', 'Research Interests', 'Interests'],
  organizations: ['機構', '組織', 'Affiliation', 'Organization', 'Organizations'],
  collaborationInterests: ['合作方向', '合作興趣', 'Collaboration Interests', 'Collaboration Types'],
  projects: ['公開專案', 'Projects', 'Public Projects'],
  languages: ['語言', 'Languages'],
  region: ['地區', 'Region', 'Location'],
  publicContact: ['公開聯絡管道', 'Public Contact Channel', 'Public Contact'],
  profileUrl: ['公開 Profile URL', 'Public Profile URL', 'Profile URL'],
  publicStatus: ['公開狀態', 'Public Status', 'Status'],
  featured: ['精選', 'Featured'],
  displayOrder: ['顯示順序', 'Display Order', 'Order'],
  externalUrl: ['外部連結', 'External URL', 'URL', 'Link'],
  image: ['圖片', 'Image', 'Cover', 'Photo'],
  createdAt: ['建立日期', 'Created Time', 'created_time', 'createdAt'],
  updatedAt: ['最後更新', 'Last Edited Time', 'last_edited_time', 'updatedAt'],
};

function getImage(properties) {
  const property = findProperty(properties, FIELD_NAMES.image, ['files']);
  if (!property) return null;

  if (property.type === 'files') {
    const file = (property.files || []).find((entry) => entry?.file?.url || entry?.external?.url);
    if (!file) return null;

    return {
      url: file.file?.url || file.external?.url || '',
      name: file.name || '',
    };
  }

  const url = getUrl(properties, FIELD_NAMES.image);
  if (!url) return null;

  return {
    url,
    name: '',
  };
}

function getUpdatedTime(item) {
  const time = new Date(item.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortIdentityProfiles(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;

  const updatedDifference = getUpdatedTime(b) - getUpdatedTime(a);
  if (updatedDifference) return updatedDifference;

  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

function slugify(value) {
  return String(value || 'untitled-identity')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-identity';
}

function normalizeIdentityProfile(page) {
  const properties = page.properties || {};
  const organizationSelect = getSelect(properties, FIELD_NAMES.organizations);
  const regionSelect = getSelect(properties, FIELD_NAMES.region);

  return {
    id: `identity-${slugify(getTitle(properties, FIELD_NAMES.name)) || 'untitled-identity'}-${getNumber(properties, FIELD_NAMES.displayOrder, 0)}`,
    name: getTitle(properties, FIELD_NAMES.name) || 'Untitled Identity',
    identityType: getSelect(properties, FIELD_NAMES.identityType),
    shortPositioning: getText(properties, FIELD_NAMES.shortPositioning, ['rich_text']),
    fullIntroduction: getText(properties, FIELD_NAMES.fullIntroduction, ['rich_text']),
    corePhilosophy: getText(properties, FIELD_NAMES.corePhilosophy, ['rich_text']),
    roleTags: getMultiSelect(properties, FIELD_NAMES.roleTags),
    relatedModules: getMultiSelect(properties, FIELD_NAMES.relatedModules),
    expertise: getMultiSelect(properties, FIELD_NAMES.expertise),
    researchInterests: getMultiSelect(properties, FIELD_NAMES.researchInterests),
    organizations: getMultiSelect(properties, FIELD_NAMES.organizations).length
      ? getMultiSelect(properties, FIELD_NAMES.organizations)
      : [organizationSelect || getText(properties, FIELD_NAMES.organizations, ['rich_text'])].filter(Boolean),
    collaborationInterests: getMultiSelect(properties, FIELD_NAMES.collaborationInterests),
    projects: getMultiSelect(properties, FIELD_NAMES.projects),
    languages: getMultiSelect(properties, FIELD_NAMES.languages),
    region: regionSelect || getText(properties, FIELD_NAMES.region, ['rich_text']),
    publicContact: getMultiSelect(properties, FIELD_NAMES.publicContact).length
      ? getMultiSelect(properties, FIELD_NAMES.publicContact)
      : [getText(properties, FIELD_NAMES.publicContact, ['rich_text'])].filter(Boolean),
    profileUrl: getUrl(properties, FIELD_NAMES.profileUrl),
    publicStatus: getSelect(properties, FIELD_NAMES.publicStatus),
    featured: getCheckbox(properties, FIELD_NAMES.featured),
    displayOrder: getNumber(properties, FIELD_NAMES.displayOrder, 0),
    externalUrl: getUrl(properties, FIELD_NAMES.externalUrl),
    image: getImage(properties),
    createdAt: getDate(properties, FIELD_NAMES.createdAt) || page.created_time || '',
    updatedAt: getDate(properties, FIELD_NAMES.updatedAt) || page.last_edited_time || '',
  };
}

function toPublicIdentityProfile(item) {
  return {
    id: item.id,
    name: item.name,
    identityType: item.identityType,
    shortPositioning: item.shortPositioning,
    fullIntroduction: item.fullIntroduction,
    corePhilosophy: item.corePhilosophy,
    roleTags: item.roleTags,
    relatedModules: item.relatedModules,
    expertise: item.expertise,
    researchInterests: item.researchInterests,
    organizations: item.organizations,
    collaborationInterests: item.collaborationInterests,
    projects: item.projects,
    languages: item.languages,
    region: item.region,
    publicContact: item.publicContact,
    profileUrl: item.profileUrl,
    featured: item.featured,
    displayOrder: item.displayOrder,
    externalUrl: item.externalUrl,
    image: item.image,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getIdentityProfiles() {
  const config = getNotionIdentityConfig();

  if (!config.isConfigured) {
    return createFallbackIdentityProfilesResponse('missing_env');
  }

  try {
    const pages = await queryAllNotionDatabasePages(config.databaseId, config.apiKey);
    const items = pages
      .filter((page) => isPublishedNotionPage(page, FIELD_NAMES.publicStatus))
      .map(normalizeIdentityProfile)
      .sort(sortIdentityProfiles)
      .map(toPublicIdentityProfile);

    return createApiResponse({
      source: 'notion',
      items,
      extra: { meta: { module: 'identity' } },
    });
  } catch (error) {
    return createFallbackIdentityProfilesResponse(getUpstreamFailureReason(error));
  }
}
