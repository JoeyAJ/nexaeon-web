/* global process */
import { Client } from '@notionhq/client';

const notionClients = new Map();

function getEnvValue(name) {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

export function getNotionClient(apiKey) {
  if (!apiKey) return null;
  if (!notionClients.has(apiKey)) {
    notionClients.set(apiKey, new Client({ auth: apiKey }));
  }

  return notionClients.get(apiKey);
}

export function getNotionResearchConfig() {
  const apiKey = getEnvValue('NOTION_API_KEY');
  const databaseId = getEnvValue('NOTION_RESEARCH_DATABASE_ID');

  return {
    apiKey,
    databaseId,
    isConfigured: Boolean(apiKey && databaseId),
  };
}

export function getNotionKnowledgeConfig() {
  const apiKey = getEnvValue('NOTION_API_KEY');
  const dataSourceId = getEnvValue('NOTION_KNOWLEDGE_DATA_SOURCE_ID');
  const databaseId = getEnvValue('NOTION_KNOWLEDGE_DATABASE_ID');

  return {
    apiKey,
    dataSourceId,
    databaseId,
    queryId: dataSourceId || databaseId,
    queryType: dataSourceId ? 'data_source' : 'database',
    isConfigured: Boolean(apiKey && (dataSourceId || databaseId)),
  };
}

export function getNotionTeachingConfig() {
  const apiKey = getEnvValue('NOTION_API_KEY');
  const databaseId = getEnvValue('NOTION_TEACHING_DATABASE_ID');

  return {
    apiKey,
    databaseId,
    isConfigured: Boolean(apiKey && databaseId),
  };
}

export function getNotionInspirationConfig() {
  const apiKey = getEnvValue('NOTION_API_KEY');
  const databaseId = getEnvValue('NOTION_INSPIRATION_DATABASE_ID');

  return {
    apiKey,
    databaseId,
    isConfigured: Boolean(apiKey && databaseId),
  };
}

export function getNotionBrandConfig() {
  const apiKey = getEnvValue('NOTION_API_KEY');
  const databaseId = getEnvValue('NOTION_BRAND_DATABASE_ID');

  return {
    apiKey,
    databaseId,
    isConfigured: Boolean(apiKey && databaseId),
  };
}

export function getNotionKnowledgeSourceConfigs() {
  return {
    research: getNotionResearchConfig(),
    teaching: getNotionTeachingConfig(),
    inspiration: getNotionInspirationConfig(),
    brand: getNotionBrandConfig(),
  };
}

export async function queryNotionDatabase(databaseId, apiKey) {
  const notion = getNotionClient(apiKey);
  if (!notion) throw new Error('Notion client is not configured');

  const query = {
    page_size: 50,
    sorts: [
      {
        timestamp: 'last_edited_time',
        direction: 'descending',
      },
    ],
  };

  try {
    return await notion.dataSources.query({
      data_source_id: databaseId,
      ...query,
    });
  } catch (queryError) {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const dataSourceId = database?.data_sources?.[0]?.id;
    if (!dataSourceId) throw queryError;

    return notion.dataSources.query({
      data_source_id: dataSourceId,
      ...query,
    });
  }
}

export async function queryNotionDataSource(dataSourceId, apiKey) {
  const notion = getNotionClient(apiKey);
  if (!notion) throw new Error('Notion client is not configured');

  return notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 50,
    sorts: [
      {
        timestamp: 'last_edited_time',
        direction: 'descending',
      },
    ],
  });
}
