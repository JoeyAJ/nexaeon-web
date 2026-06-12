/* global process */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const AIRTABLE_TIMEOUT_MS = 10000;
export const AIRTABLE_MAX_PAGES = 100;

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
  const apiKey = process.env.AIRTABLE_API_KEY?.trim();
  const safeBaseId = baseId?.trim();
  const safeTableId = tableId?.trim();

  if (!apiKey || !safeBaseId || !safeTableId) {
    throw new Error('missing_airtable_config');
  }

  const records = [];
  let offset = '';
  const seenOffsets = new Set();
  let pageCount = 0;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${encodeURIComponent(safeBaseId)}/${encodeURIComponent(safeTableId)}`);
    url.searchParams.set('pageSize', '100');
    if (view) url.searchParams.set('view', view);
    if (offset) url.searchParams.set('offset', offset);
    appendSortParams(url.searchParams, sort);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(AIRTABLE_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('airtable_fetch_failed');
    }

    const payload = await response.json();
    records.push(...(Array.isArray(payload.records) ? payload.records : []));
    offset = payload.offset || '';
    pageCount += 1;

    if (offset && seenOffsets.has(offset)) break;
    if (offset) seenOffsets.add(offset);
  } while (offset && pageCount < AIRTABLE_MAX_PAGES);

  return records;
}
