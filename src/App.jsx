import { useState, useEffect } from 'react';
import './styles.css';
import CONTENT from './content.js';
import DirectionB from './components/DirectionB.jsx';
import DetailPage from './components/DetailPage.jsx';
import { navigateTo, parseRoute } from './utils/router.js';

export default function App() {
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState('dark');
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const t = CONTENT[lang];

  const navigate = (path) => {
    navigateTo(path);
    setRoute(parseRoute(window.location.pathname));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      {route.kind === 'detail' ? (
        <DetailPage type={route.type} id={route.id} navigate={navigate} lang={lang} />
      ) : (
        <DirectionB
          t={t}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          navigate={navigate}
        />
      )}
    </div>
  );
}
