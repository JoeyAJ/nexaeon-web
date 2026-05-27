import { useMemo, useRef, useState, useEffect } from 'react';
import { NexLogo, NexWordmark, LangSwitcher, ArrowIcon } from './Logo.jsx';
import {
  ASSISTANT_PRESET_QUESTIONS,
  ASSISTANT_REPLIES,
  CONTACT_DIRECTIONS,
  CONTACT_IDENTITIES,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_ITEMS,
  NAV_ITEMS,
  PROJECT_ITEMS,
  RESEARCH_DIRECTIONS,
} from '../constants/interactiveData.js';

function Nav({ lang, setLang, theme, setTheme }) {
  const handleScroll = (id) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            fontSize: 14,
            color: 'var(--fg-2)',
            fontWeight: 400,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleScroll(item.id)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        src="/assets/nexaeon-hero.mp4"
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
            onClick={() => document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' })}
          >
            探索研究 <ArrowIcon />
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 15 }}
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            合作洽詢
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
          <span key={i}>{m}</span>
        ))}
      </div>
    </section>
  );
}

function ResearchDirectionsSection() {
  const [expanded, setExpanded] = useState({});

  return (
    <section id="research" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — Research Directions
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
          研究方向
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 64 }}>
        {RESEARCH_DIRECTIONS.map((item) => {
          const isOpen = Boolean(expanded[item.id]);
          return (
            <button
              key={item.id}
              onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
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
                  {isOpen ? '收合' : '展開'}
                </span>
              </div>
              <p style={{ marginTop: 12, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>{item.summary}</p>
              {isOpen ? (
                <p style={{ marginTop: 14, color: 'var(--fg-2)', lineHeight: 1.65, fontSize: 14 }}>{item.details}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeSection() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();

    return KNOWLEDGE_ITEMS.filter((item) => {
      const categoryMatched = category === '全部' || item.category === category;
      if (!categoryMatched) return false;
      if (!lower) return true;
      return `${item.title} ${item.summary} ${item.tags.join(' ')} ${item.category}`.toLowerCase().includes(lower);
    });
  }, [category, keyword]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  return (
    <section id="knowledge" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — Knowledge Base
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
          知識庫
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜尋關鍵字（標題、摘要、分類、標籤）"
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
            {KNOWLEDGE_CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                style={{
                  borderRadius: 999,
                  border: '1px solid ' + (category === item ? 'var(--fg-1)' : 'var(--line-2)'),
                  background: category === item ? 'var(--fg-1)' : 'transparent',
                  color: category === item ? 'var(--bg-0)' : 'var(--fg-2)',
                  padding: '8px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ border: '1px solid var(--line-1)', borderRadius: 16, padding: 20, color: 'var(--fg-3)' }}>
              找不到符合條件的資料。
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
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
                <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--accent-fg)' }}>
                  {item.category}
                </div>
                <div style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 13 }}>{item.tags.join(' · ')}</div>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <div
            style={{
              marginTop: 18,
              borderRadius: 18,
              border: '1px solid var(--line-2)',
              background: 'var(--bg-1)',
              padding: 20,
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28 }}>{selected.title}</div>
            <p style={{ marginTop: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>{selected.summary}</p>
            <a
              href={selected.link}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ marginTop: 14, display: 'inline-flex' }}
            >
              外部連結
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProjectsSection() {
  const [activeId, setActiveId] = useState(null);

  return (
    <section id="projects" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — Projects
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
          項目展示
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 60 }}>
        {PROJECT_ITEMS.map((item) => {
          const isOpen = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId((prev) => (prev === item.id ? null : item.id))}
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
                  {isOpen ? '收合' : '詳細'}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{item.subtitle}</p>
              {isOpen ? <p style={{ marginTop: 12, color: 'var(--fg-2)', lineHeight: 1.65 }}>{item.details}</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AssistantSection() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好，我是 Nexōn 助教。可以直接點選預設問題，或輸入你的提問。' },
  ]);
  const [input, setInput] = useState('');

  const answerQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const direct = ASSISTANT_REPLIES[trimmed];
    const fallback =
      Object.entries(ASSISTANT_REPLIES).find(([key]) =>
        key.replace(/[？?]/g, '').split('').some((char) => char && trimmed.includes(char))
      )?.[1] ||
      '目前是 V1 mock 助教。你可以先點選上方四個預設問題，我會給你對應答案。';

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: direct || fallback },
    ]);
    setInput('');
  };

  return (
    <section id="assistant" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — Nexōn AI Tutor
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
          Nexōn 助教
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {ASSISTANT_PRESET_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => answerQuestion(question)}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              {question}
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
                {message.role === 'assistant' ? 'Nexōn' : '你'}
              </div>
              {message.content}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="輸入你的問題..."
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
            送出
          </button>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [form, setForm] = useState({
    name: '',
    identity: '',
    direction: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState('');

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const hasEmpty = Object.values(form).some((value) => !value.trim());
    if (hasEmpty) {
      setStatus('請先完整填寫所有欄位。');
      return;
    }

    setStatus('送出成功，我們已收到你的訊息，將盡快回覆。');
    setForm({ name: '', identity: '', direction: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — Contact & Collaboration
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
          聯絡合作
        </h2>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <form
          onSubmit={handleSubmit}
          className="contact-form-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
            borderRadius: 24,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 22,
          }}
        >
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="姓名"
            style={fieldStyle}
          />

          <select value={form.identity} onChange={(event) => updateField('identity', event.target.value)} style={fieldStyle}>
            <option value="">身份</option>
            {CONTACT_IDENTITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={form.direction} onChange={(event) => updateField('direction', event.target.value)} style={fieldStyle}>
            <option value="">合作方向</option>
            {CONTACT_DIRECTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="Email"
            style={fieldStyle}
          />

          <textarea
            value={form.message}
            onChange={(event) => updateField('message', event.target.value)}
            placeholder="留言"
            style={{ ...fieldStyle, gridColumn: '1 / -1', minHeight: 120, resize: 'vertical' }}
          />

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <button type="submit" className="btn btn-gradient">
              送出
            </button>
            {status ? <div style={{ color: 'var(--fg-2)', fontSize: 14 }}>{status}</div> : null}
          </div>
        </form>
      </div>
    </section>
  );
}

const fieldStyle = {
  width: '100%',
  background: 'var(--bg-0)',
  border: '1px solid var(--line-2)',
  color: 'var(--fg-1)',
  borderRadius: 12,
  padding: '12px 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
};

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
      <Nav lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <ResearchDirectionsSection />
      <KnowledgeSection />
      <ProjectsSection />
      <AssistantSection />
      <ContactSection />
      <Footer t={t} />
    </div>
  );
}
