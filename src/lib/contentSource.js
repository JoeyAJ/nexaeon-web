import {
  findContentItem,
  getAllContentItems,
  getContentByType,
  getModuleById,
  getModules,
  getSiteContent,
} from '../data/nexaeonContent.js';

const DATA_SOURCE = {
  current: 'local-static',
  future: ['notion', 'airtable', 'n8n', 'rag'],
};

export function getLocalizedSite(lang = 'zh') {
  return getSiteContent(lang);
}

export function getModuleItems(lang = 'zh') {
  return getModules(lang);
}

export function getModuleContent(moduleId, lang = 'zh') {
  return getModuleById(moduleId, lang);
}

export function getDetailItem(type, id, lang = 'zh') {
  return findContentItem(type, id, lang);
}

export function getResearchItems(lang = 'zh') {
  return getContentByType('research', lang);
}

export function getTeachingItems(lang = 'zh') {
  return getContentByType('teaching', lang);
}

export function getKnowledgeItems(lang = 'zh') {
  return getContentByType('knowledge-lab', lang);
}

export function getProjectItems(lang = 'zh') {
  return getContentByType('projects', lang);
}

export function getFieldLabItems(lang = 'zh') {
  return getContentByType('field-lab', lang);
}

export { getAllContentItems, getContentByType };

export function getDataSourceStatus() {
  return {
    currentSource: 'Local Static Content',
    futureSource: DATA_SOURCE.future.join(' / '),
    status: 'Ready for Integration',
  };
}
