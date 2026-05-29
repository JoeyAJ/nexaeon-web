import { getAllContentItems } from '../lib/contentSource.js';
import NeuralBackground from './NeuralBackground.jsx';

const DETAIL_TEXT = {
  zh: {
    notFoundTitle: '內容尚未建立',
    notFoundBody: '這個條目目前沒有可顯示的資料。',
    backHome: '返回首頁',
    summary: '摘要',
    description: '詳細說明',
    nextStep: '下一步',
  },
  en: {
    notFoundTitle: 'Content Not Ready',
    notFoundBody: 'This entry is not available yet.',
    backHome: 'Back to Home',
    summary: 'Summary',
    description: 'Description',
    nextStep: 'Next Step',
  },
  ko: {
    notFoundTitle: '콘텐츠 준비 중',
    notFoundBody: '이 항목은 아직 표시할 콘텐츠가 없습니다.',
    backHome: '홈으로 돌아가기',
    summary: '요약',
    description: '상세 설명',
    nextStep: '다음 단계',
  },
};

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

function NotFound({ navigate, text }) {
  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingTop: 88, paddingBottom: 100 }}>
      <NeuralBackground />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div
          className="content-detail-card"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            borderRadius: 24,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.1 }}>
            {text.notFoundTitle}
          </div>
          <p style={{ marginTop: 16, color: 'var(--fg-2)', lineHeight: 1.7 }}>
            {text.notFoundBody}
          </p>
          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate('/')}>
            {text.backHome}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DetailPage({ type, id, navigate, lang }) {
  const text = DETAIL_TEXT[lang] || DETAIL_TEXT.en;
  const item = getAllContentItems(lang).find((contentItem) => contentItem.type === type && contentItem.id === id);

  if (!item) {
    return <NotFound navigate={navigate} text={text} />;
  }

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingTop: 88, paddingBottom: 100 }}>
      <NeuralBackground />
      <div className="container">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            {text.backHome}
          </button>

          <article
            className="content-detail-card"
            style={{
              marginTop: 24,
              borderRadius: 24,
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
                <div className="label" style={{ marginBottom: 8 }}>{text.summary}</div>
                <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.8 }}>{item.summary}</p>
              </section>

              <section>
                <div className="label" style={{ marginBottom: 8 }}>{text.description}</div>
                <p style={{ margin: 0, color: 'var(--fg-2)', lineHeight: 1.8 }}>{item.description}</p>
              </section>

              <section>
                <div className="label" style={{ marginBottom: 8 }}>{text.nextStep}</div>
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
