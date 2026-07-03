import {
  AGENT_ACTION_CHAIN,
  AGENT_SCAFFOLD_COPY,
  getAgentLocale,
  getNavigatorAgent,
} from '../data/agentRegistry.js';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import NeuralBackground from './NeuralBackground.jsx';

function ThemeToggle({ theme, setTheme }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="theme-toggle-btn" type="button" onClick={() => setTheme(nextTheme)}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export default function AgentScaffoldPage({
  agent,
  lang,
  setLang,
  theme,
  setTheme,
  navigate,
  navigateBack,
}) {
  const ui = AGENT_SCAFFOLD_COPY[lang] || AGENT_SCAFFOLD_COPY.en;
  const localized = getAgentLocale(agent, lang);
  const navigatorAgent = getNavigatorAgent();

  return (
    <main className="direction-shell subpage-shell agent-scaffold-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <nav className="main-nav">
        <div className="container main-nav-inner">
          <button className="brand-lockup" type="button" onClick={() => navigate('/')}>
            <NexLogo size={36} />
            <NexWordmark size={22} />
          </button>
          <div className="nav-controls">
            <LangSwitcher lang={lang} setLang={setLang} />
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </nav>

      <div className="container subpage-content">
        <button className="btn btn-ghost" onClick={() => navigateBack('/')} type="button">
          {ui.backPrevious}
        </button>

        <article className="content-detail-card module-detail-card agent-scaffold-card" data-testid={`agent-scaffold-${agent.key}`}>
          <div className="detail-badge-row">
            <span className="content-tag">{ui.statusLabel}: {ui.scaffoldStatus}</span>
            <span className="content-tag">{ui.moduleLabel}: {localized.moduleLabel}</span>
          </div>

          <div className="agent-scaffold-initial" aria-hidden="true">{agent.initial}</div>
          <div className="detail-module-label">NexAeon Agent System</div>
          <h1>{agent.name}</h1>
          <p className="detail-subtitle">{localized.subtitle}</p>
          <p>{localized.description}</p>

          <section className="agent-scaffold-section">
            <h2>{ui.futureTitle}</h2>
            <div className="agent-capability-list">
              {localized.futureUse.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="agent-scaffold-section">
            <h2>{ui.policyTitle}</h2>
            <p>{ui.noChat}</p>
          </section>

          <section className="agent-scaffold-section agent-scaffold-navigator">
            <div>
              <h2>{ui.navigatorTitle}</h2>
              <p>{ui.navigatorBody}</p>
            </div>
            <button className="mvp-action-button" type="button" onClick={() => navigate(navigatorAgent.route)}>
              {ui.openNavigator}
            </button>
          </section>

          <p className="agent-action-chain">{AGENT_ACTION_CHAIN[lang] || AGENT_ACTION_CHAIN.en}</p>
        </article>
      </div>
    </main>
  );
}
