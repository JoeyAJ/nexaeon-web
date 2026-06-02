const NOTION_VERSION = '2022-06-28';
const NOTION_DATA_SOURCE_VERSION = '2026-03-11';

function getEnvValue(name) {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
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

export async function queryNotionDatabase(databaseId, apiKey) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      page_size: 50,
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion request failed with status ${response.status}`);
  }

  return response.json();
}

export async function queryNotionDataSource(dataSourceId, apiKey) {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_DATA_SOURCE_VERSION,
    },
    body: JSON.stringify({
      page_size: 50,
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion data source request failed with status ${response.status}`);
  }

  return response.json();
}
