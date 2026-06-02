import { useEffect, useState } from 'react';
import { getDetailItem, getLocalizedSite } from '../lib/contentSource.js';
import {
  createFallbackLiteratureResponse,
  getLiteratureStatusText,
  getLiteratureSummary,
  LITERATURE_UI,
} from '../data/literatureData.js';
import {
  createFallbackKnowledgeResponse,
  getKnowledgeStatusText,
  getKnowledgeSummary,
  getKnowledgeTitle,
  KNOWLEDGE_FILTERS,
  KNOWLEDGE_RESOURCE_UI,
} from '../data/knowledgeResourceData.js';
import ModuleDataLayer, { ModuleDataPanel } from './ModuleDataLayer.jsx';
import NeuralBackground from './NeuralBackground.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import { toDetailPath } from '../utils/router.js';

const INTRO_SEEN_KEY = 'nexaeon_intro_seen';

function Badge({ children }) {
  return <span className="content-tag">{children}</span>;
}

function suppressIntroReplay() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // Navigation should still work if storage is unavailable.
  }
}

function DetailTopbar({ common, lang, setLang, theme, setTheme, navigate }) {
  return (
    <header className="subpage-topbar">
      <div className="container subpage-topbar-inner">
        <button
          className="main-logo-link"
          onClick={() => {
            suppressIntroReplay();
            navigate('/');
          }}
          aria-label={common.backHome}
          type="button"
        >
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </button>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
      </div>
    </header>
  );
}

function renderBody(body) {
  if (Array.isArray(body)) {
    return (
      <ul className="detail-section-list">
        {body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }

  return <p>{body}</p>;
}

function ModuleDataSkeleton({ item, common, lang }) {
  return <ModuleDataLayer item={item} common={common} lang={lang} />;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function useResearchLiterature() {
  const [literatureState, setLiteratureState] = useState(() => createFallbackLiteratureResponse('client_initial_fallback'));

  useEffect(() => {
    let isMounted = true;

    async function loadLiterature() {
      try {
        const response = await fetch('/api/research/literature');
        if (!response.ok) throw new Error(`Literature API failed with status ${response.status}`);
        const payload = await response.json();
        if (isMounted) setLiteratureState(payload);
      } catch {
        if (isMounted) setLiteratureState(createFallbackLiteratureResponse('client_fetch_failed'));
      }
    }

    loadLiterature();

    return () => {
      isMounted = false;
    };
  }, []);

  return literatureState;
}

function useKnowledgeResources() {
  const [knowledgeState, setKnowledgeState] = useState(() => createFallbackKnowledgeResponse('client_initial_fallback'));

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeResources() {
      try {
        const response = await fetch('/api/knowledge/resources');
        if (!response.ok) throw new Error(`Knowledge API failed with status ${response.status}`);
        const payload = await response.json();
        if (isMounted) setKnowledgeState(payload);
      } catch {
        if (isMounted) setKnowledgeState(createFallbackKnowledgeResponse('client_fetch_failed'));
      }
    }

    loadKnowledgeResources();

    return () => {
      isMounted = false;
    };
  }, []);

  return knowledgeState;
}

function LiteratureStatusCard({ source, lang }) {
  const status = getLiteratureStatusText(source, lang);

  return (
    <section className="module-data-source-card literature-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">/api/research/literature</span>
    </section>
  );
}

function LiteratureDatabase({ item, common, lang }) {
  const literatureState = useResearchLiterature();
  const ui = LITERATURE_UI[lang] || LITERATURE_UI.zh;

  return (
    <article className="content-detail-card module-detail-card literature-database-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <section className="literature-grid" aria-label={ui.title}>
        {literatureState.data.map((literature) => (
          <article key={literature.id} className="literature-card">
            <div className="module-data-card-top">
              <span className="content-tag">{literature.sourceType}</span>
              <span className="module-data-status">{literature.status}</span>
            </div>
            <h2>{literature.title}</h2>

            <div className="literature-field">
              <span>{ui.authorsYear}</span>
              <p>{normalizeList(literature.authors)} · {literature.year}</p>
            </div>
            <div className="literature-field">
              <span>{ui.theoryModels}</span>
              <p>{normalizeList(literature.theoryModels)}</p>
            </div>
            <div className="literature-field">
              <span>{ui.researchMethod}</span>
              <p>{literature.researchMethod}</p>
            </div>
            <div className="literature-field">
              <span>{ui.variables}</span>
              <p>{normalizeList(literature.variables)}</p>
            </div>
            <div className="literature-field literature-summary">
              <span>{ui.summary}</span>
              <p>{getLiteratureSummary(literature, lang)}</p>
            </div>
            <div className="literature-field">
              <span>{ui.usage}</span>
              <p>{literature.usage}</p>
            </div>
            <div className="literature-card-footer">
              <span>{ui.sourceType}: {literature.sourceType}</span>
              <span>{ui.updatedAt}: {literature.updatedAt}</span>
            </div>
          </article>
        ))}
      </section>

      <LiteratureStatusCard source={literatureState.source} lang={lang} />
    </article>
  );
}

function KnowledgeStatusCard({ source, lang }) {
  const status = getKnowledgeStatusText(source, lang);

  return (
    <section className="module-data-source-card literature-status-card knowledge-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">/api/knowledge/resources</span>
    </section>
  );
}

function KnowledgeResourceDatabase({ item, common, lang }) {
  const knowledgeState = useKnowledgeResources();
  const ui = KNOWLEDGE_RESOURCE_UI[lang] || KNOWLEDGE_RESOURCE_UI.zh;
  const [activeFilter, setActiveFilter] = useState('all');
  const resources = knowledgeState.items || [];
  const filteredResources = activeFilter === 'all'
    ? resources
    : resources.filter((resource) => resource.type === activeFilter);

  return (
    <article className="content-detail-card module-detail-card knowledge-resource-database-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{ui.subtitle}</p>

      <div className="knowledge-filter-row" role="group" aria-label={ui.title}>
        {KNOWLEDGE_FILTERS.map((filter) => (
          <button
            key={filter}
            className="knowledge-filter-chip"
            data-active={activeFilter === filter ? 'true' : 'false'}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {ui.filters[filter]}
          </button>
        ))}
      </div>

      <section className="knowledge-resource-grid" aria-label={ui.title}>
        {filteredResources.map((resource) => (
          <article key={resource.id} className="knowledge-resource-card">
            <div className="module-data-card-top">
              <span className="content-tag">{resource.type}</span>
              <span className="module-data-status">{resource.status}</span>
            </div>
            <h2>{getKnowledgeTitle(resource, lang)}</h2>

            <div className="knowledge-resource-field">
              <span>{ui.type}</span>
              <p>{resource.type}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.category}</span>
              <p>{resource.category}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.tags}</span>
              <p>{normalizeList(resource.tags)}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.relatedModule}</span>
              <p>{resource.relatedModule}</p>
            </div>
            <div className="knowledge-resource-field knowledge-resource-summary">
              <span>{ui.summary}</span>
              <p>{getKnowledgeSummary(resource, lang)}</p>
            </div>
            <div className="knowledge-resource-footer">
              <span>{ui.status}: {resource.status}</span>
              <span>{ui.sourceType}: {resource.sourceType}</span>
              <span>{ui.updatedAt}: {resource.updatedAt}</span>
            </div>
          </article>
        ))}
      </section>

      <KnowledgeStatusCard source={knowledgeState.source} lang={lang} />
    </article>
  );
}

function TheoryModelLibrary({ item, common, parentPath, navigate, navigateBack, lang }) {
  const goToResearch = () => {
    suppressIntroReplay();
    navigateBack(parentPath);
  };

  const goToMethods = () => {
    navigate(toDetailPath('research', 'personalized-ai-tutoring'));
  };

  return (
    <article className="content-detail-card module-detail-card theory-library-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{item.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <section className="theory-library-intro">
        <p>{item.summary}</p>
      </section>

      <ModuleDataPanel moduleKey={item.moduleKey} endpoint={item.dataEndpoint} lang={lang} />

      <section className="theory-relationship-card">
        <div className="label">{item.relationship.title}</div>
        <p>{item.relationship.body}</p>
      </section>

      <div className="theory-library-actions">
        <button className="btn btn-ghost" onClick={goToResearch} type="button">
          {item.actions.back}
        </button>
        <button className="btn btn-glass" onClick={goToMethods} type="button">
          {item.actions.methods}
        </button>
      </div>
    </article>
  );
}

function NotFound({ navigate, navigateBack, content, lang, setLang, theme, setTheme }) {
  const { common } = content;

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <DetailTopbar common={common} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      <div className="container subpage-content">
        <div className="content-detail-card detail-empty-card">
          <div className="detail-empty-title">{common.notFoundTitle}</div>
          <p>{common.notFoundBody}</p>
          <button className="btn btn-ghost" onClick={() => navigateBack('/')} type="button">
            {common.backPrevious}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DetailPage({ type, id, navigate, navigateBack, lang, setLang, theme, setTheme }) {
  const content = getLocalizedSite(lang);
  const { common } = content;
  const item = getDetailItem(type, id, lang);
  const parentPath = `/#${type}`;
  const goToParent = () => {
    suppressIntroReplay();
    navigateBack(parentPath);
  };

  if (!item) {
    return (
      <NotFound
        navigate={navigate}
        navigateBack={navigateBack}
        content={content}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <DetailTopbar common={common} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      <div className="container subpage-content">
        <button className="btn btn-ghost" onClick={goToParent} type="button">
          {common.backPrevious}
        </button>

        {item.template === 'theory-model-library' ? (
          <TheoryModelLibrary
            item={item}
            common={common}
            parentPath={parentPath}
            navigate={navigate}
            navigateBack={navigateBack}
            lang={lang}
          />
        ) : item.template === 'knowledge-resources' ? (
          <KnowledgeResourceDatabase
            item={item}
            common={common}
            lang={lang}
          />
        ) : item.template === 'module-data-skeleton' ? (
          <ModuleDataSkeleton
            item={item}
            common={common}
            lang={lang}
          />
        ) : item.template === 'literature-database' ? (
          <LiteratureDatabase
            item={item}
            common={common}
            lang={lang}
          />
        ) : (
          <article className="content-detail-card module-detail-card">
            <div className="detail-badge-row">
              <Badge>{common.moduleLabel}: {item.category}</Badge>
              <Badge>{item.status}</Badge>
            </div>

            <div className="detail-module-label">{item.moduleLabel}</div>
            <h1>{item.title}</h1>
            <p className="detail-subtitle">{item.subtitle}</p>
            <p className="detail-summary">{item.summary}</p>

            <div className="detail-section-grid">
              {item.sections.map((section) => (
                <section key={section.label} className="detail-section-card">
                  <div className="label">{section.label}</div>
                  {renderBody(section.body)}
                </section>
              ))}
            </div>

            {item.tags?.length ? (
              <section className="detail-tags">
                <div className="label">{common.tags}</div>
                <div>
                  {item.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        )}
      </div>
    </main>
  );
}
