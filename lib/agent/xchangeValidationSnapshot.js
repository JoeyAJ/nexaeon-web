import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function canonicalizationError(value, fieldPath) {
  return Object.assign(new Error('validation_canonicalization_failed'), {
    code: 'VALIDATION_CANONICALIZATION_FAILED', nodeErrorCode: null,
    receivedType: valueType(value), fieldPath, writesPerformed: 0,
  });
}

export function canonicalizeValidationValue(value, fieldPath = '$', ancestors = new Set()) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw canonicalizationError(value, fieldPath);
    return `number:${Object.is(value, -0) ? '-0' : String(value)}`;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw canonicalizationError(value, fieldPath);
    const next = new Set(ancestors); next.add(value);
    return `array:[${value.map((item, index) => canonicalizeValidationValue(item, `${fieldPath}[${index}]`, next)).join(',')}]`;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    if (ancestors.has(value)) throw canonicalizationError(value, fieldPath);
    const next = new Set(ancestors); next.add(value);
    return `object:{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeValidationValue(value[key], `${fieldPath}.${key}`, next)}`).join(',')}}`;
  }
  throw canonicalizationError(value, fieldPath);
}

export function validationDigest(value) {
  return createHash('sha256').update(canonicalizeValidationValue(value), 'utf8').digest('hex');
}

function legacyJsonDigest(value) {
  function legacyCanonical(item) {
    if (Array.isArray(item)) return `[${item.map(legacyCanonical).join(',')}]`;
    if (item && typeof item === 'object') return `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${legacyCanonical(item[key])}`).join(',')}}`;
    return JSON.stringify(item);
  }
  return createHash('sha256').update(legacyCanonical(value), 'utf8').digest('hex');
}

export function packXchangeValidationSnapshot(snapshot) {
  canonicalizeValidationValue(snapshot, '$.snapshot');
  const serialized = JSON.stringify(snapshot);
  if (typeof serialized !== 'string') throw canonicalizationError(snapshot, '$.snapshot');
  const normalized = JSON.parse(serialized);
  const json = Buffer.from(serialized, 'utf8');
  return {
    encoding: 'deflate-raw-base64url',
    hash: validationDigest(normalized),
    data: deflateRawSync(json, { level: 9 }).toString('base64url'),
  };
}

export function unpackXchangeValidationSnapshot(packed) {
  if (!packed || packed.encoding !== 'deflate-raw-base64url' || typeof packed.data !== 'string' || typeof packed.hash !== 'string') return null;
  try {
    const snapshot = JSON.parse(inflateRawSync(Buffer.from(packed.data, 'base64url')).toString('utf8'));
    return validationDigest(snapshot) === packed.hash || legacyJsonDigest(snapshot) === packed.hash ? snapshot : null;
  } catch {
    return null;
  }
}
