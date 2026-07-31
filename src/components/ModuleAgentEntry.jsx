import {
  getModuleAgentCopy,
  getModuleAgentEntries,
} from '../data/agentModulePlacement.js';
import {
  COMPANION_NAVIGATOR_HANDOFF_KEY,
  COMPANION_NAVIGATOR_ROUTE,
  createModuleAgentNavigatorHandoff,
} from '../lib/companionActionConfig.js';

function openModuleAgent({ agent, moduleId, lang, navigate }) {
  if (['explorer', 'xchange'].includes(agent.key) && agent.chatEnabled && agent.route) {
    navigate(agent.route);
    return;
  }
  const sourceRoute = `/#${moduleId}`;
  const handoff = createModuleAgentNavigatorHandoff({
    currentModule: agent.id,
    sourceRoute,
    locale: lang,
  });
  navigate(COMPANION_NAVIGATOR_ROUTE, {
    state: { [COMPANION_NAVIGATOR_HANDOFF_KEY]: handoff },
  });
}

export function ModuleAgentIndicator({ moduleId, lang, navigate }) {
  const entries = getModuleAgentEntries(moduleId, lang);
  if (!entries.length) return null;
  const { agent, status } = entries[0];

  return (
    <button
      className="module-card-agent-line"
      data-testid={`module-agent-indicator-${moduleId}`}
      type="button"
      aria-label={status.cta}
      onClick={() => openModuleAgent({ agent, moduleId, lang, navigate })}
    >
      <span>{status.label}</span>
      <strong>{entries.map(({ agent }) => agent.name).join(' / ')}</strong>
      <em>{status.indicatorDescription} · {status.cta}</em>
    </button>
  );
}

export default function ModuleAgentEntry({ moduleId, lang, navigate }) {
  const copy = getModuleAgentCopy(lang);
  const entries = getModuleAgentEntries(moduleId, lang);
  if (!entries.length) return null;

  return (
    <section className="module-agent-entry-section" aria-label={copy.sectionLabel} data-testid={`module-agent-section-${moduleId}`}>
      <div className="module-agent-entry-heading">
        <span className="label">— {copy.sectionEyebrow}</span>
        <h4>{copy.sectionTitle}</h4>
      </div>
      <div className="module-agent-entry-grid">
        {entries.map(({ agent, localized, status }) => (
          <article className="module-agent-entry-card" data-status={status.tone} data-testid={`module-agent-entry-${agent.key}`} key={agent.key}>
            <div className="module-agent-entry-top">
              <span className="module-agent-entry-initial" aria-hidden="true">{agent.initial}</span>
              <span className="module-agent-entry-status">{status.label}</span>
            </div>
            <div>
              <h5>{agent.name}</h5>
              <p className="module-agent-entry-role">{localized.subtitle}</p>
            </div>
            <p>{status.description}</p>
            <div className="module-agent-entry-meta">
              <span>{localized.moduleLabel}</span>
            </div>
            <button
              className="mvp-action-button"
              type="button"
              onClick={() => openModuleAgent({ agent, moduleId, lang, navigate })}
            >
              {status.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
