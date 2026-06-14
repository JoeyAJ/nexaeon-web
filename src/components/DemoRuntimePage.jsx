import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import ResourceStateNotice from './ResourceStateNotice.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import { PUBLIC_RESOURCE_STATUS } from '../lib/publicApiClient.js';
import { usePublicApiResource } from '../hooks/usePublicApiResource.js';
import {
  getValidatedDemoUrl,
  LAUNCH_MODES,
  normalizeLaunchMode,
  resolveDemoLaunch,
} from '../lib/demoRuntime.js';
import { getInternalDemoComponent } from './internalDemos/registry.jsx';
import { internalDemoRegistry } from '../lib/internalDemoRegistry.js';

const MODULE_DEMOS_ENDPOINT = '/api/modules/demos';
const IFRAME_TIMEOUT_MS = 11_000;
const INTRO_SEEN_KEY = 'nexaeon_intro_seen';
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';

const RUNTIME_UI = {
  zh: {
    backHome: '返回首頁',
    backShowcase: '返回 Demo Showcase',
    openNewTab: '新分頁開啟',
    fullscreen: '全螢幕',
    loading: 'Demo 載入中',
    maybeBlocked: '此 Demo 可能不允許內嵌顯示，請改用新分頁開啟。',
    internalDisconnected: '此站內 Demo 尚未接入 NexAeon Runtime。',
    notFoundTitle: '找不到此 Demo',
    notFoundBody: '此 Demo 不存在，或目前未公開展示。',
    invalidUrl: '此 Demo 目前沒有可安全開啟的網址。',
    externalOnly: '此 Demo 會在新分頁中開啟。',
    demoType: 'Demo 類型',
    status: '狀態',
    version: '版本',
    summary: '摘要',
    launchMode: '啟動模式',
    runtime: 'NexAeon Runtime',
    contentPending: '內容準備中',
  },
  ko: {
    backHome: '홈으로 돌아가기',
    backShowcase: 'Demo Showcase로 돌아가기',
    openNewTab: '새 탭에서 열기',
    fullscreen: '전체 화면',
    loading: 'Demo 로딩 중',
    maybeBlocked: '이 Demo는 임베드 표시를 허용하지 않을 수 있습니다. 새 탭에서 열어 주세요.',
    internalDisconnected: '이 내부 Demo는 아직 NexAeon Runtime에 연결되지 않았습니다.',
    notFoundTitle: 'Demo를 찾을 수 없습니다',
    notFoundBody: '이 Demo는 존재하지 않거나 현재 공개되어 있지 않습니다.',
    invalidUrl: '이 Demo에는 현재 안전하게 열 수 있는 URL이 없습니다.',
    externalOnly: '이 Demo는 새 탭에서 열립니다.',
    demoType: '데모 유형',
    status: '상태',
    version: '버전',
    summary: '요약',
    launchMode: '실행 방식',
    runtime: 'NexAeon Runtime',
    contentPending: '콘텐츠 준비 중',
  },
  en: {
    backHome: 'Back to home',
    backShowcase: 'Back to Demo Showcase',
    openNewTab: 'Open in new tab',
    fullscreen: 'Full screen',
    loading: 'Loading demo',
    maybeBlocked: 'This demo may not allow embedded viewing. Please open it in a new tab.',
    internalDisconnected: 'This internal demo has not yet been connected to the NexAeon Runtime.',
    notFoundTitle: 'Demo not found',
    notFoundBody: 'This demo does not exist or is not currently public.',
    invalidUrl: 'This demo does not currently have a safe URL to open.',
    externalOnly: 'This demo opens in a new tab.',
    demoType: 'Demo Type',
    status: 'Status',
    version: 'Version',
    summary: 'Summary',
    launchMode: 'Launch Mode',
    runtime: 'NexAeon Runtime',
    contentPending: 'Content in preparation',
  },
};

function suppressIntroReplay() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // Navigation should still work if storage is unavailable.
  }
}

function getLocalizedDemoText(item, field, lang) {
  const translation = item?.translations?.[lang];
  if (translation && String(translation[field] || '').trim()) return translation[field];
  if (item?.translations && lang !== 'zh') return '';
  return item?.[field] || '';
}

function normalizeDemoItem(item, lang) {
  return {
    ...item,
    name: getLocalizedDemoText(item, 'name', lang),
    summary: getLocalizedDemoText(item, 'summary', lang),
    launchMode: normalizeLaunchMode(item?.launchMode) || '',
  };
}

function DemoRuntimeTopbar({ ui, lang, setLang, theme, setTheme, navigate }) {
  return (
    <header className="subpage-topbar demo-runtime-topbar">
      <div className="container subpage-topbar-inner">
        <button
          className="main-logo-link"
          onClick={() => {
            suppressIntroReplay();
            navigate('/');
          }}
          aria-label={ui.backHome}
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

function RuntimeMetaField({ label, value }) {
  if (!String(value || '').trim()) return null;
  return (
    <div className="demo-runtime-meta-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function ExternalOpenButton({ href, label }) {
  if (!href) return null;
  return (
    <a className="mvp-action-button demo-runtime-open-button" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

function EmbeddedRuntime({ demo, safeDemoUrl, ui }) {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setHasTimedOut(true);
    }, IFRAME_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [safeDemoUrl]);

  const requestFullScreen = () => {
    const iframe = iframeRef.current;
    if (!iframe?.requestFullscreen) return;
    iframe.requestFullscreen().catch(() => {});
  };

  if (!safeDemoUrl) {
    return (
      <section className="demo-runtime-frame-shell">
        <div className="demo-runtime-message" data-state="invalid-url">
          <p>{ui.invalidUrl}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-runtime-frame-shell" aria-label={ui.runtime}>
      <div className="demo-runtime-frame-toolbar">
        <span>{ui.runtime}</span>
        <div>
          <button className="mvp-action-button" type="button" onClick={requestFullScreen}>
            {ui.fullscreen}
          </button>
          <ExternalOpenButton href={safeDemoUrl} label={ui.openNewTab} />
        </div>
      </div>

      <div className="demo-runtime-iframe-wrap">
        {isLoading ? (
          <div className="demo-runtime-loading" role="status">
            {ui.loading}
          </div>
        ) : null}
        {hasTimedOut ? (
          <div className="demo-runtime-timeout" data-state="timeout">
            <p>{ui.maybeBlocked}</p>
            <ExternalOpenButton href={safeDemoUrl} label={ui.openNewTab} />
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          className="demo-runtime-iframe"
          src={safeDemoUrl}
          title={demo.name || ui.runtime}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={IFRAME_SANDBOX}
          onLoad={() => {
            setIsLoading(false);
            setHasTimedOut(false);
          }}
        />
      </div>
    </section>
  );
}

function InternalRuntime({ demo, safeDemoUrl, ui }) {
  const InternalDemo = getInternalDemoComponent(demo.slug);

  if (!InternalDemo) {
    return (
      <section className="demo-runtime-frame-shell">
        <div className="demo-runtime-message" data-state="internal-unregistered">
          <p>{ui.internalDisconnected}</p>
          <ExternalOpenButton href={safeDemoUrl} label={ui.openNewTab} />
        </div>
      </section>
    );
  }

    return (
      <section className="demo-runtime-frame-shell">
      {createElement(InternalDemo, { demo })}
    </section>
  );
}

function RuntimeNotFound({ ui, navigate }) {
  return (
    <main className="detail-page demo-runtime-page" data-testid="demo-runtime-not-found">
      <section className="container detail-hero demo-runtime-hero">
        <div className="detail-hero-copy">
          <div className="label">{ui.runtime}</div>
          <h1>{ui.notFoundTitle}</h1>
          <p>{ui.notFoundBody}</p>
          <div className="mvp-actions">
            <button className="mvp-action-button" type="button" onClick={() => navigate('/projects/module-demos')}>
              {ui.backShowcase}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function DemoRuntimePage({ slug, lang, setLang, theme, setTheme, navigate }) {
  const ui = RUNTIME_UI[lang] || RUNTIME_UI.zh;
  const moduleState = usePublicApiResource(MODULE_DEMOS_ENDPOINT);
  const items = useMemo(() => (moduleState.items || []).map((item) => normalizeDemoItem(item, lang)), [lang, moduleState.items]);
  const demo = items.find((item) => item.slug === slug);
  const isLoading = moduleState.resourceStatus === PUBLIC_RESOURCE_STATUS.LOADING || moduleState.resourceStatus === PUBLIC_RESOURCE_STATUS.IDLE;

  const body = isLoading ? (
      <main className="detail-page demo-runtime-page">
        <section className="container detail-hero demo-runtime-hero">
          <ResourceStateNotice
            lang={lang}
            status={moduleState.resourceStatus}
            isRefreshing={moduleState.isRefreshing}
            onRetry={moduleState.retry}
            retryDisabled={moduleState.isLoading || moduleState.isRefreshing}
          />
        </section>
      </main>
  ) : !demo ? (
    <RuntimeNotFound ui={ui} navigate={navigate} />
  ) : (() => {
    const normalizedMode = normalizeLaunchMode(demo.launchMode);
    const launch = resolveDemoLaunch(demo, { internalRegistry: internalDemoRegistry });
    const safeDemoUrl = getValidatedDemoUrl(demo.demoUrl);
    const summary = demo.summary || ui.contentPending;

    return (
      <main className="detail-page demo-runtime-page" data-testid="demo-runtime-page">
        <section className="container detail-hero demo-runtime-hero">
          <div className="detail-hero-copy">
            <div className="label">{ui.runtime}</div>
            <h1>{demo.name || ui.contentPending}</h1>
            <p>{summary}</p>
            <div className="mvp-actions demo-runtime-actions">
              <button className="mvp-action-button" type="button" onClick={() => navigate('/projects/module-demos')}>
                {ui.backShowcase}
              </button>
              <ExternalOpenButton href={safeDemoUrl} label={ui.openNewTab} />
            </div>
          </div>

          <div className="demo-runtime-meta-panel liquid-glass-card">
            <RuntimeMetaField label={ui.demoType} value={demo.demoType} />
            <RuntimeMetaField label={ui.status} value={demo.status} />
            <RuntimeMetaField label={ui.version} value={demo.version} />
            <RuntimeMetaField label={ui.launchMode} value={normalizedMode || launch.mode || demo.launchMode} />
            <RuntimeMetaField label={ui.summary} value={summary} />
          </div>
        </section>

        <section className="container demo-runtime-content">
          {normalizedMode === LAUNCH_MODES.EMBEDDED ? (
            <EmbeddedRuntime key={safeDemoUrl || demo.slug} demo={demo} safeDemoUrl={safeDemoUrl} ui={ui} />
          ) : normalizedMode === LAUNCH_MODES.INTERNAL ? (
            <InternalRuntime demo={demo} safeDemoUrl={safeDemoUrl} ui={ui} />
          ) : (
            <section className="demo-runtime-frame-shell">
              <div className="demo-runtime-message" data-state={safeDemoUrl ? 'external' : 'invalid-url'}>
                <p>{safeDemoUrl ? ui.externalOnly : ui.invalidUrl}</p>
                <ExternalOpenButton href={safeDemoUrl} label={ui.openNewTab} />
              </div>
            </section>
          )}
        </section>
      </main>
    );
  })();

  return (
    <>
      <DemoRuntimeTopbar ui={ui} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      {body}
    </>
  );
}
