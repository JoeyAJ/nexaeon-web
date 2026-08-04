import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function validationDigest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

export function packXchangeValidationSnapshot(snapshot) {
  const json = Buffer.from(JSON.stringify(snapshot), 'utf8');
  return {
    encoding: 'deflate-raw-base64url',
    hash: validationDigest(snapshot),
    data: deflateRawSync(json, { level: 9 }).toString('base64url'),
  };
}

export function unpackXchangeValidationSnapshot(packed) {
  if (!packed || packed.encoding !== 'deflate-raw-base64url' || typeof packed.data !== 'string' || typeof packed.hash !== 'string') return null;
  try {
    const snapshot = JSON.parse(inflateRawSync(Buffer.from(packed.data, 'base64url')).toString('utf8'));
    return validationDigest(snapshot) === packed.hash ? snapshot : null;
  } catch {
    return null;
  }
}
