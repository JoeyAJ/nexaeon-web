import { useEffect, useMemo, useState } from 'react';
import { AGENT_SOURCES } from '../../lib/agent/sourceRegistry.js';
import { createKnowledgeDocuments } from '../../lib/agent/knowledgeDocuments.js';
import { fetchPublicApiResource, PUBLIC_API_TIMEOUT_MS } from '../lib/publicApiClient.js';

export const AGENT_KNOWLEDGE_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  PARTIAL: 'partial',
  EMPTY: 'empty',
  ERROR: 'error',
};

function deriveAgentStatus(documents, failedSources, totalSources) {
  if (failedSources.length === totalSources) return AGENT_KNOWLEDGE_STATUS.ERROR;
  if (!documents.length && failedSources.length > 0) return AGENT_KNOWLEDGE_STATUS.ERROR;
  if (!documents.length) return AGENT_KNOWLEDGE_STATUS.EMPTY;
  if (failedSources.length > 0) return AGENT_KNOWLEDGE_STATUS.PARTIAL;
  return AGENT_KNOWLEDGE_STATUS.READY;
}

export function useAgentKnowledge(lang) {
  const [state, setState] = useState({
    lang: null,
    status: AGENT_KNOWLEDGE_STATUS.LOADING,
    documents: [],
    failedSources: [],
  });

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    Promise.allSettled(AGENT_SOURCES.map(async (source) => {
      const result = await fetchPublicApiResource(source.endpoint, {
        signal: controller.signal,
        timeoutMs: PUBLIC_API_TIMEOUT_MS,
      });

      return {
        source,
        documents: createKnowledgeDocuments(source.id, result.items, lang),
      };
    })).then((results) => {
      if (!isActive) return;

      const documents = [];
      const failedSources = [];

      results.forEach((result, index) => {
        const source = AGENT_SOURCES[index];
        if (result.status === 'fulfilled') documents.push(...result.value.documents);
        else failedSources.push(source.id);
      });

      setState({
        lang,
        status: deriveAgentStatus(documents, failedSources, AGENT_SOURCES.length),
        documents,
        failedSources,
      });
    });

    return () => {
      isActive = false;
      controller.abort(new DOMException('Agent knowledge unmounted', 'AbortError'));
    };
  }, [lang]);

  return useMemo(() => {
    if (state.lang !== lang) {
      return {
        lang,
        status: AGENT_KNOWLEDGE_STATUS.LOADING,
        documents: [],
        failedSources: [],
        sources: AGENT_SOURCES,
      };
    }

    return {
      ...state,
      sources: AGENT_SOURCES,
    };
  }, [lang, state]);
}
