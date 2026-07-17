import { useEffect, useMemo, useRef, useState } from 'react';
import { deriveFusionOutcome } from '../lib/nexonFusionPolicy.ts';
import { AGENT_SOURCES } from '../../lib/agent/sourceRegistry.js';
import { getModuleAgent } from '../../lib/agent/moduleAgentRegistry.js';
import { NAVIGATOR_AGENT } from '../data/agentBrands.js';
import {
  AGENT_LANDING_COPY,
  AGENT_STATUS,
  getAgentLocale,
  getPublicAgents,
} from '../data/agentRegistry.js';
import {
  COMPANION_NAVIGATOR_CLEAR_EVENT,
  COMPANION_NAVIGATOR_FOCUS_EVENT,
  consumeCompanionNavigatorHandoff,
} from '../lib/companionActionConfig.js';

const MAX_HISTORY_ITEMS = 4;
const MAX_HISTORY_ITEM_CHARS = 1000;

const ASSISTANT_UI = {
  zh: {
    title: NAVIGATOR_AGENT.name,
    intro: NAVIGATOR_AGENT.subtitles.zh,
    inputLabel: '輸入你想詢問的 NexAeon 公開內容',
    placeholder: '例如：Joey 的研究方向是什麼？',
    submit: '送出',
    stop: '停止等待',
    clear: '清除對話',
    suggestions: ['Joey 的研究方向是什麼？', 'NexAeon 有哪些 AI 學習項目？', '目前有哪些公開 Demo？', 'NexAeon 的學習教練理念是什麼？'],
    generating: 'Navigator 正在根據公開來源整理回答……',
    disabled: 'AI 回答功能尚未啟用，您仍可查看相關公開來源。',
    modelUnavailable: 'AI 回答暫時無法使用，以下仍提供最相關的公開來源。',
    forcedSourcesOnly: '目前以公開來源導航模式提供結果。',
    rateLimited: (seconds) => `請稍候 ${seconds} 秒後再提問。`,
    noSources: '目前公開知識中沒有足夠資料回答這個問題。',
    moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: '回答僅根據 NexAeon 目前公開的知識來源生成，內容可能不完整。',
    partial: '部分公開來源暫時無法讀取，回答已根據目前可用來源生成。',
    sourcesOnly: '以下仍提供最相關的公開來源。',
    source: '來源',
    type: '類型',
    updatedAt: '更新時間',
    viewSource: '查看來源',
    openExternal: '開啟外部來源',
    citationLabel: (sourceId) => `跳到來源 ${sourceId}`,
    userLabel: '你',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
    currentModule: '目前模組',
    defaultAgent: '預設 Agent',
    responseAgent: '回應 Agent',
  },
  ko: {
    title: NAVIGATOR_AGENT.name,
    intro: NAVIGATOR_AGENT.subtitles.ko,
    inputLabel: 'NexAeon 공개 콘텐츠에 대해 질문하세요',
    placeholder: '예: Joey의 연구 방향은 무엇인가요?',
    submit: '보내기',
    stop: '대기 중지',
    clear: '대화 지우기',
    suggestions: ['Joey의 연구 방향은 무엇인가요?', 'NexAeon에는 어떤 AI 학습 프로젝트가 있나요?', '현재 공개된 Demo는 무엇인가요?', 'NexAeon의 학습 코칭 철학은 무엇인가요?'],
    generating: 'Navigator가 공개된 소스를 바탕으로 답변을 정리하고 있습니다…',
    disabled: 'AI 답변 기능은 아직 활성화되지 않았지만 관련 공개 소스는 계속 확인할 수 있습니다.',
    modelUnavailable: 'AI 답변을 일시적으로 사용할 수 없습니다. 아래에서 관련 공개 소스를 확인할 수 있습니다.',
    forcedSourcesOnly: '현재 공개 소스 탐색 모드로 결과를 제공합니다.',
    rateLimited: (seconds) => `${seconds}초 후에 다시 질문해 주세요.`,
    noSources: '현재 공개된 지식만으로는 이 질문에 답할 충분한 정보가 없습니다.',
    moderated: '이 질문은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: '답변은 현재 공개된 NexAeon 지식 소스를 기반으로 생성되며 일부 내용이 불완전할 수 있습니다.',
    partial: '일부 공개 소스를 일시적으로 불러오지 못해, 현재 이용 가능한 소스를 기준으로 답변했습니다.',
    sourcesOnly: '아래에서 가장 관련 있는 공개 소스를 확인할 수 있습니다.',
    source: '출처',
    type: '유형',
    updatedAt: '업데이트',
    viewSource: '출처 보기',
    openExternal: '외부 출처 열기',
    citationLabel: (sourceId) => `${sourceId} 출처로 이동`,
    userLabel: '나',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
    currentModule: '현재 모듈',
    defaultAgent: '기본 Agent',
    responseAgent: '응답 Agent',
  },
  en: {
    title: NAVIGATOR_AGENT.name,
    intro: NAVIGATOR_AGENT.subtitles.en,
    inputLabel: 'Ask about NexAeon public knowledge',
    placeholder: 'Example: What are Joey’s research interests?',
    submit: 'Send',
    stop: 'Stop waiting',
    clear: 'Clear chat',
    suggestions: ['What are Joey’s research interests?', 'Which AI learning projects are available in NexAeon?', 'Which demos are currently public?', 'What is NexAeon’s learning coaching philosophy?'],
    generating: 'Navigator is preparing an answer from the public sources…',
    disabled: 'AI answers are not enabled yet. You can still review the relevant public sources.',
    modelUnavailable: 'AI answers are temporarily unavailable. The most relevant public sources are still shown below.',
    forcedSourcesOnly: 'Results are currently provided in public-source navigation mode.',
    rateLimited: (seconds) => `Please wait ${seconds} seconds before asking again.`,
    noSources: 'The current public knowledge does not contain enough information to answer this question.',
    moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Answers are generated from NexAeon’s currently public knowledge sources and may be incomplete.',
    partial: 'Some public sources are temporarily unavailable. This answer uses the sources currently available.',
    sourcesOnly: 'The most relevant public sources are still shown below.',
    source: 'Source',
    type: 'Type',
    updatedAt: 'Updated At',
    viewSource: 'View source',
    openExternal: 'Open external source',
    citationLabel: (sourceId) => `Jump to source ${sourceId}`,
    userLabel: 'You',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
    currentModule: 'Current module',
    defaultAgent: 'Default Agent',
    responseAgent: 'Response Agent',
  },
};

function formatDate(value, lang) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-TW' : lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(time));
}

function getFallbackMessage(reason, ui) {
  if (reason === 'disabled' || reason === 'missing_configuration') return ui.disabled;
  if (reason === 'no_sources') return ui.noSources;
  if (reason === 'moderated') return ui.moderated;
  if (reason === 'forced_sources_only') return ui.forcedSourcesOnly;
  return ui.modelUnavailable;
}

function normalizeHistory(messages) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_HISTORY_ITEMS)
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').slice(0, MAX_HISTORY_ITEM_CHARS),
    }));
}

function scrollToCitation(sourceId) {
  const target = document.getElementById(`citation-${sourceId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.focus({ preventScroll: true });
  target.classList.add('agent-result-card-highlight');
  window.setTimeout(() => target.classList.remove('agent-result-card-highlight'), 1600);
}

function renderInlineMarkdown(text, ui, onCitationOpen) {
  const parts = String(text || '').split(/(\[S\d+\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const marker = part.match(/^\[(S\d+)\]$/);
    if (marker) {
      return (
        <button
          key={`${part}-${index}`}
          className="agent-citation-marker"
          type="button"
          aria-label={ui.citationLabel(marker[1])}
          onClick={() => { scrollToCitation(marker[1]); onCitationOpen?.(marker[1]); }}
        >
          {part}
        </button>
      );
    }
    if (/^`[^`]+`$/.test(part)) return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function parseMarkdownBlocks(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push(list);
    list = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const type = ordered ? 'ordered' : 'unordered';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(ordered?.[1] || unordered?.[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function AnswerText({ text, ui, onCitationOpen }) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="agent-answer-text">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'ordered' || block.type === 'unordered') {
          const ListTag = block.type === 'ordered' ? 'ol' : 'ul';
          return (
            <ListTag key={`${block.type}-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item, ui, onCitationOpen)}</li>
              ))}
            </ListTag>
          );
        }
        return <p key={`${block.text}-${blockIndex}`}>{renderInlineMarkdown(block.text, ui, onCitationOpen)}</p>;
      })}
    </div>
  );
}

function CitationCard({ citation, lang, ui, onNavigate }) {
  const title = citation.localizedTitle || citation.title;
  const summary = citation.localizedSummary || citation.summary || citation.excerpt;
  const moduleLabel = citation.localizedModuleLabel || citation.moduleLabel;
  const typeLabel = citation.localizedTypeLabel || citation.typeLabel || citation.itemType;

  return (
    <article className="agent-result-card" id={`citation-${citation.sourceId}`} tabIndex={-1}>
      <div className="agent-result-topline">
        <span>{citation.sourceId}</span>
        <span>{moduleLabel}</span>
        {typeLabel ? <span>{typeLabel}</span> : null}
      </div>
      <h2>{title}</h2>
      <p>{summary}</p>
      <div className="agent-result-meta">
        <span>{ui.source}: {moduleLabel}</span>
        {typeLabel ? <span>{ui.type}: {typeLabel}</span> : null}
        {citation.updatedAt ? <span>{ui.updatedAt}: {formatDate(citation.updatedAt, lang)}</span> : null}
      </div>
      <div className="mvp-actions">
        {citation.sourceRoute ? (
          <button className="mvp-action-button" type="button" onClick={() => onNavigate(citation.sourceRoute)}>
            {ui.viewSource}
          </button>
        ) : null}
        {citation.sourceUrl ? (
          <a className="mvp-action-button" href={citation.sourceUrl} target="_blank" rel="noopener noreferrer">
            {ui.openExternal}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function getAgentLandingStatus(agent, copy) {
  const isActiveNavigator = agent.status === AGENT_STATUS.active && agent.chatEnabled;
  if (isActiveNavigator) {
    return {
      label: copy.active,
      tone: 'active',
    };
  }

  return {
    label: `${copy.scaffold} / ${copy.comingSoon}`,
    tone: 'scaffold',
  };
}

function AgentLandingSection({ lang, navigate }) {
  const copy = AGENT_LANDING_COPY[lang] || AGENT_LANDING_COPY.en;
  const agents = getPublicAgents();

  return (
    <section className="agent-landing-section" aria-labelledby="agent-landing-title">
      <div className="agent-landing-heading">
        <span className="detail-module-label">{copy.eyebrow}</span>
        <h2 id="agent-landing-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>

      <div className="agent-landing-grid">
        {agents.map((agent) => {
          const localized = getAgentLocale(agent, lang);
          const status = getAgentLandingStatus(agent, copy);

          return (
            <article className="agent-landing-card" data-status={status.tone} key={agent.key}>
              <div className="agent-landing-card-top">
                <span className="agent-landing-initial" aria-hidden="true">{agent.initial}</span>
                <span className="agent-landing-status">{status.label}</span>
              </div>
              <h3>{agent.name}</h3>
              <p>{localized.subtitle}</p>
              <div className="agent-landing-meta">
                <span>{localized.moduleLabel}</span>
                <span>{agent.chatEnabled ? copy.active : copy.comingSoon}</span>
              </div>
              <button className="mvp-action-button" type="button" onClick={() => navigate(agent.route)}>
                {copy.open}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AssistantMessage({ message, lang, ui, onNavigate, onCitationOpen }) {
  const isSourcesOnly = message.mode === 'sources_only';
  const showFallback = isSourcesOnly && !message.content;
  const showSourcesOnlyNotice = isSourcesOnly && Boolean(message.content) && message.reason !== 'moderated';
  const responseAgent = getModuleAgent(message.agentId);
  const responseAgentName = responseAgent?.name?.[lang] || responseAgent?.name?.en || '';
  return (
    <section className="agent-message agent-message-assistant">
      <div className="agent-message-label">
        {ui.assistantLabel}{responseAgentName ? ` · ${ui.responseAgent}: ${responseAgentName}` : ''}
      </div>
      {message.content ? <AnswerText text={message.content} ui={ui} onCitationOpen={onCitationOpen} /> : null}
      {showFallback ? (
        <p className="agent-state-message" data-state={message.reason || 'sources-only'}>
          {getFallbackMessage(message.reason, ui)}
        </p>
      ) : null}
      {showSourcesOnlyNotice ? (
        <p className="agent-state-message" data-state="sources-only">
          {getFallbackMessage(message.reason, ui)}
        </p>
      ) : null}
      {message.partialSources ? <p className="agent-state-message" data-state="partial">{ui.partial}</p> : null}
      <p className="agent-grounding-note">{ui.groundedNote}</p>
      {message.citations?.length ? (
        <div className="agent-result-grid">
          {message.citations.map((citation) => (
            <CitationCard key={citation.sourceId} citation={citation} lang={lang} ui={ui} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function NexAeonNavigatorPage({ item, common, lang, navigate, eventBridge, activityAdapter, fusionOrchestrator }) {
  const ui = ASSISTANT_UI[lang] || ASSISTANT_UI.en;
  const [companionHandoff] = useState(() => consumeCompanionNavigatorHandoff(window));
  const [query, setQuery] = useState(() => companionHandoff?.prompt?.slice(0, 500) || '');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const inputRef = useRef(null);
  const companionPrefillRef = useRef(Boolean(companionHandoff?.prompt));
  const abortRef = useRef(null);
  const activeRequestRef = useRef(false);
  const submissionLockRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const activeRequestIdRef = useRef(null);
  const lastCompletedRequestIdRef = useRef(null);
  const lastSubmissionRef = useRef({ query: '', at: 0 });
  const isComposingRef = useRef(false);
  const activeFusionTokenRef = useRef(null);
  const citationFusionSequenceRef = useRef(0);
  const contextAgent = getModuleAgent(companionHandoff?.currentModule);
  const preferredAgent = getModuleAgent(companionHandoff?.preferredAgent);

  useEffect(() => {
    if (!companionHandoff?.focusInput && !companionHandoff?.prompt) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [companionHandoff]);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    const clearPrefill = () => {
      if (companionPrefillRef.current) setQuery('');
      companionPrefillRef.current = false;
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener(COMPANION_NAVIGATOR_FOCUS_EVENT, focusInput);
    window.addEventListener(COMPANION_NAVIGATOR_CLEAR_EVENT, clearPrefill);
    return () => {
      window.removeEventListener(COMPANION_NAVIGATOR_FOCUS_EVENT, focusInput);
      window.removeEventListener(COMPANION_NAVIGATOR_CLEAR_EVENT, clearPrefill);
    };
  }, []);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return undefined;
    const timerId = window.setInterval(() => {
      setRetryAfterSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [retryAfterSeconds]);

  useEffect(() => () => {
    const requestId = activeRequestIdRef.current;
    if (requestId) eventBridge?.emit({ type: 'navigator_response_aborted', requestId, timestamp: Date.now() });
    if (activeFusionTokenRef.current) fusionOrchestrator?.abort(activeFusionTokenRef.current);
    abortRef.current?.abort();
    activeRequestRef.current = false;
    submissionLockRef.current = false;
    requestSequenceRef.current += 1;
    activeRequestIdRef.current = null;
  }, [eventBridge, fusionOrchestrator]);

  const suggestedQuestions = useMemo(() => {
    const latest = [...messages].reverse().find((message) => message.role === 'assistant' && message.suggestedQuestions?.length);
    return latest?.suggestedQuestions?.length ? latest.suggestedQuestions : ui.suggestions;
  }, [messages, ui.suggestions]);

  async function submitQuery(nextQuery = query) {
    const trimmed = String(nextQuery || '').trim();
    if (!trimmed || retryAfterSeconds > 0 || isGenerating || activeRequestRef.current || submissionLockRef.current) return;
    const now = Date.now();
    if (lastSubmissionRef.current.query === trimmed && now - lastSubmissionRef.current.at < 1000) return;
    lastSubmissionRef.current = { query: trimmed, at: now };
    activeRequestRef.current = true;
    submissionLockRef.current = true;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    const requestId = `navigator-${requestSequence}-${Date.now()}`;
    activeRequestIdRef.current = requestId;
    lastCompletedRequestIdRef.current = null;
    const fusionToken = fusionOrchestrator?.start({ requestId, operationType: 'question', contextId: 'navigator' }) || null;
    activeFusionTokenRef.current = fusionToken;
    eventBridge?.emit({ type: 'navigator_question_submitted', requestId, timestamp: Date.now() });

    const userMessage = {
      id: `user-${requestSequence}-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const history = normalizeHistory(messages);
    setMessages((current) => [...current, userMessage]);
    setQuery(trimmed);
    setIsGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;
    await Promise.resolve();

    try {
      eventBridge?.emit({ type: 'navigator_response_started', requestId, timestamp: Date.now() });
      fusionOrchestrator?.transition(fusionToken, 'retrieving', {
        sourceAvailability: 'none', citationStatus: 'none', navigationStatus: 'none',
      });
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          locale: lang,
          history,
          currentRoute: companionHandoff?.currentRoute || window.location.pathname,
          currentModule: companionHandoff?.currentModule || 'navigator',
          preferredAgent: companionHandoff?.preferredAgent || '',
        }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (requestSequence !== requestSequenceRef.current) return;
      if (response.status === 429) {
        fusionOrchestrator?.transition(fusionToken, 'unavailable', { resultType: 'unavailable', recoverable: true, sourceAvailability: 'none' });
        eventBridge?.emit({ type: 'navigator_response_error', requestId, errorType: 'rate_limit', timestamp: Date.now() });
        const seconds = Number.parseInt(response.headers.get('Retry-After') || '3', 10);
        setRetryAfterSeconds(Number.isFinite(seconds) ? Math.max(1, seconds) : 3);
        setMessages((current) => current.filter((message) => message.id !== userMessage.id));
        return;
      }
      const assistantMessage = {
        id: `assistant-${requestSequence}-${Date.now()}`,
        role: 'assistant',
        content: payload.answer || '',
        mode: payload.mode || 'sources_only',
        reason: payload.reason || '',
        citations: Array.isArray(payload.citations) ? payload.citations : [],
        suggestedQuestions: Array.isArray(payload.suggestedQuestions) ? payload.suggestedQuestions : [],
        partialSources: Boolean(payload.partialSources),
        agentId: payload.agentId || null,
        supportingAgentId: payload.supportingAgentId || null,
      };
      setMessages((current) => (requestSequence === requestSequenceRef.current ? [...current, assistantMessage] : current));
      if (response.ok) {
        const outcome = deriveFusionOutcome({
          ok: true, status: response.status, mode: assistantMessage.mode, reason: assistantMessage.reason,
          citationCount: assistantMessage.citations.length, partialSources: assistantMessage.partialSources,
        });
        fusionOrchestrator?.transition(fusionToken, outcome.phase, outcome);
        lastCompletedRequestIdRef.current = requestId;
        eventBridge?.emit({ type: 'navigator_response_completed', requestId, timestamp: Date.now() });
      } else {
        const outcome = deriveFusionOutcome({ ok: false, status: response.status });
        fusionOrchestrator?.transition(fusionToken, outcome.phase, outcome);
        eventBridge?.emit({ type: 'navigator_response_error', requestId, errorType: 'api', timestamp: Date.now() });
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && requestSequence === requestSequenceRef.current) {
        fusionOrchestrator?.transition(fusionToken, 'failed', { resultType: 'failed', recoverable: true, sourceAvailability: 'none' });
        eventBridge?.emit({ type: 'navigator_response_error', requestId, errorType: 'network', timestamp: Date.now() });
        setMessages((current) => [...current, {
          id: `assistant-${requestSequence}-${Date.now()}`,
          role: 'assistant',
          content: '',
          mode: 'sources_only',
          reason: 'model_unavailable',
          citations: [],
          suggestedQuestions: [],
          partialSources: false,
        }]);
      }
      if (error?.name === 'AbortError') {
        fusionOrchestrator?.abort(fusionToken);
        eventBridge?.emit({ type: 'navigator_response_aborted', requestId, timestamp: Date.now() });
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsGenerating(false);
        abortRef.current = null;
        activeRequestRef.current = false;
        submissionLockRef.current = false;
        activeRequestIdRef.current = null;
        if (activeFusionTokenRef.current?.generation === fusionToken?.generation) activeFusionTokenRef.current = null;
      }
    }
  }

  function stopGenerating() {
    const requestId = activeRequestIdRef.current;
    if (requestId) eventBridge?.emit({ type: 'navigator_response_aborted', requestId, timestamp: Date.now() });
    if (activeFusionTokenRef.current) fusionOrchestrator?.abort(activeFusionTokenRef.current);
    abortRef.current?.abort();
    requestSequenceRef.current += 1;
    setIsGenerating(false);
    activeRequestRef.current = false;
    submissionLockRef.current = false;
    activeRequestIdRef.current = null;
    activeFusionTokenRef.current = null;
  }

  function clearChat() {
    const requestId = activeRequestIdRef.current;
    if (requestId) eventBridge?.emit({ type: 'navigator_response_aborted', requestId, timestamp: Date.now() });
    if (activeFusionTokenRef.current) fusionOrchestrator?.abort(activeFusionTokenRef.current);
    abortRef.current?.abort();
    requestSequenceRef.current += 1;
    lastSubmissionRef.current = { query: '', at: 0 };
    setMessages([]);
    setQuery('');
    setIsGenerating(false);
    activeRequestRef.current = false;
    submissionLockRef.current = false;
    activeRequestIdRef.current = null;
    activeFusionTokenRef.current = null;
  }

  function navigateFromResponse(targetRoute) {
    const requestId = lastCompletedRequestIdRef.current;
    if (requestId) {
      eventBridge?.emit({
        type: 'navigator_navigation_completed',
        requestId,
        targetRoute,
        timestamp: Date.now(),
      });
    }
    activityAdapter?.dispatch('navigation-arrived', { source: 'navigator', entityType: 'module' });
    const navigationToken = fusionOrchestrator?.start({
      requestId: `${requestId || 'navigator'}-navigation-${++citationFusionSequenceRef.current}`,
      operationType: 'module-navigation', contextId: 'navigator', initialPhase: 'guiding',
    });
    fusionOrchestrator?.transition(navigationToken, 'resolved', {
      resultType: 'navigated', navigationStatus: 'completed', sourceAvailability: 'available',
    });
    navigate(targetRoute);
  }

  function openCitation(sourceId) {
    const token = fusionOrchestrator?.start({
      requestId: `${lastCompletedRequestIdRef.current || 'navigator'}-citation-${String(sourceId || 'source').replace(/[^a-z0-9_-]/gi, '').slice(0, 24)}`,
      operationType: 'citation-navigation', contextId: 'navigator', initialPhase: 'guiding',
    });
    return token;
  }

  const isSubmitBlocked = isGenerating || retryAfterSeconds > 0;

  return (
    <article className="content-detail-card module-detail-card agent-assistant-card" data-testid="navigator-agent-page">
      <div className="detail-badge-row">
        <span className="content-tag">{common.moduleLabel}: {item.category}</span>
        <span className="content-tag">{item.status}</span>
        {contextAgent ? (
          <span className="content-tag" data-testid="navigator-current-module">
            {ui.currentModule}: {contextAgent.moduleName[lang] || contextAgent.moduleName.en}
          </span>
        ) : null}
        {preferredAgent ? (
          <span className="content-tag" data-testid="navigator-default-agent">
            {ui.defaultAgent}: {preferredAgent.name[lang] || preferredAgent.name.en}
          </span>
        ) : null}
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{ui.intro}</p>

      <section className="agent-source-strip" aria-label={ui.source}>
        {AGENT_SOURCES.map((source) => (
          <span key={source.id}>{source.labels[lang] || source.labels.en}</span>
        ))}
      </section>

      <section className="agent-chat-panel" aria-live="polite">
        {messages.map((message) => (
          message.role === 'user' ? (
            <section className="agent-message agent-message-user" key={message.id}>
              <div className="agent-message-label">{ui.userLabel}</div>
              <p>{message.content}</p>
            </section>
          ) : (
            <AssistantMessage key={message.id} message={message} lang={lang} ui={ui} onNavigate={navigateFromResponse} onCitationOpen={openCitation} />
          )
        ))}
        {isGenerating ? <p className="agent-state-message" data-state="generating">{ui.generating}</p> : null}
        {retryAfterSeconds > 0 ? (
          <p className="agent-state-message" data-state="rate-limited">
            {ui.rateLimited(retryAfterSeconds)}
          </p>
        ) : null}
      </section>

      <form
        className="agent-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (isComposingRef.current || event.nativeEvent?.isComposing) return;
          submitQuery();
        }}
      >
        <label htmlFor="navigator-agent-query">{ui.inputLabel}</label>
        <div className="agent-search-row">
          <input
            ref={inputRef}
            id="navigator-agent-query"
            type="search"
            value={query}
            maxLength={500}
            onChange={(event) => {
              companionPrefillRef.current = false;
              setQuery(event.target.value);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (isComposingRef.current || event.nativeEvent.isComposing)) {
                event.preventDefault();
              }
            }}
            placeholder={ui.placeholder}
            disabled={isSubmitBlocked}
          />
          <button className="mvp-action-button" type="submit" disabled={isSubmitBlocked || !query.trim()}>
            {ui.submit}
          </button>
          {isGenerating ? (
            <button className="mvp-action-button" type="button" onClick={stopGenerating}>
              {ui.stop}
            </button>
          ) : null}
          <button className="mvp-action-button" type="button" onClick={clearChat}>
            {ui.clear}
          </button>
        </div>
      </form>

      <section className="agent-suggestion-panel" aria-label="suggested questions">
        {suggestedQuestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => submitQuery(suggestion)} disabled={isSubmitBlocked}>
            {suggestion}
          </button>
        ))}
      </section>

      <AgentLandingSection lang={lang} navigate={navigate} />
    </article>
  );
}
