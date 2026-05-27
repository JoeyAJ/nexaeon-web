import { findContentItem } from '../data/nexaeonContent.js';

function Badge({ children }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: '1px solid var(--line-2)',
        background: 'var(--bg-2)',
        color: 'var(--fg-2)',
        padding: '6px 11px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function NotFound({ navigate }) {
  return (
    <div className="container" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          borderRadius: 24,
          border: '1px solid var(--line-1)',
          background: 'var(--bg-1)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.1 }}>
          內容尚未建立
        </div>
        <p style={{ marginTop: 16, color: 'var(--fg-2)', lineHeight: 1.7 }}>
          這個條目目前沒有可顯示的資料。
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate('/')}>
          返回首頁
        </button>
      </div>
    </div>
  );
}

export default function DetailPage({ type, id, navigate }) {
  const item = findContentItem(type, id);

  if (!item) {
    return <NotFound navigate={navigate} />;
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: 88, paddingBottom: 100 }}>
      <div className="container">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            返回首頁
          </button>

          <article
            style={{
              marginTop: 24,
              borderRadius: 24,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: '30px clamp(20px, 4vw, 40px)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Badge>{item.category}</Badge>
              <Badge>{item.status}</Badge>
              <Badge>{item.type}</Badge>
            </div>

            <h1
              style={{
                margin: '18px 0 0',
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(40px, 6vw, 70px)',
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {item.title}
            </h1>

            <p style={{ marginTop: 14, fontSize: 20, color: 'var(--fg-2)', lineHeight: 1.5 }}>{item.subtitle}</p>

            <div style={{ marginTop: 28, display: 'grid', gap: 20 }}>
              <section>
                <div className="label" style={{ marginBottom: 8 }}>摘要</div>
                <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.8 }}>{item.summary}</p>
              </section>

              <section>
                <div className="label" style={{ marginBottom: 8 }}>詳細說明</div>
                <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.8 }}>{item.description}</p>
              </section>

              <section>
                <div className="label" style={{ marginBottom: 8 }}>下一步</div>
                <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.8 }}>{item.nextStep}</p>
              </section>

              <section>
                <div className="label" style={{ marginBottom: 10 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {item.tags.map((tag) => (
                    <span key={tag} className="content-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
