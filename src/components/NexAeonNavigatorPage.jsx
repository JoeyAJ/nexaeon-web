import { useMemo, useRef, useState } from 'react';
import { AGENT_SOURCES } from '../../lib/agent/sourceRegistry.js';
import { NAVIGATOR_AGENT } from '../data/agentBrands.js';

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
    noSources: '目前公開知識中沒有足夠資料回答這個問題。',
    moderated: '這個問題目前無法處理，請調整內容後再試一次。',
    groundedNote: '回答僅根據 NexAeon 目前公開的知識來源生成，內容可能不完整。',
    partial: '部分知識來源暫時無法使用，其餘內容仍可正常查詢。',
    sourcesOnly: '以下仍提供最相關的公開來源。',
    source: '來源',
    type: '類型',
    updatedAt: '更新時間',
    viewSource: '查看來源',
    openExternal: '開啟外部來源',
    userLabel: '你',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
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
    noSources: '현재 공개된 지식만으로는 이 질문에 답할 충분한 정보가 없습니다.',
    moderated: '이 질문은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.',
    groundedNote: '답변은 현재 공개된 NexAeon 지식 소스를 기반으로 생성되며 일부 내용이 불완전할 수 있습니다.',
    partial: '일부 지식 소스를 현재 사용할 수 없지만 나머지 콘텐츠는 계속 검색할 수 있습니다.',
    sourcesOnly: '아래에서 가장 관련 있는 공개 소스를 확인할 수 있습니다.',
    source: '출처',
    type: '유형',
    updatedAt: '업데이트',
    viewSource: '출처 보기',
    openExternal: '외부 출처 열기',
    userLabel: '나',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
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
    noSources: 'The current public knowledge does not contain enough information to answer this question.',
    moderated: 'This request cannot be processed. Please revise it and try again.',
    groundedNote: 'Answers are generated from NexAeon’s currently public knowledge sources and may be incomplete.',
    partial: 'Some knowledge sources are temporarily unavailable. The remaining sources can still be searched.',
    sourcesOnly: 'The most relevant public sources are still shown below.',
    source: 'Source',
    type: 'Type',
    updatedAt: 'Updated At',
    viewSource: 'View source',
    openExternal: 'Open external source',
    userLabel: 'You',
    assistantLabel: NAVIGATOR_AGENT.answerLabel,
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
}

function AnswerText({ text }) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <div className="agent-answer-text">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>
          {paragraph.split(/(\[S\d+\])/g).filter(Boolean).map((part, index) => {
            const match = part.match(/^\[(S\d+)\]$/);
            if (!match) return <span key={`${part}-${index}`}>{part}</span>;
            return (
              <button
                key={`${part}-${index}`}
                className="agent-citation-marker"
                type="button"
                onClick={() => scrollToCitation(match[1])}
              >
                {part}
              </button>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function CitationCard({ citation, lang, navigate, ui }) {
  return (
    <article className="agent-result-card" id={`citation-${citation.sourceId}`} tabIndex={-1}>
      <div className="agent-result-topline">
        <span>{citation.sourceId}</span>
        <span>{citation.moduleLabel}</span>
        {citation.itemType ? <span>{citation.itemType}</span> : null}
      </div>
      <h2>{citation.title}</h2>
      <p>{citation.excerpt}</p>
      <div className="agent-result-meta">
        <span>{ui.source}: {citation.moduleLabel}</span>
        {citation.itemType ? <span>{ui.type}: {citation.itemType}</span> : null}
        {citation.updatedAt ? <span>{ui.updatedAt}: {formatDate(citation.updatedAt, lang)}</span> : null}
      </div>
      <div className="mvp-actions">
        {citation.sourceRoute ? (
          <button className="mvp-action-button" type="button" onClick={() => navigate(citation.sourceRoute)}>
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

function AssistantMessage({ message, lang, navigate, ui }) {
  const isSourcesOnly = message.mode === 'sources_only';
  const showFallback = isSourcesOnly && !message.content;
  const showSourcesOnlyNotice = isSourcesOnly && Boolean(message.content) && message.reason !== 'moderated';
  return (
    <section className="agent-message agent-message-assistant">
      <div className="agent-message-label">{ui.assistantLabel}</div>
      {message.content ? <AnswerText text={message.content} /> : null}
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
            <CitationCard key={citation.sourceId} citation={citation} lang={lang} navigate={navigate} ui={ui} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function NexAeonNavigatorPage({ item, common, lang, navigate }) {
  const ui = ASSISTANT_UI[lang] || ASSISTANT_UI.en;
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef(null);
  const activeRequestRef = useRef(false);

  const suggestedQuestions = useMemo(() => {
    const latest = [...messages].reverse().find((message) => message.role === 'assistant' && message.suggestedQuestions?.length);
    return latest?.suggestedQuestions?.length ? latest.suggestedQuestions : ui.suggestions;
  }, [messages, ui.suggestions]);

  async function submitQuery(nextQuery = query) {
    const trimmed = String(nextQuery || '').trim();
    if (!trimmed || isGenerating || activeRequestRef.current) return;
    activeRequestRef.current = true;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const history = normalizeHistory(messages);
    setMessages((current) => [...current, userMessage]);
    setQuery(trimmed);
    setIsGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: trimmed,
          lang,
          history,
        }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (response.status === 429) return;
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.answer || '',
        mode: payload.mode || 'sources_only',
        reason: payload.reason || '',
        citations: Array.isArray(payload.citations) ? payload.citations : [],
        suggestedQuestions: Array.isArray(payload.suggestedQuestions) ? payload.suggestedQuestions : [],
        partialSources: Boolean(payload.partialSources),
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setMessages((current) => [...current, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          mode: 'sources_only',
          reason: 'model_unavailable',
          citations: [],
          suggestedQuestions: [],
          partialSources: false,
        }]);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
      activeRequestRef.current = false;
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
    setIsGenerating(false);
    activeRequestRef.current = false;
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setQuery('');
    setIsGenerating(false);
    activeRequestRef.current = false;
  }

  return (
    <article className="content-detail-card module-detail-card agent-assistant-card" data-testid="navigator-agent-page">
      <div className="detail-badge-row">
        <span className="content-tag">{common.moduleLabel}: {item.category}</span>
        <span className="content-tag">{item.status}</span>
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
            <AssistantMessage key={message.id} message={message} lang={lang} navigate={navigate} ui={ui} />
          )
        ))}
        {isGenerating ? <p className="agent-state-message" data-state="generating">{ui.generating}</p> : null}
      </section>

      <form
        className="agent-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery();
        }}
      >
        <label htmlFor="navigator-agent-query">{ui.inputLabel}</label>
        <div className="agent-search-row">
          <input
            id="navigator-agent-query"
            type="search"
            value={query}
            maxLength={500}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ui.placeholder}
          />
          <button className="mvp-action-button" type="submit" disabled={isGenerating || !query.trim()}>
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
          <button key={suggestion} type="button" onClick={() => submitQuery(suggestion)} disabled={isGenerating}>
            {suggestion}
          </button>
        ))}
      </section>
    </article>
  );
}
