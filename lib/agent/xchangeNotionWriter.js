/* global process */

import { getNotionClient, getNotionTeachingConfig } from '../notion.js';

const TARGET = 'notion-teaching-materials';
const REQUIRED_SCHEMA = Object.freeze({
  '標題': ['title'],
  '教學分類': ['select'],
  '形式': ['multi_select'],
  '子主題': ['rich_text'],
  '對象': ['multi_select'],
  '可講時間(分)': ['number'],
  '難度': ['select'],
  '語言': ['multi_select'],
  '標籤': ['multi_select'],
  '檔案連結': ['url'],
  '狀態': ['status', 'select'],
  '公開狀態': ['status', 'select'],
});

function fail(code) { throw Object.assign(new Error(code.toLowerCase()), { code }); }
function richText(value) { return { rich_text: [{ type: 'text', text: { content: String(value) } }] }; }
function multiSelect(value = []) { return { multi_select: value.map((name) => ({ name: String(name) })) }; }
function select(value) { return { select: { name: String(value) } }; }

function validateOption(property, value) {
  const options = property?.[property.type]?.options;
  if (Array.isArray(options) && !options.some((option) => option?.name === value)) fail('SCHEMA_MISMATCH');
}

export function validateXchangeNotionSchema(properties = {}) {
  for (const [name, allowedTypes] of Object.entries(REQUIRED_SCHEMA)) {
    const property = properties[name];
    if (!property || !allowedTypes.includes(property.type)) fail('SCHEMA_MISMATCH');
  }
  validateOption(properties['狀態'], 'Draft');
  validateOption(properties['公開狀態'], 'Private');
  return true;
}

function typedChoice(property, value) {
  return property.type === 'status' ? { status: { name: value } } : select(value);
}

export function buildXchangeNotionProperties({ draftType, payload, schema }) {
  const course = draftType === 'course';
  const properties = {
    '標題': { title: [{ type: 'text', text: { content: course ? payload.title : payload.activityTitle } }] },
    '教學分類': select(course ? payload.teachingCategory : payload.activityType),
    '形式': multiSelect(course ? payload.format : [payload.activityType]),
    '子主題': richText(course ? (payload.subTopic || payload.summary || '') : payload.instructions),
    '對象': multiSelect(payload.targetAudience),
    '可講時間(分)': { number: course ? payload.durationMinutes : payload.estimatedTimeMinutes },
    '難度': select(payload.difficulty),
    '語言': multiSelect(payload.language),
    '標籤': multiSelect(payload.tags),
    '狀態': typedChoice(schema['狀態'], 'Draft'),
    '公開狀態': typedChoice(schema['公開狀態'], 'Private'),
  };
  const url = course ? payload.fileUrl : payload.materialsUrl;
  if (url) properties['檔案連結'] = { url };
  return properties;
}

export async function createXchangeNotionDraft({ draftType, payload, targetDataSource = TARGET, env = process.env, notionClient } = {}) {
  if (targetDataSource !== TARGET) fail('DATA_SOURCE_NOT_ALLOWED');
  const config = getNotionTeachingConfig();
  const apiKey = String(env.NOTION_API_KEY || config.apiKey || '').trim();
  const databaseId = String(env.NOTION_TEACHING_DATABASE_ID || config.databaseId || '').trim();
  if (!apiKey || !databaseId) fail('NOTION_CONFIGURATION_MISSING');
  const notion = notionClient || getNotionClient(apiKey);
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const dataSourceId = database?.data_sources?.[0]?.id;
    if (!dataSourceId) fail('SCHEMA_MISMATCH');
    const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    validateXchangeNotionSchema(dataSource?.properties);
    const properties = buildXchangeNotionProperties({ draftType, payload, schema: dataSource.properties });
    const page = await notion.pages.create({ parent: { data_source_id: dataSourceId }, properties });
    if (!page?.id) fail('NOTION_INVALID_RESPONSE');
    return { externalRecordId: page.id, createdAt: page.created_time || new Date().toISOString(), properties };
  } catch (error) {
    if (['SCHEMA_MISMATCH', 'NOTION_INVALID_RESPONSE', 'DATA_SOURCE_NOT_ALLOWED'].includes(error?.code)) throw error;
    throw Object.assign(new Error('notion_request_failed'), { code: 'NOTION_REQUEST_FAILED' });
  }
}
