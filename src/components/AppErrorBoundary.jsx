/* eslint-disable react-refresh/only-export-components */
import { Component } from 'react';
import NeuralBackground from './NeuralBackground.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';

const GUARDRAIL_COPY = {
  zh: {
    errorTitle: '此頁暫時無法顯示',
    errorBody: '頁面遇到暫時狀況，沒有任何內部錯誤資訊會顯示在這裡。',
    notFoundTitle: '找不到這個頁面',
    notFoundBody: '這個網址目前沒有公開頁面可以顯示。',
    unavailableTitle: '目前無法查看此公開內容',
    unavailableBody: '此內容目前無法公開顯示。你可以返回上一層或回到首頁。',
    retry: '重新嘗試',
    backHome: '返回首頁',
    backPrevious: '返回上一層',
  },
  en: {
    errorTitle: 'This page cannot be shown right now',
    errorBody: 'Something temporary happened on this page. Internal error details are not shown here.',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This URL does not currently map to a public page.',
    unavailableTitle: 'This public content cannot be viewed right now',
    unavailableBody: 'This content is not available for public display. You can go back or return home.',
    retry: 'Try again',
    backHome: 'Back to home',
    backPrevious: 'Back',
  },
  ko: {
    errorTitle: '이 페이지를 지금 표시할 수 없다',
    errorBody: '페이지에 일시적인 문제가 발생했다. 내부 오류 정보는 이곳에 표시되지 않는다.',
    notFoundTitle: '페이지를 찾을 수 없다',
    notFoundBody: '이 주소에는 현재 공개 페이지가 연결되어 있지 않다.',
    unavailableTitle: '현재 이 공개 콘텐츠를 볼 수 없다',
    unavailableBody: '이 콘텐츠는 현재 공개 표시할 수 없다. 이전 단계로 돌아가거나 홈으로 이동할 수 있다.',
    retry: '다시 시도',
    backHome: '홈으로 돌아가기',
    backPrevious: '뒤로',
  },
};

export function getGuardrailCopy(lang = 'zh') {
  return GUARDRAIL_COPY[lang] || GUARDRAIL_COPY.zh;
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem('nexaeon_intro_seen', 'true');
  } catch {
    // Navigation should not depend on storage availability.
  }
}

export function GuardrailStatePage({
  lang,
  setLang,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  theme,
  setTheme,
  testId = 'guardrail-state',
}) {
  const copy = getGuardrailCopy(lang);

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }} data-testid={testId}>
      <NeuralBackground />
      <header className="subpage-topbar">
        <div className="container subpage-topbar-inner">
          <button
            className="main-logo-link"
            onClick={onSecondary}
            aria-label={copy.backHome}
            type="button"
          >
            <NexLogo size={28} />
            <NexWordmark size={22} />
          </button>
          <div className="nav-actions">
            {theme && setTheme ? (
              <button
                className="theme-toggle"
                data-princess-passive-control="true"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                type="button"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀' : '◑'}
              </button>
            ) : null}
            {setLang ? <LangSwitcher lang={lang} setLang={setLang} /> : null}
          </div>
        </div>
      </header>

      <div className="container subpage-content">
        <section className="content-detail-card detail-empty-card guardrail-state-card">
          <h1 className="detail-empty-title">{title}</h1>
          <p>{body}</p>
          <div className="guardrail-state-actions">
            {onPrimary ? (
              <button className="btn btn-ghost" onClick={onPrimary} type="button">
                {primaryLabel}
              </button>
            ) : null}
            <button className="btn btn-glass" onClick={onSecondary} type="button">
              {secondaryLabel}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error(JSON.stringify({ category: 'render_error', name: error?.name || 'Error' }));
    }
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  goHome = () => {
    markIntroSeen();
    this.setState({ hasError: false }, () => {
      this.props.navigate('/');
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const copy = getGuardrailCopy(this.props.lang);
    return (
      <GuardrailStatePage
        lang={this.props.lang}
        setLang={this.props.setLang}
        theme={this.props.theme}
        setTheme={this.props.setTheme}
        title={copy.errorTitle}
        body={copy.errorBody}
        primaryLabel={copy.retry}
        secondaryLabel={copy.backHome}
        onPrimary={this.reset}
        onSecondary={this.goHome}
        testId="app-error-boundary"
      />
    );
  }
}
