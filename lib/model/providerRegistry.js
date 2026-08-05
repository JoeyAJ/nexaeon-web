import { ModelGatewayError } from './modelErrors.js';

export function createModelProviderRegistry(providers = []) {
  const registry = new Map();
  for (const provider of providers) {
    if (!provider?.id || typeof provider.structuredGenerate !== 'function' || typeof provider.textGenerate !== 'function') {
      throw new ModelGatewayError('MODEL_PROVIDER_INVALID');
    }
    registry.set(provider.id, provider);
  }
  return Object.freeze({
    get(id) {
      const provider = registry.get(id);
      if (!provider) throw new ModelGatewayError('MODEL_PROVIDER_NOT_ALLOWED', { status: 503 });
      return provider;
    },
    health() { return [...registry.values()].map((provider) => provider.health()); },
    ids() { return [...registry.keys()]; },
  });
}
