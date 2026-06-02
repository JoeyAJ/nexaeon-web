import { useEffect, useMemo, useState } from 'react';
import {
  getLocalizedModuleField,
  getLocalizedModuleStatus,
  getModuleData,
  getModuleEndpoint,
  getModuleFilterLabel,
  getModuleFilters,
  getModulePageUi,
  MODULE_DATA_LABELS,
} from '../data/moduleData.js';

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function createFallbackModuleResponse(moduleKey, reason = 'client_initial_fallback') {
  const items = getModuleData(moduleKey);

  return {
    source: 'fallback',
    reason,
    moduleKey,
    endpoint: getModuleEndpoint(moduleKey),
    count: items.length,
    items,
    data: items,
    updatedAt: new Date().toISOString(),
  };
}

export function useModuleData(moduleKey, endpoint) {
  const [moduleState, setModuleState] = useState(() => createFallbackModuleResponse(moduleKey));

  useEffect(() => {
    let isMounted = true;

    async function loadModuleData() {
      try {
        const response = await fetch(endpoint || getModuleEndpoint(moduleKey));
        if (!response.ok) throw new Error(`Module API failed with status ${response.status}`);
        const payload = await response.json();
        const items = payload.items || payload.data || [];

        if (isMounted) {
          setModuleState({
            ...payload,
            items,
            data: items,
            source: payload.source || 'fallback',
          });
        }
      } catch {
        if (isMounted) setModuleState(createFallbackModuleResponse(moduleKey, 'client_fetch_failed'));
      }
    }

    loadModuleData();

    return () => {
      isMounted = false;
    };
  }, [endpoint, moduleKey]);

  return moduleState;
}

export function ModuleFilterTabs({ moduleKey, activeFilter, setActiveFilter, lang }) {
  const filters = getModuleFilters(moduleKey);

  return (
    <div className="module-filter-row" role="group" aria-label={moduleKey}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          className="module-filter-chip"
          data-active={activeFilter === filter.id ? 'true' : 'false'}
          onClick={() => setActiveFilter(filter.id)}
          type="button"
        >
          {getModuleFilterLabel(filter, lang)}
        </button>
      ))}
    </div>
  );
}

export function ModuleDataCard({ item, lang }) {
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const actionLabel = getLocalizedModuleField(item, 'actionLabel', lang);

  return (
    <article className="module-v1-card">
      <div className="module-data-card-top">
        <span className="content-tag">{item.type}</span>
        <span className="module-data-status">{item.status}</span>
      </div>
      <h2>{getLocalizedModuleField(item, 'title', lang)}</h2>
      <p>{getLocalizedModuleField(item, 'description', lang)}</p>

      <div className="module-v1-field">
        <span>{labels.category}</span>
        <p>{item.category}</p>
      </div>
      <div className="module-v1-field">
        <span>{labels.tags}</span>
        <p>{normalizeList(item.tags)}</p>
      </div>

      {item.audience ? (
        <div className="module-v1-field">
          <span>{labels.audience}</span>
          <p>{item.audience}</p>
        </div>
      ) : null}
      {item.relatedModule ? (
        <div className="module-v1-field">
          <span>{labels.relatedModule}</span>
          <p>{item.relatedModule}</p>
        </div>
      ) : null}
      {item.relatedTheory ? (
        <div className="module-v1-field">
          <span>{labels.relatedTheory}</span>
          <p>{item.relatedTheory}</p>
        </div>
      ) : null}
      {item.relatedProject ? (
        <div className="module-v1-field">
          <span>{labels.relatedProject}</span>
          <p>{item.relatedProject}</p>
        </div>
      ) : null}

      <div className="module-v1-footer">
        <span>{labels.sourceType}: {item.sourceType}</span>
        <span>{labels.updatedAt}: {item.updatedAt}</span>
      </div>

      {actionLabel && item.actionUrl ? (
        <a className="module-v1-action" href={item.actionUrl}>
          {actionLabel}
        </a>
      ) : null}
    </article>
  );
}

export function ModuleDataStatus({ moduleKey, lang }) {
  const status = getLocalizedModuleStatus(lang);

  return (
    <section className="module-data-source-card module-v1-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">{getModuleEndpoint(moduleKey)}</span>
    </section>
  );
}

export function ModuleDataPanel({ moduleKey, endpoint, lang }) {
  const moduleState = useModuleData(moduleKey, endpoint);
  const [activeFilter, setActiveFilter] = useState('all');
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const items = moduleState.items || [];
  const filteredItems = useMemo(() => (
    activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter || item.category === activeFilter)
  ), [activeFilter, items]);

  return (
    <>
      <ModuleFilterTabs
        moduleKey={moduleKey}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        lang={lang}
      />

      {filteredItems.length ? (
        <section className="module-v1-grid" aria-label={moduleKey}>
          {filteredItems.map((dataItem) => (
            <ModuleDataCard key={dataItem.id} item={dataItem} lang={lang} />
          ))}
        </section>
      ) : (
        <section className="module-v1-empty-card">
          <p>{labels.empty}</p>
        </section>
      )}

      <ModuleDataStatus moduleKey={moduleKey} lang={lang} />
    </>
  );
}

export default function ModuleDataLayer({ item, common, lang }) {
  const moduleKey = item.moduleKey;
  const pageUi = getModulePageUi(moduleKey, lang);

  return (
    <article className="content-detail-card module-detail-card module-v1-page-card">
      <div className="detail-badge-row">
        <span className="content-tag">{common.moduleLabel}: {item.category}</span>
        <span className="content-tag">{item.status}</span>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{pageUi.title}</h1>
      <p className="detail-subtitle">{pageUi.subtitle}</p>
      <ModuleDataPanel moduleKey={moduleKey} endpoint={item.dataEndpoint} lang={lang} />
    </article>
  );
}
