import { useState, useEffect } from 'react';
import './styles.css';
import DirectionB from './components/DirectionB.jsx';
import DetailPage from './components/DetailPage.jsx';
import RoleDetailPage from './components/RoleDetailPage.jsx';
import { goBack, markInitialHistoryEntry, navigateTo, parseRoute } from './utils/router.js';

const BACK_TO_TOP_TEXT = {
  zh: '回到頂部',
  en: 'Back to top',
  ko: '맨 위로',
};

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
    if (route.kind === 'home' && window.location.hash) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [route.kind, route.type, route.id, route.role]);

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

  return (
    <div className="app-shell">
      {route.kind === 'detail' ? (
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
      ) : (
        <DirectionB
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          navigate={navigate}
        />
      )}
      <BackToTopButton lang={lang} />
    </div>
  );
}
