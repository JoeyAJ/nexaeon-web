import { useState, useEffect } from 'react';
import './styles.css';
import CONTENT from './content.js';
import DirectionB from './components/DirectionB.jsx';

export default function App() {
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const t = CONTENT[lang];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <DirectionB
        t={t}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      />
    </div>
  );
}
