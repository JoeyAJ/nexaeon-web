import { useMemo, useState } from 'react';
import { AGENT_SOURCES, getAgentSourceLabel } from '../../lib/agent/sourceRegistry.js';
import { retrieveKnowledge } from '../../lib/agent/retrieval.js';
import { AGENT_KNOWLEDGE_STATUS, useAgentKnowledge } from '../hooks/useAgentKnowledge.js';

const ASSISTANT_UI = {
  zh: {
    title: 'Nexōn AI Assistant',
    intro: '第一版 Nexōn 只檢索 NexAeon 已公開的知識來源，提供來源導向的查詢結果，不生成自由回答。',
    inputLabel: '輸入你想查詢的 NexAeon 公開內容',
    placeholder: '例如：Joey 的研究方向是什麼？',
    submit: '查詢',
    clear: '清除查詢',
    suggestions: ['Joey 的研究方向是什麼？', 'NexAeon 有哪些 AI 學習項目？', '目前有哪些公開 Demo？', 'NexAeon 的學習教練理念是什麼？'],
    loading: '正在整理 NexAeon 的公開知識……',
    partial: '部分知識來源暫時無法使用，其餘內容仍可正常查詢。',
    noResult: '目前沒有找到相關的公開內容，請嘗試其他關鍵字。',
    empty: '目前尚無可供查詢的公開知識。',
    resultIntro: '根據 NexAeon 的公開知識，以下是最相關的內容：',
    source: '來源',
    type: '類型',
    updatedAt: '更新時間',
    viewSource: '查看來源',
    openExternal: '開啟外部來源',
  },
  ko: {
    title: 'Nexōn AI Assistant',
    intro: '첫 번째 Nexōn은 NexAeon의 공개 지식만 검색하고 출처 중심 결과를 제공합니다. 자유 생성 답변은 제공하지 않습니다.',
    inputLabel: '검색할 NexAeon 공개 콘텐츠를 입력하세요',
    placeholder: '예: Joey의 연구 방향은 무엇인가요?',
    submit: '검색',
    clear: '검색 지우기',
    suggestions: ['Joey의 연구 방향은 무엇인가요?', 'NexAeon에는 어떤 AI 학습 프로젝트가 있나요?', '현재 공개된 Demo는 무엇인가요?', 'NexAeon의 학습 코칭 철학은 무엇인가요?'],
    loading: 'NexAeon의 공개 지식을 불러오고 있습니다…',
    partial: '일부 지식 소스를 현재 사용할 수 없지만 나머지 콘텐츠는 계속 검색할 수 있습니다.',
    noResult: '관련된 공개 콘텐츠를 찾지 못했습니다. 다른 키워드로 검색해 주세요.',
    empty: '현재 검색할 수 있는 공개 지식이 없습니다.',
    resultIntro: 'NexAeon의 공개 지식을 바탕으로 가장 관련성이 높은 내용을 확인해 보세요.',
    source: '출처',
    type: '유형',
    updatedAt: '업데이트',
    viewSource: '출처 보기',
    openExternal: '외부 출처 열기',
  },
  en: {
    title: 'Nexōn AI Assistant',
    intro: 'This first Nexōn foundation searches only NexAeon’s public knowledge sources and shows source-grounded results. It does not generate free-form AI answers.',
    inputLabel: 'Enter a question about NexAeon public knowledge',
    placeholder: 'Example: What are Joey’s research interests?',
    submit: 'Search',
    clear: 'Clear query',
    suggestions: ['What are Joey’s research interests?', 'Which AI learning projects are available in NexAeon?', 'Which demos are currently public?', 'What is NexAeon’s learning coaching philosophy?'],
    loading: 'Loading NexAeon’s public knowledge…',
    partial: 'Some knowledge sources are temporarily unavailable. The remaining sources can still be searched.',
    noResult: 'No relevant public content was found. Please try different keywords.',
    empty: 'No public knowledge is currently available for search.',
    resultIntro: 'Based on NexAeon’s public knowledge, these are the most relevant sources:',
    source: 'Source',
    type: 'Type',
    updatedAt: 'Updated At',
    viewSource: 'View source',
    openExternal: 'Open external source',
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

function KnowledgeSourceCard({ result, lang, navigate, ui }) {
  const { document, excerpt } = result;
  const sourceLabel = getAgentSourceLabel(document.sourceId, lang);

  return (
    <article className="agent-result-card">
      <div className="agent-result-topline">
        <span>{sourceLabel}</span>
        {document.itemType ? <span>{document.itemType}</span> : null}
      </div>
      <h2>{document.title}</h2>
      <p>{excerpt || document.summary}</p>
      <div className="agent-result-meta">
        <span>{ui.source}: {sourceLabel}</span>
        {document.itemType ? <span>{ui.type}: {document.itemType}</span> : null}
        {document.updatedAt ? <span>{ui.updatedAt}: {formatDate(document.updatedAt, lang)}</span> : null}
      </div>
      <div className="mvp-actions">
        {document.sourceRoute ? (
          <button className="mvp-action-button" type="button" onClick={() => navigate(document.sourceRoute)}>
            {ui.viewSource}
          </button>
        ) : null}
        {document.sourceUrl ? (
          <a className="mvp-action-button" href={document.sourceUrl} target="_blank" rel="noopener noreferrer">
            {ui.openExternal}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function NexonAssistantPage({ item, common, lang, navigate }) {
  const ui = ASSISTANT_UI[lang] || ASSISTANT_UI.en;
  const knowledge = useAgentKnowledge(lang);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const results = useMemo(() => (
    retrieveKnowledge(knowledge.documents, submittedQuery, { limit: 8 })
  ), [knowledge.documents, submittedQuery]);

  const hasSubmitted = submittedQuery.trim().length > 0;
  const isLoading = knowledge.status === AGENT_KNOWLEDGE_STATUS.LOADING;
  const isEmpty = knowledge.status === AGENT_KNOWLEDGE_STATUS.EMPTY || knowledge.status === AGENT_KNOWLEDGE_STATUS.ERROR;

  function submitQuery(nextQuery = query) {
    setSubmittedQuery(nextQuery);
    setQuery(nextQuery);
  }

  function clearQuery() {
    setQuery('');
    setSubmittedQuery('');
  }

  return (
    <article className="content-detail-card module-detail-card agent-assistant-card" data-testid="nexon-agent-page">
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

      {isLoading ? <p className="agent-state-message">{ui.loading}</p> : null}
      {knowledge.status === AGENT_KNOWLEDGE_STATUS.PARTIAL ? <p className="agent-state-message" data-state="partial">{ui.partial}</p> : null}
      {isEmpty ? <p className="agent-state-message" data-state="empty">{ui.empty}</p> : null}

      <form
        className="agent-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuery();
        }}
      >
        <label htmlFor="nexon-agent-query">{ui.inputLabel}</label>
        <div className="agent-search-row">
          <input
            id="nexon-agent-query"
            type="search"
            value={query}
            maxLength={300}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ui.placeholder}
          />
          <button className="mvp-action-button" type="submit" disabled={isLoading || !query.trim()}>
            {ui.submit}
          </button>
          <button className="mvp-action-button" type="button" onClick={clearQuery}>
            {ui.clear}
          </button>
        </div>
      </form>

      <section className="agent-suggestion-panel" aria-label="suggested questions">
        {ui.suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => submitQuery(suggestion)}>
            {suggestion}
          </button>
        ))}
      </section>

      <section className="agent-results-panel" aria-live="polite">
        {hasSubmitted && results.length > 0 ? (
          <>
            <p className="agent-result-intro">{ui.resultIntro}</p>
            <div className="agent-result-grid">
              {results.map((result) => (
                <KnowledgeSourceCard key={result.document.id} result={result} lang={lang} navigate={navigate} ui={ui} />
              ))}
            </div>
          </>
        ) : null}

        {hasSubmitted && !results.length && !isLoading && !isEmpty ? (
          <p className="agent-state-message" data-state="no-result">{ui.noResult}</p>
        ) : null}
      </section>
    </article>
  );
}
