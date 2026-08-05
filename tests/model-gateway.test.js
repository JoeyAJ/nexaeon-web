import assert from 'node:assert/strict';
import test from 'node:test';

import { getModelConfiguration, publicModelConfiguration } from '../lib/model/modelConfig.js';
import { ModelGatewayError, redactModelSecrets } from '../lib/model/modelErrors.js';
import { createModelGateway } from '../lib/model/modelGateway.js';
import { createModelProviderRegistry } from '../lib/model/providerRegistry.js';
import { createMockModelProvider } from '../lib/model/providers/mockProvider.js';
import { createOpenAIModelProvider } from '../lib/model/providers/openaiProvider.js';
import { parseStructuredModelOutput, validateStrictSchema } from '../lib/model/schemaValidation.js';

const schema = {
  type: 'object', properties: { title: { type: 'string', minLength: 1, maxLength: 20 } },
  required: ['title'], additionalProperties: false,
};
const request = { instructions: 'system', input: '{}', schemaName: 'test_schema', schema, mockResult: () => ({ title: 'Fallback' }) };

function clientWith(create) { return { responses: { create } }; }

test('provider registry accepts conforming providers and rejects unknown providers', () => {
  const registry = createModelProviderRegistry([createMockModelProvider()]);
  assert.deepEqual(registry.ids(), ['mock']);
  assert.equal(registry.get('mock').id, 'mock');
  assert.throws(() => registry.get('unlisted'), { code: 'MODEL_PROVIDER_NOT_ALLOWED' });
});

test('mock provider performs deterministic structured and text generation', async () => {
  const provider = createMockModelProvider();
  assert.deepEqual((await provider.structuredGenerate({ mockResult: () => ({ title: 'Mock' }) })).output, { title: 'Mock' });
  assert.equal((await provider.textGenerate({ mockResult: () => 'Mock text' })).output, 'Mock text');
});

test('provider selection defaults to mock and never exposes the API key in public configuration', () => {
  const config = getModelConfiguration({ OPENAI_API_KEY: 'sk-super-secret' });
  assert.equal(config.provider, 'mock');
  assert.equal('apiKey' in publicModelConfiguration(config), false);
  assert.equal(JSON.stringify(publicModelConfiguration(config)).includes('super-secret'), false);
});

test('real OpenAI adapter sends strict structured output with tools disabled', async () => {
  let sent;
  const provider = createOpenAIModelProvider({
    config: { apiKey: 'test-key', model: 'test-model', maxOutputTokens: 500, timeoutMs: 1000 },
    client: clientWith(async (payload) => { sent = payload; return { output_text: '{"title":"Real"}', usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } }; }),
  });
  const result = await provider.structuredGenerate(request);
  assert.equal(result.output, '{"title":"Real"}');
  assert.equal(sent.store, false); assert.deepEqual(sent.tools, []); assert.equal(sent.tool_choice, 'none');
  assert.equal(sent.text.format.strict, true); assert.deepEqual(sent.text.format.schema, schema);
  assert.deepEqual(result.usage, { inputTokens: 2, outputTokens: 3, totalTokens: 5 });
});

test('missing API key, timeout, rate limit, invalid JSON, and schema invalid use explicit mock fallback metadata', async () => {
  const cases = [
    [{ NEXAEON_MODEL_PROVIDER: 'openai' }, null, 'MODEL_CONFIGURATION_MISSING'],
    [{ NEXAEON_MODEL_PROVIDER: 'openai', OPENAI_API_KEY: 'test' }, Object.assign(new Error('late'), { name: 'TimeoutError' }), 'MODEL_TIMEOUT'],
    [{ NEXAEON_MODEL_PROVIDER: 'openai', OPENAI_API_KEY: 'test' }, Object.assign(new Error('busy'), { status: 429 }), 'MODEL_RATE_LIMITED'],
  ];
  for (const [env, failure, reason] of cases) {
    const gateway = createModelGateway({ env, ...(failure ? { openaiClient: clientWith(async () => { throw failure; }) } : {}) });
    const result = await gateway.structuredGenerate(request);
    assert.equal(result.output.title, 'Fallback'); assert.equal(result.metadata.provider, 'mock');
    assert.equal(result.metadata.fallbackUsed, true); assert.equal(result.metadata.fallbackReason, reason);
  }
  for (const output of ['```json\nnot-json\n```', '{"title":"Real","unknown":true}']) {
    const gateway = createModelGateway({ env: { NEXAEON_MODEL_PROVIDER: 'openai', OPENAI_API_KEY: 'test' }, openaiClient: clientWith(async () => ({ output_text: output })) });
    const result = await gateway.structuredGenerate(request);
    assert.equal(result.output.title, 'Fallback'); assert.equal(result.metadata.fallbackUsed, true);
    assert.match(result.metadata.fallbackReason, /^MODEL_(?:JSON|SCHEMA)_INVALID$/u);
  }
});

test('disabled mode returns a recoverable normalized error instead of invoking a provider', async () => {
  const gateway = createModelGateway({ env: { NEXAEON_MODEL_PROVIDER: 'disabled' } });
  await assert.rejects(() => gateway.structuredGenerate(request), { code: 'MODEL_DISABLED', status: 503 });
});

test('safe parser accepts JSON fences, rejects HTML/script, and strict validation rejects missing and extra fields', () => {
  assert.deepEqual(parseStructuredModelOutput('```json\n{"title":"Safe"}\n```'), { title: 'Safe' });
  assert.throws(() => parseStructuredModelOutput('<script>alert(1)</script>'), { code: 'MODEL_JSON_INVALID' });
  assert.throws(() => validateStrictSchema({}, schema), { code: 'MODEL_SCHEMA_INVALID' });
  assert.throws(() => validateStrictSchema({ title: 'Safe', unknown: true }, schema), { code: 'MODEL_SCHEMA_INVALID' });
});

test('secret redaction removes credentials and normalized errors expose no raw provider text', () => {
  const secret = 'sk-test-secret-value-123456';
  assert.equal(redactModelSecrets(`Authorization: Bearer ${secret}`).includes(secret), false);
  const error = new ModelGatewayError('MODEL_PROVIDER_ERROR', { provider: 'openai' });
  assert.equal(JSON.stringify(error).includes(secret), false);
});
