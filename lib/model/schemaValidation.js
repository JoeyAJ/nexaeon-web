import { ModelGatewayError } from './modelErrors.js';

const HTML_PATTERN = /<(?:script|iframe|object|embed|html|body|style|svg)\b|javascript:/iu;

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function fail(path, message) {
  throw new ModelGatewayError('MODEL_SCHEMA_INVALID', { status: 422, details: { path, message } });
}

function validateNode(value, schema, path) {
  if (!schema || typeof schema !== 'object') fail(path, 'Schema definition is invalid.');
  const received = typeOf(value);
  if (schema.type && !(schema.type === 'integer' ? received === 'number' && Number.isInteger(value) : received === schema.type)) {
    fail(path, `Expected ${schema.type}; received ${received}.`);
  }
  if (schema.type === 'object') {
    const properties = schema.properties || {};
    for (const key of schema.required || []) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key}`, 'Required field is missing.');
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).find((key) => !Object.prototype.hasOwnProperty.call(properties, key));
      if (unknown) fail(`${path}.${unknown}`, 'Unknown field is not allowed.');
    }
    for (const [key, item] of Object.entries(value)) if (properties[key]) validateNode(item, properties[key], `${path}.${key}`);
  }
  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(path, `Requires at least ${schema.minItems} items.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(path, `Allows at most ${schema.maxItems} items.`);
    value.forEach((item, index) => validateNode(item, schema.items, `${path}[${index}]`));
  }
  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) fail(path, `Requires at least ${schema.minLength} characters.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail(path, `Allows at most ${schema.maxLength} characters.`);
    if (HTML_PATTERN.test(value)) fail(path, 'HTML or script content is not allowed.');
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.type === 'integer' && !Number.isInteger(value)) fail(path, 'Expected an integer.');
    if (schema.minimum !== undefined && value < schema.minimum) fail(path, `Must be at least ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum) fail(path, `Must be at most ${schema.maximum}.`);
  }
  return value;
}

export function validateStrictSchema(value, schema) {
  return validateNode(value, schema, '$');
}

export function parseStructuredModelOutput(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') throw new ModelGatewayError('MODEL_JSON_INVALID', { status: 422 });
  const trimmed = value.trim();
  if (HTML_PATTERN.test(trimmed)) throw new ModelGatewayError('MODEL_JSON_INVALID', { status: 422 });
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed;
  } catch {
    throw new ModelGatewayError('MODEL_JSON_INVALID', { status: 422 });
  }
}
