import { getDetailItem, getLocalizedSite } from '../lib/contentSource.js';
import { getLocalizedModuleField, getModuleData, getModuleEndpoint, getModuleStatus } from '../data/moduleData.js';
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

function getLocalizedDataStatus(status, lang) {
  const suffix = lang === 'ko' ? 'Ko' : lang === 'en' ? 'En' : 'Zh';
  return {
    source: status[`source${suffix}`],
    connection: status[`connection${suffix}`],
  };
}

function ModuleDataCards({ moduleKey, lang }) {
  const moduleItems = getModuleData(moduleKey);

  return (
    <section className="module-data-grid" aria-label={moduleKey}>
      {moduleItems.map((dataItem) => (
        <article key={dataItem.id} className="module-data-card">
          <div className="module-data-card-top">
            <span className="content-tag">{dataItem.category}</span>
            <span className="module-data-status">{dataItem.status}</span>
          </div>
          <h2>{getLocalizedModuleField(dataItem, 'title', lang)}</h2>
          <p>{getLocalizedModuleField(dataItem, 'description', lang)}</p>
          <div className="module-data-meta">
            <span>{dataItem.sourceType}</span>
            <span>{dataItem.updatedAt}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function ModuleDataStatus({ moduleKey, lang }) {
  const status = getLocalizedDataStatus(getModuleStatus(moduleKey), lang);
  const endpoint = getModuleEndpoint(moduleKey);

  return (
    <section className="module-data-source-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">{endpoint}</span>
    </section>
  );
}

function ModuleDataSkeleton({ item, common, lang }) {
  const moduleKey = item.moduleKey;

  return (
    <article className="content-detail-card module-detail-card data-skeleton-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{item.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>
      <ModuleDataCards moduleKey={moduleKey} lang={lang} />
      <ModuleDataStatus moduleKey={moduleKey} lang={lang} />
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

      <ModuleDataCards moduleKey={item.moduleKey} lang={lang} />

      <section className="theory-relationship-card">
        <div className="label">{item.relationship.title}</div>
        <p>{item.relationship.body}</p>
      </section>

      <ModuleDataStatus moduleKey={item.moduleKey} lang={lang} />

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
        ) : item.template === 'module-data-skeleton' ? (
          <ModuleDataSkeleton
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
