import { getDetailItem, getLocalizedSite } from '../lib/contentSource.js';
import NeuralBackground from './NeuralBackground.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';

function Badge({ children }) {
  return <span className="content-tag">{children}</span>;
}

function DetailTopbar({ common, lang, setLang, theme, setTheme, navigate }) {
  return (
    <header className="subpage-topbar">
      <div className="container subpage-topbar-inner">
        <button className="main-logo-link" onClick={() => navigate('/')} aria-label={common.backHome} type="button">
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

function NotFound({ navigate, content, lang, setLang, theme, setTheme }) {
  const { common } = content;

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <DetailTopbar common={common} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      <div className="container subpage-content">
        <div className="content-detail-card detail-empty-card">
          <div className="detail-empty-title">{common.notFoundTitle}</div>
          <p>{common.notFoundBody}</p>
          <button className="btn btn-ghost" onClick={() => navigate('/')} type="button">
            {common.backHome}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DetailPage({ type, id, navigate, lang, setLang, theme, setTheme }) {
  const content = getLocalizedSite(lang);
  const { common } = content;
  const item = getDetailItem(type, id, lang);

  if (!item) {
    return (
      <NotFound
        navigate={navigate}
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
        <button className="btn btn-ghost" onClick={() => navigate('/')} type="button">
          {common.backHome}
        </button>

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
      </div>
    </main>
  );
}
