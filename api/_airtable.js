/* global process */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

function appendSortParams(searchParams, sort = []) {
  sort.forEach((sortItem, index) => {
    if (!sortItem?.field) return;
    searchParams.set(`sort[${index}][field]`, sortItem.field);
    if (sortItem.direction) {
      searchParams.set(`sort[${index}][direction]`, sortItem.direction);
    }
  });
}

export async function getAirtableRecords({ baseId, tableId, view, sort } = {}) {
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!apiKey || !baseId || !tableId) {
    throw new Error('missing_airtable_config');
  }

  const records = [];
  let offset = '';

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`);
    url.searchParams.set('pageSize', '100');
    if (view) url.searchParams.set('view', view);
    if (offset) url.searchParams.set('offset', offset);
    appendSortParams(url.searchParams, sort);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`airtable_fetch_failed:${response.status}`);
    }

    const payload = await response.json();
    records.push(...(Array.isArray(payload.records) ? payload.records : []));
    offset = payload.offset || '';
  } while (offset);

  return records;
}
