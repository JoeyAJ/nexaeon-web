import { useMemo, useRef, useState, useEffect } from 'react';
import { NexLogo, NexWordmark, LangSwitcher, ArrowIcon } from './Logo.jsx';
import { INTERACTIVE_CONTENT } from '../constants/interactiveData.js';

function renderMetaLabel(label) {
  if (!label.includes('№')) return label;
  const [left, ...rest] = label.split('№');
  const right = rest.join('№');
  return (
    <>
      {left}
      <span
        style={{
          fontSize: '1em',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: '0.1em',
          opacity: 0.9,
          margin: '0 0.02em',
        }}
      >
        No.
      </span>
      {right}
    </>
  );
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createDetailItem(item, locale) {
  return {
    title: item.title,
    summary: item.summary || item.subtitle || item.details || '',
    status: item.status || locale.common.detailFallback.status,
    nextAction: item.nextAction || locale.common.detailFallback.nextAction,
    link: item.link || '',
  };
}

function DetailModal({ detail, locale, onClose }) {
  if (!detail) return null;

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div
        className="detail-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>{detail.title}</div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 14px' }}>
            {locale.common.close}
          </button>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.summaryLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.summary}</div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.statusLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.status}</div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              {locale.common.nextActionLabel}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.nextAction}</div>
          </div>
        </div>

        {detail.link ? (
          <a href={detail.link} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginTop: 20 }}>
            {locale.common.externalLink}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Nav({ locale, lang, setLang, theme, setTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleNavClick = (id) => {
    scrollToSection(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--bg-0) 75%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </div>

        <div
          className="nav-links"
          style={{
            display: isMobileMenuOpen ? 'flex' : undefined,
            alignItems: 'center',
            gap: 26,
            fontSize: 14,
            color: 'var(--fg-2)',
            fontWeight: 400,
          }}
        >
          {locale.navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'var(--font-sans)',
                padding: 0,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: '1px solid var(--line-2)',
              borderRadius: 999,
              padding: '5px 12px',
              cursor: 'pointer',
              color: 'var(--fg-3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
            }}
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? '×' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function HeroCenterpiece() {
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, []);

  return (
    <div
      className="hero-centerpiece"
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -20,
        marginBottom: 80,
        height: 500,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 760,
          height: 480,
          background:
            'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(91,61,214,0.28) 30%, transparent 65%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          width: 420,
          height: 40,
          background: 'radial-gradient(ellipse, rgba(40,20,90,0.6) 0%, transparent 70%)',
          filter: 'blur(14px)',
          transform: 'rotateX(70deg)',
        }}
      />

      <video
        ref={videoRef}
        src="/assets/nexaeon-hero-v1.3.mov"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        style={{
          position: 'absolute',
          zIndex: 2,
          height: 460,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter:
            'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.4))',
          opacity: ended ? 0 : 1,
          transition: 'opacity 800ms ease',
          pointerEvents: ended ? 'none' : 'auto',
        }}
      />

      <img
        src="/assets/nexaeon-eye.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          zIndex: 3,
          height: 380,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter:
            'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.45))',
          opacity: ended ? 1 : 0,
          transform: ended ? 'scale(1)' : 'scale(0.94)',
          transition:
            'opacity 900ms ease 120ms, transform 1200ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function Hero({ t }) {
  return (
    <section id="home" style={{ position: 'relative', overflow: 'hidden', scrollMarginTop: 80 }}>
      <div
        className="hero-padding"
        style={{ textAlign: 'center', padding: '120px 32px 80px', position: 'relative', zIndex: 2 }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            border: '2px double var(--line-2)',
            background: 'var(--bg-1)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--fg-2)',
            marginBottom: 32,
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-violet)',
              boxShadow: '0 0 10px var(--accent-violet)',
            }}
          />
          {t.hero.eyebrow}
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(72px, 11vw, 176px)',
            lineHeight: 0.92,
            margin: 0,
            fontWeight: 400,
            letterSpacing: '-0.035em',
          }}
        >
          {t.hero.titleSerif}
        </h1>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(24px, 3.2vw, 48px)',
            color: 'var(--fg-2)',
            marginTop: 8,
            fontWeight: 400,
          }}
        >
          {t.hero.titleSerifSub}{' '}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontStyle: 'normal',
              fontWeight: 300,
              color: 'var(--fg-3)',
            }}
          >
            — {t.hero.titleSans}
          </span>
        </div>

        <p
          className="hero-sub"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 300,
            fontSize: 18,
            color: 'var(--fg-2)',
            maxWidth: 620,
            margin: '40px auto 0',
            whiteSpace: 'pre-line',
            lineHeight: 1.65,
          }}
        >
          {t.hero.sub}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48 }}>
          <button
            className="btn btn-gradient"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('knowledge')}
          >
            {t.hero.cta1} <ArrowIcon />
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 15 }}
            onClick={() => scrollToSection('research')}
          >
            {t.hero.cta2}
          </button>
        </div>
      </div>

      <HeroCenterpiece />

      <div
        className="container meta-strip"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
          paddingBottom: 48,
        }}
      >
        {t.hero.meta.map((m, i) => (
          <span key={i}>{renderMetaLabel(m)}</span>
        ))}
      </div>
    </section>
  );
}

function ResearchDirectionsSection({ locale, onOpenDetail }) {
  return (
    <section id="research" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.research.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.research.title}
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 64 }}>
        {locale.research.items.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => onOpenDetail(createDetailItem(item, locale))}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 24,
                color: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.3s var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {locale.common.openDetails}
                </span>
              </div>
              <p style={{ marginTop: 12, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>{item.summary}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeSection({ locale, onOpenDetail }) {
  const [keyword, setKeyword] = useState('');
  const [categoryKey, setCategoryKey] = useState('all');

  const categoryLabelByKey = useMemo(() => {
    const map = new Map();
    locale.knowledge.categories.forEach((item) => map.set(item.key, item.label));
    return map;
  }, [locale.knowledge.categories]);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();

    return locale.knowledge.items.filter((item) => {
      const categoryMatched = categoryKey === 'all' || item.categoryKey === categoryKey;
      if (!categoryMatched) return false;
      if (!lower) return true;
      return `${item.title} ${item.summary} ${item.tags.join(' ')} ${categoryLabelByKey.get(item.categoryKey) ?? ''}`
        .toLowerCase()
        .includes(lower);
    });
  }, [categoryKey, categoryLabelByKey, keyword, locale.knowledge.items]);

  return (
    <section id="knowledge" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.knowledge.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.knowledge.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={locale.knowledge.searchPlaceholder}
            style={{
              width: '100%',
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              borderRadius: 14,
              padding: '12px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {locale.knowledge.categories.map((item) => (
              <button
                key={item.key}
                onClick={() => setCategoryKey(item.key)}
                style={{
                  borderRadius: 999,
                  border: '1px solid ' + (categoryKey === item.key ? 'var(--fg-1)' : 'var(--line-2)'),
                  background: categoryKey === item.key ? 'var(--fg-1)' : 'transparent',
                  color: categoryKey === item.key ? 'var(--bg-0)' : 'var(--fg-2)',
                  padding: '8px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ border: '1px solid var(--line-1)', borderRadius: 16, padding: 20, color: 'var(--fg-3)' }}>
              {locale.knowledge.noResults}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenDetail(createDetailItem(item, locale))}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  border: '1px solid var(--line-1)',
                  background: 'var(--bg-1)',
                  padding: 20,
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.25 }}>{item.title}</div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--accent-fg)',
                  }}
                >
                  {categoryLabelByKey.get(item.categoryKey)}
                </div>
                <div style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 13 }}>{item.tags.join(' · ')}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection({ locale, onOpenDetail }) {
  return (
    <section id="projects" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.projects.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.projects.title}
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 60 }}>
        {locale.projects.items.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => onOpenDetail(createDetailItem(item, locale))}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 22,
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {locale.common.openDetails}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{item.subtitle}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[?？!！.,，。'"“”]/g, '').trim();
}

function AssistantSection({ locale }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: locale.assistant.greeting },
  ]);
  const [input, setInput] = useState('');

  const qaMap = useMemo(() => {
    const map = new Map();
    locale.assistant.qas.forEach((item) => map.set(item.question, item));
    return map;
  }, [locale.assistant.qas]);

  const answerQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const exact = qaMap.get(trimmed);
    const normalizedInput = normalizeText(trimmed);

    const fallbackMatch = locale.assistant.qas.find((item) =>
      item.keywords.some((keyword) => normalizedInput.includes(normalizeText(keyword)))
    );

    const answer = exact?.answer || fallbackMatch?.answer || locale.assistant.fallback;

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: answer },
    ]);
    setInput('');
  };

  return (
    <section id="assistant" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.assistant.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.assistant.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {locale.assistant.qas.map((item) => (
            <button
              key={item.question}
              onClick={() => answerQuestion(item.question)}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              {item.question}
            </button>
          ))}
        </div>

        <div
          style={{
            borderRadius: 20,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 16,
            minHeight: 260,
            maxHeight: 380,
            overflowY: 'auto',
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                marginBottom: 12,
                marginLeft: message.role === 'user' ? 'auto' : 0,
                maxWidth: '80%',
                borderRadius: 14,
                padding: '10px 12px',
                background: message.role === 'user' ? 'var(--gradient-aurora-soft)' : 'var(--bg-2)',
                color: 'var(--fg-1)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <div className="label" style={{ marginBottom: 6, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                {message.role === 'assistant' ? locale.assistant.assistantLabel : locale.assistant.userLabel}
              </div>
              {message.content}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={locale.assistant.inputPlaceholder}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                answerQuestion(input);
              }
            }}
            style={{
              flex: 1,
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              borderRadius: 14,
              padding: '12px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
            }}
          />
          <button className="btn btn-gradient" onClick={() => answerQuestion(input)}>
            {locale.assistant.send}
          </button>
        </div>
      </div>
    </section>
  );
}

function ContactSection({ locale }) {
  const [status, setStatus] = useState('');
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(locale.contact.email);
      setStatus(locale.contact.copySuccessMessage);
    } catch {
      setStatus(locale.contact.copyFallbackMessage);
    }
  };

  return (
    <section id="contact" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {locale.contact.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            lineHeight: 1.05,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {locale.contact.title}
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            borderRadius: 24,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 28,
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--fg-2)', lineHeight: 1.7, margin: 0 }}>{locale.contact.description}</p>
          <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', color: 'var(--accent-fg)' }}>
            {locale.contact.email}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`mailto:${locale.contact.email}`} className="btn btn-gradient">
              {locale.contact.mailtoCta}
            </a>
            <button onClick={copyEmail} className="btn btn-ghost">
              {locale.contact.copyCta}
            </button>
          </div>
          {status ? <div style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{status}</div> : null}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }) {
  return (
    <footer style={{ borderTop: '1px solid var(--line-1)', padding: '48px 0 32px', textAlign: 'center' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <NexLogo size={36} />
          <NexWordmark size={22} />
        </div>
        <p style={{ color: 'var(--fg-3)', marginTop: 8, marginBottom: 20, fontSize: 15 }}>{t.footer.tagline}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span>{t.footer.year}</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
}

export default function DirectionB({ t, lang, setLang, theme, setTheme }) {
  const rootRef = useRef(null);
  const locale = INTERACTIVE_CONTENT[lang] || INTERACTIVE_CONTENT.en;
  const [detail, setDetail] = useState(null);

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

  return (
    <div ref={rootRef}>
      <Nav locale={locale} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <ResearchDirectionsSection key={`research-${lang}`} locale={locale} onOpenDetail={setDetail} />
      <KnowledgeSection key={`knowledge-${lang}`} locale={locale} onOpenDetail={setDetail} />
      <ProjectsSection key={`projects-${lang}`} locale={locale} onOpenDetail={setDetail} />
      <AssistantSection key={`assistant-${lang}`} locale={locale} />
      <ContactSection key={`contact-${lang}`} locale={locale} />
      <Footer t={t} />
      <DetailModal detail={detail} locale={locale} onClose={() => setDetail(null)} />
    </div>
  );
}
