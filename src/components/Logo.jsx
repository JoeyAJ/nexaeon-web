const NX_ASPECT = 1270 / 780;

export function NexLogo({ size = 40, style = {} }) {
  return (
    <img
      src="/assets/nexaeon-mark.png"
      alt="NexAeon"
      style={{
        height: size,
        width: size * NX_ASPECT,
        objectFit: 'contain',
        display: 'inline-block',
        ...style,
      }}
    />
  );
}

export function NexEye({ size = 200, style = {} }) {
  return (
    <img
      src="/assets/nexaeon-mark.png"
      alt=""
      aria-hidden="true"
      style={{
        height: size,
        width: size * NX_ASPECT,
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  );
}

export function NexEye3D({ size = 56, style = {} }) {
  const w = size * NX_ASPECT;
  const layer = (z, opacity, hue, blur) => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transform: `translateZ(${z}px)`,
    opacity,
    filter: `${blur ? `blur(${blur}px) ` : ''}drop-shadow(0 0 ${Math.abs(z) * 0.4}px ${hue})`,
    mixBlendMode: 'screen',
  });

  return (
    <div style={{ width: w, height: size, perspective: 320, perspectiveOrigin: '50% 50%', display: 'inline-block', ...style }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(14deg) rotateY(-22deg) rotateZ(-3deg)',
        animation: 'nexEye3dFloat 6s ease-in-out infinite',
      }}>
        <div style={{
          position: 'absolute', inset: '-25% -15%',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(91,61,214,0.22) 35%, transparent 65%)',
          filter: 'blur(14px)',
          transform: 'translateZ(-30px)',
          pointerEvents: 'none',
        }} />
        <img src="/assets/nexaeon-mark.png" alt="" aria-hidden="true"
          style={{ ...layer(-16, 0.55, 'rgba(216,120,255,0.7)', 1.2), transform: 'translate3d(2.5px, 1.5px, -16px)' }} />
        <img src="/assets/nexaeon-mark.png" alt="" aria-hidden="true"
          style={{ ...layer(-12, 0.5, 'rgba(120,200,255,0.6)', 1.2), transform: 'translate3d(-2.5px, -1px, -12px)' }} />
        <img src="/assets/nexaeon-mark.png" alt="" aria-hidden="true"
          style={layer(-4, 0.85, 'rgba(139,92,246,0.7)', 0)} />
        <img src="/assets/nexaeon-mark.png" alt="" aria-hidden="true"
          style={{ ...layer(8, 1, 'rgba(200,168,255,0.55)', 0), mixBlendMode: 'normal' }} />
        <img src="/assets/nexaeon-mark.png" alt="" aria-hidden="true"
          style={{ ...layer(14, 0.55, 'rgba(255,255,255,0.6)', 0), filter: 'brightness(1.7) drop-shadow(0 0 4px rgba(255,255,255,0.7))', mixBlendMode: 'screen' }} />
      </div>
    </div>
  );
}

export function NexWordmark({ size = 22, mono = false }) {
  return (
    <span style={{
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: size,
      letterSpacing: '-0.022em',
      backgroundImage: mono ? 'none' : 'linear-gradient(135deg, #C8A8FF 0%, #8B5CF6 50%, #5B3DD6 100%)',
      WebkitBackgroundClip: mono ? 'unset' : 'text',
      backgroundClip: mono ? 'unset' : 'text',
      WebkitTextFillColor: mono ? 'currentColor' : 'transparent',
      color: mono ? 'currentColor' : 'transparent',
      display: 'inline-block',
      lineHeight: 1,
    }}>
      NexAeon
    </span>
  );
}

export function LangSwitcher({ lang, setLang }) {
  const langs = [
    { code: 'zh', label: '中' },
    { code: 'en', label: 'EN' },
    { code: 'ko', label: '한' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 3,
      borderRadius: 999, border: '1px solid var(--line-1)',
      background: 'var(--bg-1)', fontFamily: 'var(--font-mono)',
      fontSize: 11, letterSpacing: '0.06em',
    }}>
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          style={{
            padding: '5px 11px', borderRadius: 999,
            background: lang === l.code ? 'var(--fg-1)' : 'transparent',
            color: lang === l.code ? 'var(--bg-1)' : 'var(--fg-3)',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit', fontSize: 'inherit',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function ArrowIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
