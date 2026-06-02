const NOTION_VERSION = '2022-06-28';

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
