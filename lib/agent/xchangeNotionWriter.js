/* global process */

import { getNotionClient, getNotionTeachingConfig } from '../notion.js';
import {
  buildCourseNotionBlocks,
  buildLearningActivityNotionBlocks,
  validateStructuredContent,
} from './xchangeStructuredContent.js';

const TARGET = 'notion-teaching-materials';
const WORKFLOW_DRAFT_VALUE = '未開始';
const VISIBILITY_DRAFT_VALUE = 'Draft';

const PROPERTY_CONTRACT = Object.freeze({
  '標題': { types: ['title'], required: true },
  '教學分類': { types: ['select'], required: true },
  '形式': { types: ['multi_select'], required: false },
  '子主題': { types: ['rich_text'], required: true },
  '對象': { types: ['multi_select'], required: false },
  '可講時間(分)': { types: ['number'], required: true },
  '難度': { types: ['select'], required: true },
  '語言': { types: ['multi_select'], required: true },
  '標籤': { types: ['multi_select'], required: false },
  '檔案連結': { types: ['url'], required: false },
  '狀態': { types: ['status'], required: true, requiredOption: WORKFLOW_DRAFT_VALUE },
  '公開狀態': { types: ['select'], required: true, requiredOption: VISIBILITY_DRAFT_VALUE },
});

const VALUE_ALIASES = Object.freeze({
  '教學分類': Object.freeze({ course: '教育', 'learning activity': '教育', discussion: '教育', education: '教育', ai: 'AI', business: '商業', psychology: '心理', interdisciplinary: '跨域' }),
  '形式': Object.freeze({ course: '課堂講義', 'learning activity': 'Workshop', discussion: 'Workshop', workshop: 'Workshop', slides: 'PPT', presentation: 'PPT', case: '案例', video: '影片', survey: '問卷' }),
  '對象': Object.freeze({ students: '大學生', student: '大學生', 學生: '大學生', 'university students': '大學生', undergraduates: '大學生', 'graduate students': '研究生', professionals: '在職人員' }),
  '難度': Object.freeze({ beginner: '初級', intermediate: '中級', advanced: '高級' }),
  '語言': Object.freeze({ zh: '中文', 'zh-tw': '中文', 中文: '中文', 繁體中文: '中文', chinese: '中文', ko: '韓文', 한국어: '韓文', korean: '韓文', en: '英文', english: '英文' }),
  '標籤': Object.freeze({ important: '重要', popular: '熱門', experimental: '實驗中', core: '核心' }),
});

function fail(code, details) { throw Object.assign(new Error(code.toLowerCase()), { code, ...(details ? { schemaDiagnostics: details } : {}) }); }
function richText(value) { return { rich_text: value ? [{ type: 'text', text: { content: String(value) } }] : [] }; }
function multiSelect(value = []) { return { multi_select: value.map((name) => ({ name: String(name) })) }; }
function select(value) { return { select: { name: String(value) } }; }

function optionNames(property) {
  const options = property?.[property?.type]?.options;
  return Array.isArray(options) ? options.map((option) => String(option?.name || '')).filter(Boolean) : [];
}

function schemaDiagnostics(properties = {}) {
  const diagnostics = {
    missingProperties: [], mismatchedProperties: [], missingRequiredOptions: [], unsupportedWritableProperties: [], optionalPropertiesOmitted: [],
  };
  for (const [name, contract] of Object.entries(PROPERTY_CONTRACT)) {
    const property = properties[name];
    if (!property) {
      (contract.required ? diagnostics.missingProperties : diagnostics.optionalPropertiesOmitted).push(name);
      continue;
    }
    if (!contract.types.includes(property.type)) {
      const mismatch = { property: name, expectedType: contract.types, actualType: property.type || 'unknown' };
      diagnostics.mismatchedProperties.push(mismatch);
      diagnostics.unsupportedWritableProperties.push(mismatch);
      continue;
    }
    if (contract.requiredOption && !optionNames(property).includes(contract.requiredOption)) {
      diagnostics.missingRequiredOptions.push({ property: name, requiredOption: contract.requiredOption, availableOptions: optionNames(property) });
    }
  }
  return diagnostics;
}

function hasSchemaFailure(diagnostics) {
  return Boolean(diagnostics.missingProperties.length || diagnostics.mismatchedProperties.length || diagnostics.missingRequiredOptions.length);
}

function logSchemaMismatch(logger, diagnostics) {
  try {
    logger(JSON.stringify({ service: 'nexaeon-xchange', category: 'notion_schema_mismatch', errorCode: 'SCHEMA_MISMATCH', ...diagnostics, writesPerformed: 0 }));
  } catch { /* diagnostics must never alter fail-closed behavior */ }
}

export function validateXchangeNotionSchema(properties = {}) {
  const diagnostics = schemaDiagnostics(properties);
  if (hasSchemaFailure(diagnostics)) fail('SCHEMA_MISMATCH', diagnostics);
  return diagnostics;
}

function typedChoice(property, value) {
  return property.type === 'status' ? { status: { name: value } } : select(value);
}

function resolveOption(propertyName, property, value, { required = false } = {}) {
  const available = optionNames(property);
  const source = String(value || '').trim();
  if (!source) {
    if (required) fail('SCHEMA_MISMATCH', { unsupportedValues: [{ property: propertyName, value: '', availableOptions: available }] });
    return '';
  }
  const exact = available.find((option) => option === source);
  if (exact) return exact;
  const alias = VALUE_ALIASES[propertyName]?.[source.toLowerCase()];
  if (alias && available.includes(alias)) return alias;
  if (required) fail('SCHEMA_MISMATCH', { unsupportedValues: [{ property: propertyName, value: source, availableOptions: available }] });
  return '';
}

function resolveOptions(propertyName, property, values, { required = false } = {}) {
  const resolved = [...new Set((Array.isArray(values) ? values : []).map((value) => resolveOption(propertyName, property, value)).filter(Boolean))];
  if (required && !resolved.length) {
    fail('SCHEMA_MISMATCH', { unsupportedValues: [{ property: propertyName, value: Array.isArray(values) ? values : [], availableOptions: optionNames(property) }] });
  }
  return resolved;
}

export function buildXchangeNotionProperties({ draftType, payload, schema }) {
  const course = draftType === 'course';
  const properties = {
    '標題': { title: [{ type: 'text', text: { content: course ? payload.title : payload.activityTitle } }] },
    '教學分類': select(resolveOption('教學分類', schema['教學分類'], course ? payload.teachingCategory : payload.activityType, { required: true })),
    '子主題': richText(course ? (payload.subTopic || payload.summary || '') : payload.instructions),
    '可講時間(分)': { number: course ? payload.durationMinutes : payload.estimatedTimeMinutes },
    '難度': select(resolveOption('難度', schema['難度'], payload.difficulty, { required: true })),
    '語言': multiSelect(resolveOptions('語言', schema['語言'], payload.language, { required: true })),
    '狀態': typedChoice(schema['狀態'], WORKFLOW_DRAFT_VALUE),
    '公開狀態': typedChoice(schema['公開狀態'], VISIBILITY_DRAFT_VALUE),
  };
  if (schema['形式']) {
    const values = resolveOptions('形式', schema['形式'], course ? payload.format : [payload.activityType]);
    if (values.length) properties['形式'] = multiSelect(values);
  }
  if (schema['對象']) {
    const values = resolveOptions('對象', schema['對象'], payload.targetAudience);
    if (values.length) properties['對象'] = multiSelect(values);
  }
  if (schema['標籤']) {
    const values = resolveOptions('標籤', schema['標籤'], payload.tags);
    if (values.length) properties['標籤'] = multiSelect(values);
  }
  const url = course ? payload.fileUrl : payload.materialsUrl;
  if (url && schema['檔案連結']) properties['檔案連結'] = { url };
  return properties;
}

export async function createXchangeNotionDraft({ draftType, payload, content, requirements, targetDataSource = TARGET, env = process.env, notionClient, logger = console.error } = {}) {
  if (targetDataSource !== TARGET) fail('DATA_SOURCE_NOT_ALLOWED');
  const config = getNotionTeachingConfig();
  const apiKey = String(env.NOTION_API_KEY || config.apiKey || '').trim();
  const databaseId = String(env.NOTION_TEACHING_DATABASE_ID || config.databaseId || '').trim();
  if (!apiKey || !databaseId) fail('NOTION_CONFIGURATION_MISSING');
  const notion = notionClient || getNotionClient(apiKey);
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const dataSourceId = database?.data_sources?.[0]?.id;
    if (!dataSourceId) fail('SCHEMA_MISMATCH', { missingProperties: Object.keys(PROPERTY_CONTRACT) });
    const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    validateXchangeNotionSchema(dataSource?.properties);
    const quality = validateStructuredContent(draftType, content, { allowedUrls: [payload.fileUrl, payload.materialsUrl].filter(Boolean), requirements, sourcePrompt: draftType === 'course' ? payload.summary || payload.subTopic || '' : payload.instructions || '' });
    if (!['Complete', 'Complete with warnings'].includes(quality.status)) fail('CONTENT_VALIDATION_FAILED', { contentErrors: quality.errors });
    const properties = buildXchangeNotionProperties({ draftType, payload, schema: dataSource.properties });
    const blocks = draftType === 'course' ? buildCourseNotionBlocks(content) : buildLearningActivityNotionBlocks(content);
    const firstBatch = blocks.slice(0, 100);
    const page = await notion.pages.create({ parent: { data_source_id: dataSourceId }, properties, children: firstBatch });
    if (!page?.id) fail('NOTION_INVALID_RESPONSE');
    let bodyBlocksWritten = firstBatch.length;
    let bodyAppendBatches = 0;
    try {
      for (let index = 100; index < blocks.length; index += 100) {
        const children = blocks.slice(index, index + 100);
        await notion.blocks.children.append({ block_id: page.id, children });
        bodyBlocksWritten += children.length;
        bodyAppendBatches += 1;
      }
    } catch {
      throw Object.assign(new Error('notion_body_append_failed'), {
        code: 'NOTION_BODY_APPEND_FAILED', externalRecordId: page.id, notionPageCreated: true,
        pageCreated: true, bodyComplete: false, bodyBlocksWritten, bodyAppendBatches,
        partialExternalWrite: true, writesPerformed: 1,
      });
    }
    return {
      externalRecordId: page.id, createdAt: page.created_time || new Date().toISOString(), properties,
      notionPageCreated: true, pageCreated: true, bodyComplete: true,
      bodyBlocksWritten, bodyAppendBatches, partialExternalWrite: false,
    };
  } catch (error) {
    if (error?.code === 'SCHEMA_MISMATCH') {
      logSchemaMismatch(logger, error.schemaDiagnostics || {});
      throw error;
    }
    if (['NOTION_INVALID_RESPONSE', 'DATA_SOURCE_NOT_ALLOWED', 'CONTENT_VALIDATION_FAILED', 'NOTION_BODY_APPEND_FAILED'].includes(error?.code)) throw error;
    throw Object.assign(new Error('notion_request_failed'), { code: 'NOTION_REQUEST_FAILED' });
  }
}
