import { useRef, useState, useEffect } from 'react';
import { NexLogo, NexWordmark, NexEye3D, LangSwitcher, ArrowIcon } from './Logo.jsx';

function Nav({ t, lang, setLang, theme, setTheme }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in srgb, var(--bg-0) 75%, transparent)',
      backdropFilter: 'blur(20px) saturate(180%)',
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </div>
        <div className="nav-links" style={{
          display: 'flex', alignItems: 'center', gap: 36,
          fontSize: 14, color: 'var(--fg-2)', fontWeight: 400,
        }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{t.nav.research}</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{t.nav.teaching}</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{t.nav.knowledge}</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{t.nav.essays}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'transparent', border: '1px solid var(--line-2)',
              borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
              color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11,
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
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, []);

  return (
    <div className="hero-centerpiece" style={{
      position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
      marginTop: -20, marginBottom: 80, height: 500,
    }}>
      {/* Aurora halo behind */}
      <div style={{
        position: 'absolute', width: 760, height: 480,
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(91,61,214,0.28) 30%, transparent 65%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      {/* Ground shadow */}
      <div style={{
        position: 'absolute', bottom: 60, width: 420, height: 40,
        background: 'radial-gradient(ellipse, rgba(40,20,90,0.6) 0%, transparent 70%)',
        filter: 'blur(14px)', transform: 'rotateX(70deg)',
      }} />

      {/* Video — plays once on entry */}
      <video
        ref={videoRef}
        src="/assets/nexaeon-hero.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        style={{
          position: 'absolute', zIndex: 2,
          height: 460, width: 'auto', maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.4))',
          opacity: ended ? 0 : 1,
          transition: 'opacity 800ms ease',
          pointerEvents: ended ? 'none' : 'auto',
        }}
      />

      {/* Static fish-eye — revealed after video finishes */}
      <img
        src="/assets/nexaeon-eye.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', zIndex: 3,
          height: 380, width: 'auto', maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'drop-shadow(0 30px 60px rgba(20,10,50,0.85)) drop-shadow(0 0 80px rgba(200,168,255,0.45))',
          opacity: ended ? 1 : 0,
          transform: ended ? 'scale(1)' : 'scale(0.94)',
          transition: 'opacity 900ms ease 120ms, transform 1200ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function Hero({ t }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-padding" style={{ textAlign: 'center', padding: '120px 32px 80px', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 16px', borderRadius: 999,
          border: '2px double var(--line-2)', background: 'var(--bg-1)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--fg-2)',
          marginBottom: 32, fontSize: 13,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-violet)',
            boxShadow: '0 0 10px var(--accent-violet)',
          }} />
          {t.hero.eyebrow}
        </div>

        <h1 className="hero-title" style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(72px, 11vw, 176px)',
          lineHeight: 0.92, margin: 0, fontWeight: 400,
          letterSpacing: '-0.035em',
        }}>
          {t.hero.titleSerif}
        </h1>
        <div style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: 'clamp(24px, 3.2vw, 48px)',
          color: 'var(--fg-2)', marginTop: 8, fontWeight: 400,
        }}>
          {t.hero.titleSerifSub}{' '}
          <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 300, color: 'var(--fg-3)' }}>
            — {t.hero.titleSans}
          </span>
        </div>

        <p className="hero-sub" style={{
          fontFamily: 'var(--font-sans)', fontWeight: 300,
          fontSize: 18, color: 'var(--fg-2)',
          maxWidth: 620, margin: '40px auto 0',
          whiteSpace: 'pre-line', lineHeight: 1.65,
        }}>
          {t.hero.sub}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48 }}>
          <button className="btn btn-gradient" style={{ fontSize: 15 }}>
            {t.hero.cta1} <ArrowIcon />
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 15 }}>
            {t.hero.cta2}
          </button>
        </div>
      </div>

      <HeroCenterpiece />

      <div className="container meta-strip" style={{
        display: 'flex', justifyContent: 'center', gap: 48,
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--fg-3)',
        paddingBottom: 48,
      }}>
        {t.hero.meta.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </section>
  );
}

function What({ t }) {
  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)', textAlign: 'center' }}>
      <div className="container">
        <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-fg)', marginBottom: 24, fontSize: 12 }}>
          — {t.what.label}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 72px)',
          lineHeight: 1.05, fontWeight: 400, margin: 0,
          letterSpacing: '-0.02em', whiteSpace: 'pre-line',
          maxWidth: 880, marginInline: 'auto',
        }}>
          {t.what.title}
        </h2>
        <p style={{
          fontFamily: 'var(--font-sans)', lineHeight: 1.6,
          color: 'var(--fg-2)', maxWidth: 680, margin: '32px auto 0',
          fontWeight: 300, fontSize: 16,
        }}>
          {t.what.body}
        </p>

        <div className="grid-4 what-pillars" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32, marginTop: 96, textAlign: 'left',
        }}>
          {t.what.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                padding: 24, borderRadius: 'var(--r-lg)',
                background: 'var(--bg-1)', border: '1px solid var(--line-1)',
                transition: 'transform 0.3s, border-color 0.3s', cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--line-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--line-1)';
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-fg)', letterSpacing: '0.18em', marginBottom: 16 }}>
                {p.num}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 8, letterSpacing: '-0.01em' }}>
                {p.t}
              </div>
              <div style={{ color: 'var(--fg-2)', lineHeight: 1.55, fontWeight: 300, fontSize: 14 }}>
                {p.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForWhom({ t }) {
  const [active, setActive] = useState(0);
  const item = t.forWhom.items[active];

  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-fg)', marginBottom: 24, fontSize: 12 }}>
          — {t.forWhom.label}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 72px)',
          lineHeight: 1.05, fontWeight: 400, margin: 0, letterSpacing: '-0.02em',
        }}>
          {t.forWhom.title}
        </h2>
        <p style={{ color: 'var(--fg-3)', marginTop: 16, fontWeight: 300, fontSize: 16 }}>
          {t.forWhom.sub}
        </p>
      </div>

      <div className="container for-whom-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 64, flexWrap: 'wrap' }}>
        {t.forWhom.items.map((it, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '12px 24px', borderRadius: 999,
              border: '1px solid ' + (active === i ? 'var(--fg-1)' : 'var(--line-2)'),
              background: active === i ? 'var(--fg-1)' : 'transparent',
              color: active === i ? 'var(--bg-0)' : 'var(--fg-2)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.25s', fontSize: 13,
            }}
          >
            {it.id} · {it.who}
          </button>
        ))}
      </div>

      <div className="container for-whom-panel" style={{
        marginTop: 48, padding: 64, borderRadius: 24,
        background: 'var(--bg-1)', border: '1px solid var(--line-1)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15), transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', minHeight: 240 }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-fg)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 20, fontSize: 12 }}>
            {item.goal}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 6vw, 88px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 24 }}>
            {item.who}
          </div>
          <p style={{ lineHeight: 1.55, color: 'var(--fg-2)', maxWidth: 640, margin: '0 auto', fontWeight: 300, fontSize: 18 }}>
            {item.desc}
          </p>
        </div>
      </div>
    </section>
  );
}

function Labs({ t }) {
  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-fg)', marginBottom: 24, fontSize: 12 }}>
          — {t.labs.label}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 72px)',
          lineHeight: 1.05, fontWeight: 400, margin: 0,
          letterSpacing: '-0.02em', whiteSpace: 'pre-line',
        }}>
          {t.labs.title}
        </h2>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 80 }}>
        {t.labs.items.map((lab, i) => (
          <a
            key={i}
            href="#"
            className="lab-card"
          style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, border: '1px solid var(--line-1)',
              background: 'var(--bg-1)', padding: 32, minHeight: 360,
              display: 'flex', flexDirection: 'column',
              textDecoration: 'none', color: 'inherit',
              transition: 'all 0.4s var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(139,92,246,0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* 3D fish-eye in top-right corner */}
            <div style={{ position: 'absolute', top: 20, right: 18, opacity: 0.95, pointerEvents: 'none' }}>
              <NexEye3D size={44} />
            </div>
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.18em', marginBottom: 'auto', textTransform: 'uppercase', fontSize: 11 }}>
                {lab.tag}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.015em', marginTop: 80, marginBottom: 16 }}>
                {lab.name}
              </div>
              <div style={{ color: 'var(--fg-2)', lineHeight: 1.6, fontWeight: 300, marginBottom: 24, fontSize: 15 }}>
                {lab.desc}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.1em', fontSize: 12 }}>
                  {lab.stat}
                </span>
                <ArrowIcon />
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Essays({ t }) {
  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container" style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-fg)', marginBottom: 24, fontSize: 12 }}>
          — {t.essays.label}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 72px)',
          lineHeight: 1.05, fontWeight: 400, margin: 0, letterSpacing: '-0.02em',
        }}>
          {t.essays.title}
        </h2>
        <p style={{ color: 'var(--fg-3)', marginTop: 16, fontWeight: 300, fontSize: 17 }}>
          {t.essays.sub}
        </p>
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {t.essays.items.map((e, i) => (
          <a
            key={i}
            href="#"
            className="essay-card"
            style={{
              display: 'flex', flexDirection: 'column',
              padding: 32, borderRadius: 20,
              background: 'var(--bg-1)', border: '1px solid var(--line-1)',
              textDecoration: 'none', color: 'inherit',
              minHeight: 360, transition: 'all 0.3s',
            }}
            onMouseEnter={(ev) => {
              ev.currentTarget.style.background = 'var(--bg-2)';
              ev.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.background = 'var(--bg-1)';
              ev.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 32 }}>
              <span style={{ color: 'var(--accent-fg)' }}>{e.num}</span>
              <span>{e.date} · {e.read}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 16 }}>
              {e.title}
            </div>
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.6, fontWeight: 300, flex: 1, fontSize: 15 }}>
              {e.excerpt}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
              {e.tags.map((tg, j) => (
                <span key={j} style={{
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--bg-2)', color: 'var(--fg-3)',
                  letterSpacing: '0.05em', fontSize: 11,
                }}>
                  {tg}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Collab({ t }) {
  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Starlink constellation backdrop */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C8A8FF" stopOpacity="1" />
              <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#5B3DD6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="linkLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(200,168,255,0)" />
              <stop offset="50%" stopColor="rgba(200,168,255,0.55)" />
              <stop offset="100%" stopColor="rgba(200,168,255,0)" />
            </linearGradient>
          </defs>
          <ellipse cx="800" cy="400" rx="720" ry="180" fill="none" stroke="rgba(200,168,255,0.18)" strokeWidth="1" />
          <ellipse cx="800" cy="400" rx="560" ry="260" fill="none" stroke="rgba(200,168,255,0.14)" strokeWidth="1" transform="rotate(-18 800 400)" />
          <ellipse cx="800" cy="400" rx="640" ry="140" fill="none" stroke="rgba(200,168,255,0.12)" strokeWidth="1" transform="rotate(22 800 400)" />
          <ellipse cx="800" cy="400" rx="420" ry="320" fill="none" stroke="rgba(200,168,255,0.1)" strokeWidth="1" transform="rotate(8 800 400)" />
          {[
            ['200,260', '520,180'], ['520,180', '820,210'], ['820,210', '1180,170'], ['1180,170', '1440,300'],
            ['260,520', '580,610'], ['580,610', '920,580'], ['920,580', '1240,640'], ['1240,640', '1480,540'],
            ['380,360', '680,300'], ['680,300', '1020,340'], ['1020,340', '1320,290'],
            ['340,460', '740,440'], ['740,440', '1100,470'], ['1100,470', '1380,440'],
          ].map(([a, b], i) => (
            <line key={i}
              x1={a.split(',')[0]} y1={a.split(',')[1]}
              x2={b.split(',')[0]} y2={b.split(',')[1]}
              stroke="url(#linkLine)" strokeWidth="1"
            />
          ))}
          {[
            [200, 260, 2.5], [520, 180, 3], [820, 210, 2.5], [1180, 170, 3], [1440, 300, 2.5],
            [260, 520, 3], [580, 610, 2.5], [920, 580, 3], [1240, 640, 2.5], [1480, 540, 3],
            [380, 360, 2], [680, 300, 2], [1020, 340, 2.5], [1320, 290, 2],
            [340, 460, 2], [740, 440, 2.5], [1100, 470, 2], [1380, 440, 2.5],
            [120, 400, 1.8], [1560, 400, 1.8], [800, 80, 2], [800, 720, 2],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r * 6} fill="url(#starGlow)" opacity="0.6" />
              <circle cx={cx} cy={cy} r={r} fill="#E8D8FF" />
            </g>
          ))}
        </svg>
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-fg)', marginBottom: 24, fontSize: 12 }}>
          — {t.collab.label}
        </div>
        <h2 className="collab-title" style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(56px, 8vw, 128px)',
          lineHeight: 0.95, fontWeight: 400, margin: 0, letterSpacing: '-0.025em',
          whiteSpace: 'pre-line',
        }}>
          {t.collab.title}
        </h2>
        <p style={{
          fontFamily: 'var(--font-sans)', color: 'var(--fg-2)',
          maxWidth: 640, margin: '32px auto 0',
          fontWeight: 300, lineHeight: 1.6, fontSize: 17,
        }}>
          {t.collab.sub}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', marginTop: 48, flexWrap: 'wrap' }}>
          <button className="btn btn-gradient" style={{ padding: '16px 28px', fontSize: 15 }}>
            {t.collab.cta} <ArrowIcon />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', fontSize: 14 }}>
            {t.collab.contact}
          </span>
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
        <p style={{ color: 'var(--fg-3)', marginTop: 8, marginBottom: 32, fontSize: 15 }}>
          {t.footer.tagline}
        </p>
        <div className="footer-links" style={{ display: 'flex', justifyContent: 'center', gap: 28, fontSize: 13, color: 'var(--fg-2)', marginBottom: 32 }}>
          {t.footer.links.map((l, i) => (
            <a key={i} href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <span>{t.footer.year}</span>
          <span>·</span>
          <span style={{ color: 'var(--fg-2)' }}>{t.footer.built}</span>
        </div>
      </div>
    </footer>
  );
}

export default function DirectionB({ t, lang, setLang, theme, setTheme }) {
  return (
    <div>
      <Nav t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <What t={t} />
      <ForWhom t={t} />
      <Labs t={t} />
      <Essays t={t} />
      <Collab t={t} />
      <Footer t={t} />
    </div>
  );
}
