import { getContentByType } from '../data/nexaeonContent.js';

const DATA_SOURCE = {
  current: 'local-static',
  future: ['notion', 'airtable', 'n8n'],
};

function readFromLocalStatic(type, lang) {
  return getContentByType(type, lang);
}

function readContentByType(type, lang = 'zh') {
  switch (DATA_SOURCE.current) {
    case 'local-static':
      return readFromLocalStatic(type, lang);
    default:
      return readFromLocalStatic(type, lang);
  }
}

export function getResearchItems(lang = 'zh') {
  return readContentByType('research', lang);
}

export function getProjectItems(lang = 'zh') {
  return readContentByType('projects', lang);
}

export function getKnowledgeItems(lang = 'zh') {
  return readContentByType('knowledge', lang);
}

export function getAllContentItems(lang = 'zh') {
  return [
    ...getResearchItems(lang),
    ...getProjectItems(lang),
    ...getKnowledgeItems(lang),
  ];
}

export function getDataSourceStatus() {
  return {
    currentSource: 'Local Static Content',
    futureSource: 'Notion / Airtable / n8n',
    status: 'Ready for Integration',
  };
}
