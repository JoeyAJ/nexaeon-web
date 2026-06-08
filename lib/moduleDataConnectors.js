/* global process */
const MODULE_NOTION_DATABASE_ENV = {
  research: 'NOTION_RESEARCH_DATABASE_ID',
  teaching: 'NOTION_TEACHING_DATABASE_ID',
  knowledge: 'NOTION_KNOWLEDGE_DATABASE_ID',
  action: 'NOTION_ACTION_DATABASE_ID',
  modules: 'NOTION_MODULES_DATABASE_ID',
  collaboration: 'NOTION_COLLABORATION_DATABASE_ID',
};

function getEnvValue(name) {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

export function getReservedModuleConnectorConfig(moduleKey) {
  const notionDatabaseEnv = MODULE_NOTION_DATABASE_ENV[moduleKey];
  const notionApiKey = getEnvValue('NOTION_API_KEY');
  const notionDatabaseId = notionDatabaseEnv ? getEnvValue(notionDatabaseEnv) : undefined;
  const airtableApiKey = getEnvValue('AIRTABLE_API_KEY');
  const airtableBaseId = getEnvValue('AIRTABLE_BASE_ID');

  return {
    moduleKey,
    notion: {
      enabled: false,
      ready: Boolean(notionApiKey && notionDatabaseId),
      databaseEnv: notionDatabaseEnv,
    },
    airtable: {
      enabled: false,
      ready: Boolean(airtableApiKey && airtableBaseId),
      baseEnv: 'AIRTABLE_BASE_ID',
    },
  };
}

export async function fetchReservedModuleConnectorData() {
  return null;
}
