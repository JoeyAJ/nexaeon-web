import {
  MAX_HISTORY_ITEMS,
  MAX_HISTORY_ITEM_CHARS,
  MAX_HISTORY_TOTAL_CHARS,
  citationsFromNumberedSources,
  createFallbackSuggestedQuestions,
  createOpenAIClient,
  isAllowedBrowserOrigin,
  moderateText,
  parseRequestBody,
  validateModelOutput,
} from './chatRuntime.js';
import { detectQueryIntent } from './queryIntent.js';
import { normalizeAgentLocale } from './localeRegistry.js';

const REQUEST_FIELDS = new Set(['message', 'query', 'locale', 'lang', 'history']);

function cleanText(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function validateToolAgentRequestBody(body, maxQueryChars = 500) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, reason: 'invalid_request' };
  }
  if (Object.keys(body).some((field) => !REQUEST_FIELDS.has(field))) {
    return { ok: false, status: 400, reason: 'invalid_request' };
  }

  const query = cleanText(body.message ?? body.query, maxQueryChars + 1);
  if (!query || query.length > maxQueryChars) {
    return { ok: false, status: 400, reason: 'invalid_request' };
  }

  const lang = normalizeAgentLocale(body.locale ?? body.lang).lang;
  const incomingHistory = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
  const history = [];
  let historyTotal = 0;
  for (const entry of incomingHistory) {
    if (!entry || !['user', 'assistant'].includes(entry.role) || typeof entry.content !== 'string') {
      return { ok: false, status: 400, reason: 'invalid_request' };
    }
    const content = cleanText(entry.content, MAX_HISTORY_ITEM_CHARS + 1);
    if (!content || content.length > MAX_HISTORY_ITEM_CHARS) {
      return { ok: false, status: 400, reason: 'invalid_request' };
    }
    historyTotal += content.length;
    if (historyTotal > MAX_HISTORY_TOTAL_CHARS) {
      return { ok: false, status: 400, reason: 'invalid_request' };
    }
    history.push({ role: entry.role, content });
  }

  return { ok: true, value: { query, lang, history } };
}

function createCooldownKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 120);
  return `${forwarded || 'local'}:${userAgent || 'unknown'}`;
}

export function checkToolAgentCooldown(req, {
  store,
  cooldownMs = 2500,
  now = Date.now(),
}) {
  const key = createCooldownKey(req);
  const lastSeen = store.get(key);
  if (Number.isFinite(lastSeen) && now - lastSeen >= 0 && now - lastSeen < cooldownMs) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - (now - lastSeen)) / 1000)),
    };
  }
  store.set(key, now);
  return { ok: true };
}

export function extractAllowedToolCalls(response, toolNames, maxToolCalls = 4) {
  const allowed = new Set(toolNames);
  return (response?.output || [])
    .filter((item) => item?.type === 'function_call' && allowed.has(item.name))
    .slice(0, maxToolCalls)
    .map((item) => {
      let args;
      try {
        args = typeof item.arguments === 'string' ? JSON.parse(item.arguments) : item.arguments || {};
      } catch {
        args = {};
      }
      return {
        callId: cleanText(item.call_id || item.id, 160),
        name: item.name,
        args: args && typeof args === 'object' && !Array.isArray(args) ? args : {},
      };
    });
}

function setNoStoreHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
}

function sendJson(res, payload, status = 200, headers = {}) {
  setNoStoreHeaders(res);
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.status(status).json(payload);
}

export function createSourcesOnlyPayload(runtime, {
  reason,
  lang,
  query,
  numberedSources = [],
  executedTools = [],
  structuredOutput = {},
}) {
  const locale = runtime.fallbackMessages[lang] || runtime.fallbackMessages.en;
  return {
    ok: true,
    mode: 'sources_only',
    answer: reason === 'moderated' ? locale.moderated : '',
    reason,
    citations: citationsFromNumberedSources(numberedSources),
    suggestedQuestions: createFallbackSuggestedQuestions({
      query,
      lang,
      numberedSources,
      queryIntent: { sourceIntents: [runtime.sourceIntent] },
    }),
    partialSources: false,
    agentId: runtime.agentId,
    supportingAgentId: null,
    executedTools,
    ...structuredOutput,
  };
}

function logRuntimeEvent(runtime, event, logger = console.info) {
  const safe = {
    service: runtime.service,
    endpoint: runtime.endpoint,
    category: event.category,
    statusCode: event.statusCode,
    mode: event.mode,
    reason: event.reason || null,
    toolCount: event.toolCount || 0,
    sourceCount: event.sourceCount || 0,
    locale: event.locale || null,
  };
  logger(JSON.stringify(safe));
  return safe;
}

export async function handleToolEnabledAgentRequest(runtime, req, res, deps = {}) {
  const invalid = { ok: false, mode: 'sources_only', reason: 'invalid_request', agentId: runtime.agentId };
  if (req.method !== 'POST') {
    setNoStoreHeaders(res);
    res.setHeader('Allow', 'POST');
    res.status(405).json(invalid);
    return;
  }
  if (!isAllowedBrowserOrigin(req)) {
    sendJson(res, invalid, 400);
    return;
  }

  const cooldown = deps.skipCooldown
    ? { ok: true }
    : checkToolAgentCooldown(req, {
        store: runtime.cooldownStore,
        cooldownMs: runtime.cooldownMs,
        ...(deps.cooldownOptions || {}),
      });
  if (!cooldown.ok) {
    sendJson(res, invalid, 429, { 'Retry-After': String(cooldown.retryAfterSeconds) });
    return;
  }

  let body;
  try {
    body = await parseRequestBody(req);
  } catch (error) {
    sendJson(res, invalid, error.statusCode === 413 ? 413 : 400);
    return;
  }

  const validated = (deps.validateRequestBody || runtime.validateRequestBody)(body);
  if (!validated.ok) {
    sendJson(res, { ...invalid, reason: validated.reason }, validated.status);
    return;
  }

  const { query, lang, history } = validated.value;
  const config = deps.config || runtime.getProductionConfig();
  const logger = deps.logger || console.info;
  const openai = deps.openai || (config.hasApiKey ? createOpenAIClient(config) : null);
  let calls = [runtime.defaultToolCall(query)];
  let selectionFailed = false;

  if (config.enabled && config.hasApiKey && !config.forceSourcesOnly) {
    try {
      const flagged = await (deps.moderateText || moderateText)(
        openai,
        [query, ...history.map((entry) => entry.content)].join('\n'),
      );
      if (flagged) {
        const payload = createSourcesOnlyPayload(runtime, { reason: 'moderated', lang, query });
        sendJson(res, payload);
        logRuntimeEvent(runtime, { category: 'input_moderated', statusCode: 200, mode: payload.mode, reason: payload.reason, locale: lang }, logger);
        return;
      }
    } catch {
      const payload = createSourcesOnlyPayload(runtime, { reason: 'model_unavailable', lang, query });
      sendJson(res, payload);
      logRuntimeEvent(runtime, { category: 'moderation_failed', statusCode: 200, mode: payload.mode, reason: payload.reason, locale: lang }, logger);
      return;
    }

    try {
      const selection = await deps.selectToolCalls({ openai, query, lang, history, config });
      if (selection.calls.length) calls = selection.calls;
    } catch {
      selectionFailed = true;
    }
  }

  let toolResults;
  try {
    const publicData = await deps.loadPublicItems();
    toolResults = calls.map((call) => deps.executeTool(call.name, call.args, publicData));
  } catch {
    const payload = createSourcesOnlyPayload(runtime, { reason: 'tool_unavailable', lang, query });
    sendJson(res, payload);
    logRuntimeEvent(runtime, { category: 'tool_failed', statusCode: 200, mode: payload.mode, reason: payload.reason, locale: lang }, logger);
    return;
  }

  const executedTools = toolResults.map((result) => result.tool);
  const structuredOutput = deps.buildStructuredOutput
    ? deps.buildStructuredOutput(toolResults, { query, lang })
    : {};
  const numberedSources = deps.numberToolSources(toolResults, lang);
  if (!numberedSources.length) {
    const payload = createSourcesOnlyPayload(runtime, { reason: 'no_sources', lang, query, executedTools, structuredOutput });
    sendJson(res, payload);
    logRuntimeEvent(runtime, { category: 'no_sources', statusCode: 200, mode: payload.mode, reason: payload.reason, toolCount: executedTools.length, locale: lang }, logger);
    return;
  }

  const fallbackReason = !config.enabled
    ? 'disabled'
    : !config.hasApiKey
      ? 'missing_configuration'
      : config.forceSourcesOnly
        ? 'forced_sources_only'
        : selectionFailed
          ? 'model_unavailable'
          : '';
  if (fallbackReason) {
    const payload = createSourcesOnlyPayload(runtime, {
      reason: fallbackReason,
      lang,
      query,
      numberedSources,
      executedTools,
      structuredOutput,
    });
    sendJson(res, payload);
    logRuntimeEvent(runtime, {
      category: fallbackReason,
      statusCode: 200,
      mode: payload.mode,
      reason: payload.reason,
      toolCount: executedTools.length,
      sourceCount: numberedSources.length,
      locale: lang,
    }, logger);
    return;
  }

  try {
    const grounded = await deps.createGroundedAnswer({
      openai,
      query,
      lang,
      history,
      numberedSources,
      executedTools,
      ...structuredOutput,
      config,
    });
    const validatedOutput = validateModelOutput(grounded.parsed, numberedSources, {
      query,
      lang,
      queryIntent: detectQueryIntent(query),
    });
    if (!validatedOutput.ok) throw new Error(validatedOutput.reason || 'model_output_invalid');

    if (await (deps.moderateText || moderateText)(openai, validatedOutput.answer)) {
      const payload = createSourcesOnlyPayload(runtime, {
        reason: 'moderated',
        lang,
        query,
        numberedSources,
        executedTools,
        structuredOutput,
      });
      sendJson(res, payload);
      logRuntimeEvent(runtime, { category: 'output_moderated', statusCode: 200, mode: payload.mode, reason: payload.reason, toolCount: executedTools.length, sourceCount: numberedSources.length, locale: lang }, logger);
      return;
    }

    const payload = {
      ok: true,
      mode: 'ai',
      answer: validatedOutput.answer,
      citations: validatedOutput.localizedCitations,
      suggestedQuestions: validatedOutput.suggestedQuestions,
      partialSources: false,
      agentId: runtime.agentId,
      supportingAgentId: null,
      executedTools,
      ...structuredOutput,
    };
    sendJson(res, payload);
    logRuntimeEvent(runtime, { category: 'request_completed', statusCode: 200, mode: payload.mode, toolCount: executedTools.length, sourceCount: numberedSources.length, locale: lang }, logger);
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || String(error?.code || '').toLowerCase().includes('timeout');
    const payload = createSourcesOnlyPayload(runtime, {
      reason: timeout ? 'model_timeout' : 'model_unavailable',
      lang,
      query,
      numberedSources,
      executedTools,
      structuredOutput,
    });
    sendJson(res, payload);
    logRuntimeEvent(runtime, { category: timeout ? 'model_timeout' : 'model_failed', statusCode: 200, mode: payload.mode, reason: payload.reason, toolCount: executedTools.length, sourceCount: numberedSources.length, locale: lang }, logger);
  }
}
