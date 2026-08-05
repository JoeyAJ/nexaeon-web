import { ModelGatewayError } from '../modelErrors.js';

export function createMockModelProvider() {
  return Object.freeze({
    id: 'mock',
    health() { return { provider: 'mock', configured: true, status: 'ready' }; },
    async structuredGenerate(request) {
      if (typeof request.mockResult !== 'function') throw new ModelGatewayError('MODEL_MOCK_RESULT_MISSING', { status: 500, provider: 'mock' });
      return { output: await request.mockResult(), model: 'deterministic-v1', usage: null };
    },
    async textGenerate(request) {
      if (typeof request.mockResult !== 'function') throw new ModelGatewayError('MODEL_MOCK_RESULT_MISSING', { status: 500, provider: 'mock' });
      return { output: String(await request.mockResult()), model: 'deterministic-v1', usage: null };
    },
  });
}
