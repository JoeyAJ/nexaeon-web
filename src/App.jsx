import { useState, useEffect } from 'react';
import './styles.css';
import DirectionB from './components/DirectionB.jsx';
import DemoRuntimePage from './components/DemoRuntimePage.jsx';
import DetailPage from './components/DetailPage.jsx';
import RoleDetailPage from './components/RoleDetailPage.jsx';
import AppErrorBoundary, { getGuardrailCopy, GuardrailStatePage } from './components/AppErrorBoundary.jsx';
import AgentScaffoldPage from './components/AgentScaffoldPage.jsx';
import { getAgentByKey } from './data/agentRegistry.js';
import { goBack, markInitialHistoryEntry, navigateTo, parseRoute, replaceCurrentRoute } from './utils/router.js';

const BACK_TO_TOP_TEXT = {
  zh: '回到頂部',
  en: 'Back to top',
  ko: '맨 위로',
};

const INTRO_SEEN_KEY = 'nexaeon_intro_seen';

function suppressIntroReplay() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // Navigation should still work if storage is unavailable.
  }
}

function BackToTopButton({ lang }) {
  const label = BACK_TO_TOP_TEXT[lang] || BACK_TO_TOP_TEXT.en;

  return (
    <button
      className="back-to-top-btn"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}

export default function App() {
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState('dark');
  const [route, setRoute] = useState(() => ({
    ...parseRoute(window.location.pathname),
    hash: window.location.hash,
  }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    markInitialHistoryEntry();

    const onPopState = () => {
      setRoute({
        ...parseRoute(window.location.pathname),
        hash: window.location.hash,
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (route.kind === 'redirect' && route.replace && route.to) {
      suppressIntroReplay();
      replaceCurrentRoute(route.to);
      return;
    }

    if (route.kind === 'home' && window.location.hash) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [route.kind, route.type, route.id, route.role, route.slug, route.replace, route.to]);

  const navigate = (path, options) => {
    navigateTo(path, options);
    setRoute({
      ...parseRoute(window.location.pathname),
      hash: window.location.hash,
    });
  };

  const navigateBack = (fallbackPath) => {
    goBack(fallbackPath);
  };

  const goHome = () => {
    suppressIntroReplay();
    navigate('/');
  };

  const invalidRouteCopy = getGuardrailCopy(lang);

  return (
    <div className="app-shell">
      <AppErrorBoundary
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        navigate={navigate}
      >
        {route.kind === 'demoRuntime' ? (
          <DemoRuntimePage
            slug={route.slug}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
          />
        ) : route.kind === 'detail' ? (
          <DetailPage
            type={route.type}
            id={route.id}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            navigateBack={navigateBack}
          />
        ) : route.kind === 'role' ? (
          <RoleDetailPage role={route.role} navigate={navigate} navigateBack={navigateBack} lang={lang} setLang={setLang} />
        ) : route.kind === 'agentScaffold' ? (
          <AgentScaffoldPage
            agent={getAgentByKey(route.key)}
            navigate={navigate}
            navigateBack={navigateBack}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
          />
        ) : route.kind === 'invalid' || route.kind === 'redirect' ? (
          <GuardrailStatePage
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            title={invalidRouteCopy.notFoundTitle}
            body={invalidRouteCopy.notFoundBody}
            primaryLabel={invalidRouteCopy.backPrevious}
            secondaryLabel={invalidRouteCopy.backHome}
            onPrimary={() => navigateBack('/')}
            onSecondary={goHome}
            testId="not-found-route"
          />
        ) : (
          <DirectionB
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            navigate={navigate}
          />
        )}
      </AppErrorBoundary>
      <BackToTopButton lang={lang} />
    </div>
  );
}
