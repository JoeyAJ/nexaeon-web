import { useCallback, useEffect, useRef, useState } from 'react';
import { NexLogo, NexWordmark, LangSwitcher, ArrowIcon } from './Logo.jsx';
import NeuralBackground from './NeuralBackground.jsx';
import { getLocalizedSite } from '../lib/contentSource.js';
import { toDetailPath } from '../utils/router.js';

const INTRO_SEEN_KEY = 'nexaeon_intro_seen';

function renderMetaLabel(label) {
  if (!label.includes('№') && !label.includes('No.')) return label;
  return label.replace('№', 'No.');
}

function hasSeenIntro() {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // The intro should still close if storage is unavailable.
  }
}

function getModuleIdFromHash(hash, modules) {
  const moduleId = decodeURIComponent((hash || '').replace(/^#/, ''));
  if (!moduleId) return null;
  return modules.some((module) => module.id === moduleId) ? moduleId : null;
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function IntroOverlay({ skipLabel, phase, onSkip, onEnded }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  return (
    <div className={`intro-overlay ${phase === 'fading' ? 'is-fading' : ''}`} aria-hidden={phase === 'done'}>
      <video
        ref={videoRef}
        className="intro-video"
        src="/assets/nexaeon-hero-v1.3.mov"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={onEnded}
      />
      <div className="intro-overlay-gradient" />
      <button className="intro-skip-btn" onClick={onSkip} aria-label={skipLabel}>
        {skipLabel}
      </button>
    </div>
  );
}

function Nav({
  content,
  modules,
  activeModuleId,
  setActiveModuleId,
  lang,
  setLang,
  theme,
  setTheme,
  navigate,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeModule = modules.find((module) => module.id === activeModuleId);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileMenuOpen(false);
      }
    };

    closeOnResize();
    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  const handleModuleClick = (moduleId) => {
    setActiveModuleId(moduleId);
    navigate(`/#${moduleId}`, { scroll: false });
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="main-nav module-nav">
      <div className="container main-nav-inner module-nav-inner">
        <button
          className="main-logo-link"
          onClick={() => {
            navigate('/', { scroll: false });
            scrollToSection('home');
            setActiveModuleId(null);
            setIsMobileMenuOpen(false);
          }}
          aria-label="Back to home"
        >
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </button>

        <div className="nav-links module-nav-links" style={{ display: isMobileMenuOpen ? 'flex' : undefined }}>
          {modules.map((module) => (
            <button
              key={module.id}
              className="module-nav-button"
              data-active={activeModuleId === module.id ? 'true' : 'false'}
              onClick={() => handleModuleClick(module.id)}
              type="button"
            >
              <span>{module.label}</span>
            </button>
          ))}
        </div>

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
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMobileMenuOpen ? '×' : '☰'}
          </button>
        </div>
      </div>

      {activeModule ? (
        <div className="module-nav-dropdown">
          <div className="container">
            <div className="module-nav-dropdown-panel liquid-glass-card">
              <div className="module-nav-dropdown-copy">
                <div className="label">{content.common.moduleMenu}</div>
                <strong>{activeModule.title}</strong>
                <p>{activeModule.summary}</p>
              </div>
              <div className="module-nav-entry-list">
                {activeModule.items.map((item) => (
                  <a
                    key={item.id}
                    className="module-entry-chip"
                    href={toDetailPath(activeModule.id, item.id)}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(toDetailPath(activeModule.id, item.id));
                    }}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

function Hero({ content, onOpenResearch }) {
  const { hero } = content;

  return (
    <section id="home" className="hero-shell" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div className="hero-atmosphere" aria-hidden="true">
        <div className="hero-parallax hero-parallax-a" />
        <div className="hero-parallax hero-parallax-b" />
      </div>
      <div className="hero-padding" style={{ textAlign: 'center', padding: '108px 32px 54px', position: 'relative', zIndex: 2 }}>
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          {hero.eyebrow}
        </div>

        <h1 className="hero-title">{hero.titleSerif}</h1>
        <div className="hero-title-subline">
          {hero.titleSerifSub}{' '}
          <span>
            — {hero.titleSans}
          </span>
        </div>

        <p className="hero-sub">{hero.sub}</p>

        <div className="hero-actions">
          <button className="btn btn-glass hero-cta-main" onClick={() => scrollToSection('modules')} type="button">
            {hero.cta1} <ArrowIcon />
          </button>
          <button className="btn btn-ghost hero-cta-secondary" onClick={onOpenResearch} type="button">
            {hero.cta2}
          </button>
        </div>

        <button className="hero-scroll-cue" onClick={() => scrollToSection('modules')} type="button">
          <span>{hero.scrollCue}</span>
          <span className="hero-scroll-cue-arrow" aria-hidden="true">↓</span>
        </button>
      </div>

      <div className="container meta-strip">
        {hero.meta.map((item) => (
          <span key={item}>{renderMetaLabel(item)}</span>
        ))}
      </div>

      <button className="hero-next-peek" onClick={() => scrollToSection('modules')} type="button">
        <span className="hero-next-peek-label">{hero.nextLabel}</span>
        <span className="hero-next-peek-title">{hero.nextTitle}</span>
        <span className="hero-next-peek-arrow" aria-hidden="true">↓</span>
      </button>
    </section>
  );
}

function ModuleGateway({ content, modules, activeModuleId, setActiveModuleId, navigate }) {
  const activeModule = modules.find((module) => module.id === activeModuleId);

  const openModule = (moduleId) => {
    setActiveModuleId(moduleId);
    navigate(`/#${moduleId}`, { scroll: false });
    requestAnimationFrame(() => scrollToSection('module-entries'));
  };

  return (
    <section id="modules" className="section module-gateway-section">
      <div className="container module-gateway-heading">
        <div className="label">— {content.home.eyebrow}</div>
        <h2>{content.home.title}</h2>
        <p>{content.home.intro}</p>
      </div>

      <div className="container module-card-grid">
        {modules.map((module) => (
          <article key={module.id} className="module-card liquid-glass-card">
            <div className="module-card-code">{module.code}</div>
            <div className="module-card-kicker">{module.label}</div>
            <h3>{module.title}</h3>
            <p>{module.summary}</p>
            <div className="module-card-footer">
              <span className="content-tag">
                {module.items.length} {content.common.entries}
              </span>
              <button className="btn btn-ghost" onClick={() => openModule(module.id)} type="button">
                {content.common.openModule}
              </button>
            </div>
          </article>
        ))}
      </div>

      {activeModule ? (
        <div id="module-entries" className="container module-entry-panel-wrap">
          <article className="module-entry-panel liquid-glass-card">
            <div className="module-entry-panel-copy">
              <div className="label">— {content.common.moduleMenu}</div>
              <h3>{activeModule.title}</h3>
              <p>{activeModule.position}</p>
            </div>
            <div className="module-entry-grid">
              {activeModule.items.map((item) => (
                <a
                  key={item.id}
                  className="module-entry-card"
                  href={toDetailPath(activeModule.id, item.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(toDetailPath(activeModule.id, item.id));
                  }}
                >
                  <span className="content-tag">{item.status}</span>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </a>
              ))}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function Footer({ content, modules, setActiveModuleId, navigate }) {
  return (
    <footer style={{ borderTop: '1px solid var(--line-1)', padding: '48px 0 56px' }}>
      <div className="container footer-links" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28 }}>{content.footer.built}</div>
          <div style={{ marginTop: 8, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {content.footer.year} · {content.footer.tagline}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {modules.map((module) => (
            <button
              key={module.id}
              className="footer-link-button"
              onClick={() => {
                setActiveModuleId(module.id);
                navigate(`/#${module.id}`, { scroll: false });
                scrollToSection('module-entries');
              }}
              type="button"
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function DirectionB({ lang, setLang, theme, setTheme, navigate }) {
  const rootRef = useRef(null);
  const introTimerRef = useRef(null);
  const content = getLocalizedSite(lang);
  const modules = content.modules;
  const [activeModuleId, setActiveModuleId] = useState(() => getModuleIdFromHash(window.location.hash, modules));
  const [introPhase, setIntroPhase] = useState(() => (hasSeenIntro() ? 'done' : 'playing'));

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onResize = () => {
      if (window.innerWidth <= 700) {
        el.setAttribute('data-density', 'compact');
      } else {
        el.removeAttribute('data-density');
      }
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const syncModuleFromHistory = () => {
      const moduleId = getModuleIdFromHash(window.location.hash, modules);
      setActiveModuleId(moduleId);

      if (moduleId) {
        requestAnimationFrame(() => scrollToSection('module-entries'));
      }
    };

    window.addEventListener('popstate', syncModuleFromHistory);
    return () => window.removeEventListener('popstate', syncModuleFromHistory);
  }, [modules]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (introPhase !== 'done') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [introPhase]);

  const closeIntro = useCallback(() => {
    if (introPhase !== 'playing') return;
    markIntroSeen();
    setIntroPhase('fading');
    introTimerRef.current = window.setTimeout(() => {
      setIntroPhase('done');
    }, 420);
  }, [introPhase]);

  useEffect(() => {
    return () => {
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
      }
    };
  }, []);

  const openResearch = () => {
    setActiveModuleId('research');
    navigate('/#research', { scroll: false });
    requestAnimationFrame(() => scrollToSection('module-entries'));
  };

  return (
    <div ref={rootRef} className="direction-shell page-shell liquid-page-shell">
      {introPhase !== 'done' ? (
        <IntroOverlay
          skipLabel={content.common.skipIntro}
          phase={introPhase}
          onSkip={closeIntro}
          onEnded={closeIntro}
        />
      ) : null}
      <NeuralBackground />
      <Nav
        content={content}
        modules={modules}
        activeModuleId={activeModuleId}
        setActiveModuleId={setActiveModuleId}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        navigate={navigate}
      />
      <Hero content={content} onOpenResearch={openResearch} />
      <ModuleGateway
        content={content}
        modules={modules}
        activeModuleId={activeModuleId}
        setActiveModuleId={setActiveModuleId}
        navigate={navigate}
      />
      <Footer content={content} modules={modules} setActiveModuleId={setActiveModuleId} navigate={navigate} />
    </div>
  );
}
