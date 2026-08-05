import OpenAI from 'openai';
import { ModelGatewayError, normalizeModelError } from '../modelErrors.js';

function responseText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output || []).flatMap((item) => item?.content || []).filter((part) => part?.type === 'output_text').map((part) => part.text || '').join('\n').trim();
}

function usage(response) {
  if (!response?.usage) return null;
  return {
    inputTokens: Number(response.usage.input_tokens) || 0,
    outputTokens: Number(response.usage.output_tokens) || 0,
    totalTokens: Number(response.usage.total_tokens) || 0,
  };
}

export function createOpenAIModelProvider({ config, client } = {}) {
  const openai = client || (config?.apiKey ? new OpenAI({ apiKey: config.apiKey, timeout: config.timeoutMs }) : null);
  return Object.freeze({
    id: 'openai',
    health() { return { provider: 'openai', configured: Boolean(config?.apiKey), status: config?.apiKey ? 'ready' : 'missing_configuration' }; },
    async structuredGenerate(request) {
      if (!openai) throw new ModelGatewayError('MODEL_CONFIGURATION_MISSING', { status: 503, provider: 'openai' });
      try {
        const response = await openai.responses.create({
          model: config.model, store: false, max_output_tokens: config.maxOutputTokens,
          tools: [], tool_choice: 'none', instructions: request.instructions,
          input: [{ role: 'user', content: [{ type: 'input_text', text: request.input }] }],
          text: { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.schema } },
        });
        return { output: response?.output_parsed || responseText(response), model: config.model, usage: usage(response) };
      } catch (error) { throw normalizeModelError(error, 'openai'); }
    },
    async textGenerate(request) {
      if (!openai) throw new ModelGatewayError('MODEL_CONFIGURATION_MISSING', { status: 503, provider: 'openai' });
      try {
        const response = await openai.responses.create({
          model: config.model, store: false, max_output_tokens: config.maxOutputTokens,
          tools: [], tool_choice: 'none', instructions: request.instructions,
          input: [{ role: 'user', content: [{ type: 'input_text', text: request.input }] }],
        });
        return { output: responseText(response), model: config.model, usage: usage(response) };
      } catch (error) { throw normalizeModelError(error, 'openai'); }
    },
  });
}
