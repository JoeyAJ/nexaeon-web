import {
  getModuleAgentCopy,
  getModuleAgentEntries,
} from '../data/agentModulePlacement.js';

export function ModuleAgentIndicator({ moduleId, lang }) {
  const copy = getModuleAgentCopy(lang);
  const entries = getModuleAgentEntries(moduleId, lang);
  if (!entries.length) return null;

  return (
    <div className="module-card-agent-line" data-testid={`module-agent-indicator-${moduleId}`}>
      <span>{copy.indicatorLabel}</span>
      <strong>{entries.map(({ agent }) => agent.name).join(' / ')}</strong>
      <em>{entries.map(({ status }) => status.label).join(' · ')}</em>
    </div>
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
            <p>{localized.description}</p>
            <div className="module-agent-entry-meta">
              <span>{localized.moduleLabel}</span>
            </div>
            <button className="mvp-action-button" type="button" onClick={() => navigate(agent.route)}>
              {status.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
