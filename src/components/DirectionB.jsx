import { useMemo, useRef, useState, useEffect } from 'react';
import { NexLogo, NexWordmark, LangSwitcher, ArrowIcon } from './Logo.jsx';
import { INTERACTIVE_CONTENT } from '../constants/interactiveData.js';
import {
  getDataSourceStatus,
  getKnowledgeItems,
  getProjectItems,
  getResearchItems,
} from '../lib/contentSource.js';
import { toDetailPath } from '../utils/router.js';

const UI_TEXT = {
  zh: {
    quickPreview: '快速預覽',
    viewDetail: '查看詳情',
    allCategory: '全部',
    detailDescriptionLabel: '詳細說明',
  },
  en: {
    quickPreview: 'Quick Preview',
    viewDetail: 'View Details',
    allCategory: 'All',
    detailDescriptionLabel: 'Description',
  },
  ko: {
    quickPreview: '빠른 미리보기',
    viewDetail: '상세 보기',
    allCategory: '전체',
    detailDescriptionLabel: '상세 설명',
  },
};

const CORE_INTERACTION_CONTENT = {
  zh: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: '核心模組入口',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: '以學習診斷與分層回覆設計可持續迭代的 AI 助教能力。',
          status: 'Prototype',
          purpose: '支援提問理解、回覆結構化與可追蹤的學習回饋。',
          stage: '原型測試中',
          future: '接入學習歷程記憶、難度調節與教師協作面板。',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: '集中管理研究主題、方法路徑與驗證進度的研究中台。',
          status: 'Active',
          purpose: '把研究方向轉為可追蹤節點，便於對外展示與內部迭代。',
          stage: '主結構已上線',
          future: '擴充研究問題圖譜與跨專案證據鏈結。',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: '可搜尋、可分類、可累積的知識節點系統。',
          status: 'Active',
          purpose: '支援研究筆記沉澱、快速檢索與主題再利用。',
          stage: '內容持續更新',
          future: '新增多來源同步與知識節點關聯視圖。',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: '串連研究假設到產品原型的專案實驗工作室。',
          status: 'Coming Soon',
          purpose: '管理專案節奏、設計取捨與里程碑復盤。',
          stage: '流程設計中',
          future: '接入任務追蹤、風險看板與自動彙整報告。',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: '研究互動卡片',
      hint: '點擊卡片即可切換說明',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: '建立可因應學習者程度與節奏的對話策略，讓每次回應都能導向可執行下一步。',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: '聚焦 AI 重新定義教學流程、評量邏輯與課堂互動模式的可行框架。',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: '把學習行為、反思深度與參與品質轉為可追蹤指標，支撐教學決策。',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: '探索教師、學生與 AI 的協作邊界，建立兼顧效率與人本價值的設計原則。',
        },
      ],
    },
  },
  en: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: 'Core Module Entry',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: 'Builds an iteratable AI tutoring capability through learner diagnosis and layered responses.',
          status: 'Prototype',
          purpose: 'Supports question understanding, structured replies, and trackable learning feedback.',
          stage: 'Prototype validation in progress',
          future: 'Add learning-memory context, adaptive difficulty, and teacher collaboration tools.',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: 'A central layer for managing research themes, method tracks, and validation progress.',
          status: 'Active',
          purpose: 'Turns research directions into trackable nodes for public clarity and internal iteration.',
          stage: 'Core structure is live',
          future: 'Expand question maps and cross-project evidence linking.',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: 'A searchable, classifiable, and cumulative knowledge node system.',
          status: 'Active',
          purpose: 'Supports note retention, fast retrieval, and cross-topic reuse.',
          stage: 'Continuously updated',
          future: 'Add multi-source sync and relationship views across knowledge nodes.',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: 'An experiment studio connecting research hypotheses to product prototypes.',
          status: 'Coming Soon',
          purpose: 'Manages project cadence, design trade-offs, and milestone retrospectives.',
          stage: 'Workflow design phase',
          future: 'Integrate task tracking, risk boards, and automated summary reports.',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: 'Research Focus Cards',
      hint: 'Click a card to switch the brief',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: 'Design dialogue strategies that adapt to learner level and pace so each response leads to a clear next action.',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: 'Defines practical frameworks for redesigning teaching flow, assessment logic, and classroom interaction with AI.',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: 'Converts behavior signals, reflection depth, and engagement quality into actionable teaching metrics.',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: 'Explores collaboration boundaries among teachers, learners, and AI with human-centered design principles.',
        },
      ],
    },
  },
  ko: {
    modules: {
      eyebrow: 'NexAeon Modules',
      title: '핵심 모듈 입구',
      cards: [
        {
          id: 'ai-tutoring-lab',
          title: 'AI Tutoring Lab',
          summary: '학습 진단과 계층형 응답을 기반으로 지속 개선 가능한 AI 튜터 역량을 구축합니다.',
          status: 'Prototype',
          purpose: '질문 이해, 구조화된 응답, 추적 가능한 학습 피드백을 지원합니다.',
          stage: '프로토타입 검증 중',
          future: '학습 이력 메모리, 난이도 조절, 교사 협업 패널을 연동합니다.',
        },
        {
          id: 'research-hub',
          title: 'Research Hub',
          summary: '연구 주제, 방법 경로, 검증 진행을 통합 관리하는 연구 허브입니다.',
          status: 'Active',
          purpose: '연구 방향을 추적 가능한 노드로 전환해 대외 전달력과 내부 반복을 강화합니다.',
          stage: '핵심 구조 운영 중',
          future: '질문 맵과 프로젝트 간 증거 연결을 확장합니다.',
        },
        {
          id: 'knowledge-base',
          title: 'Knowledge Base',
          summary: '검색·분류·축적이 가능한 지식 노드 시스템입니다.',
          status: 'Active',
          purpose: '연구 노트 축적, 빠른 검색, 주제 간 재활용을 지원합니다.',
          stage: '지속 업데이트 중',
          future: '다중 소스 동기화와 지식 노드 관계 뷰를 추가합니다.',
        },
        {
          id: 'project-studio',
          title: 'Project Studio',
          summary: '연구 가설을 제품 프로토타입으로 연결하는 프로젝트 실험 스튜디오입니다.',
          status: 'Coming Soon',
          purpose: '프로젝트 리듬, 설계 트레이드오프, 마일스톤 회고를 관리합니다.',
          stage: '프로세스 설계 단계',
          future: '태스크 추적, 리스크 보드, 자동 요약 리포트를 연동합니다.',
        },
      ],
    },
    researchFocus: {
      eyebrow: 'Research Interaction',
      title: '연구 인터랙션 카드',
      hint: '카드를 클릭하면 설명이 전환됩니다',
      cards: [
        {
          id: 'personalized-ai-tutoring',
          title: 'Personalized AI Tutoring',
          description: '학습 수준과 속도에 맞춰 대화 전략을 조정해, 모든 응답이 실행 가능한 다음 행동으로 이어지게 합니다.',
        },
        {
          id: 'ai-education-transformation',
          title: 'AI × Education Transformation',
          description: 'AI 기반으로 수업 흐름, 평가 논리, 교실 상호작용을 재설계하는 실전 프레임워크를 구축합니다.',
        },
        {
          id: 'learning-analytics',
          title: 'Learning Analytics',
          description: '학습 행동 신호, 성찰 깊이, 참여 품질을 추적 지표로 전환해 수업 의사결정을 지원합니다.',
        },
        {
          id: 'human-ai-collaboration',
          title: 'Human-AI Collaboration',
          description: '교사·학습자·AI의 협업 경계를 탐색하고 인간 중심 원칙을 설계 기준으로 정립합니다.',
        },
      ],
    },
  },
};

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
    subtitle: item.subtitle || '',
    summary: item.summary || item.subtitle || item.description || '',
    description: item.description || item.details || '',
    category: item.category || '',
    type: item.type || '',
    status: item.status || locale.common.detailFallback.status,
    nextAction: item.nextStep || item.nextAction || locale.common.detailFallback.nextAction,
    link: item.link || '',
    tags: item.tags || [],
  };
}

function DetailModal({ detail, locale, uiText, onClose }) {
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
          {detail.subtitle ? (
            <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.subtitle}</div>
          ) : null}
          {(detail.category || detail.type) ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detail.category ? <span className="content-tag">{detail.category}</span> : null}
              {detail.type ? <span className="content-tag">{detail.type}</span> : null}
            </div>
          ) : null}
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
          {detail.description ? (
            <div>
              <div className="label" style={{ marginBottom: 4 }}>
                {uiText.detailDescriptionLabel}
              </div>
              <div style={{ color: 'var(--fg-2)', lineHeight: 1.7 }}>{detail.description}</div>
            </div>
          ) : null}
          {detail.tags.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {detail.tags.map((tag) => (
                <span key={tag} className="content-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
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

function NeuralBackground() {
  return (
    <div className="neural-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="neural-orbits">
          <path d="M-120 470 C 160 260, 510 240, 860 310 C 1160 370, 1500 340, 1620 210" />
          <path d="M-80 730 C 290 580, 690 510, 1100 620 C 1320 680, 1520 720, 1630 610" />
          <path d="M150 120 C 420 200, 700 360, 980 320 C 1230 280, 1430 190, 1620 120" />
          <path d="M10 840 C 320 760, 620 720, 880 760 C 1170 810, 1390 860, 1620 800" />
          <path d="M260 70 C 490 280, 560 560, 470 850" />
          <path d="M1130 50 C 1240 250, 1240 520, 1080 850" />
          <path d="M-120 210 C 140 180, 390 260, 580 470 C 770 680, 1060 760, 1540 760" />
        </g>

        <g className="neural-nodes">
          <circle cx="120" cy="420" r="4" />
          <circle cx="420" cy="260" r="4" />
          <circle cx="630" cy="540" r="5" />
          <circle cx="900" cy="250" r="5" />
          <circle cx="1120" cy="510" r="4" />
          <circle cx="1310" cy="350" r="4" />
          <circle cx="1360" cy="690" r="5" />
          <circle cx="1050" cy="760" r="4" />
          <circle cx="720" cy="760" r="4" />
          <circle cx="450" cy="690" r="4" />
          <circle cx="230" cy="610" r="4" />
          <circle cx="70" cy="770" r="3.5" />
          <circle cx="980" cy="110" r="4" />
        </g>
      </svg>
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
        <button
          onClick={() => {
            scrollToSection('home');
            setIsMobileMenuOpen(false);
          }}
          aria-label="Back to home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
          }}
        >
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </button>

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
            onClick={() => scrollToSection('modules')}
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

function ModulesSection({ content, onOpenDetail }) {
  return (
    <section id="modules" className="section" style={{ borderTop: '1px solid var(--line-1)', scrollMarginTop: 80 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
          — {content.eyebrow}
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
          {content.title}
        </h2>
      </div>

      <div className="container grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 56 }}>
        {content.cards.map((card) => (
          <button
            key={card.id}
            onClick={() =>
              onOpenDetail({
                title: card.title,
                subtitle: card.summary,
                summary: card.purpose,
                status: card.status,
                nextAction: card.future,
                description: card.stage,
                category: content.eyebrow,
                type: 'Module',
                tags: [],
              })
            }
            style={{
              textAlign: 'left',
              borderRadius: 18,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: 18,
              color: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.25s var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.25 }}>{card.title}</div>
              <span className="content-tag">{card.status}</span>
            </div>
            <p style={{ margin: '12px 0 0', color: 'var(--fg-2)', lineHeight: 1.65, fontSize: 14 }}>{card.summary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResearchDirectionsSection({ locale, items, onOpenDetail, navigate, uiText, researchFocusContent }) {
  const [activeFocusId, setActiveFocusId] = useState(researchFocusContent.cards[0]?.id || '');
  const activeFocus =
    researchFocusContent.cards.find((card) => card.id === activeFocusId) || researchFocusContent.cards[0];

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

      <div className="container" style={{ marginTop: 40 }}>
        <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 14 }}>
          — {researchFocusContent.eyebrow}
        </div>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {researchFocusContent.cards.map((card) => {
            const isActive = card.id === activeFocus?.id;
            return (
              <button
                key={card.id}
                onClick={() => setActiveFocusId(card.id)}
                style={{
                  textAlign: 'left',
                  borderRadius: 14,
                  border: '1px solid ' + (isActive ? 'var(--fg-2)' : 'var(--line-1)'),
                  background: isActive ? 'var(--bg-2)' : 'var(--bg-1)',
                  color: 'var(--fg-1)',
                  padding: 14,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.35 }}>{card.title}</div>
              </button>
            );
          })}
        </div>
        {activeFocus ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: '1px solid var(--line-1)',
              background: 'var(--bg-1)',
              padding: 16,
              color: 'var(--fg-2)',
              lineHeight: 1.7,
            }}
          >
            <div className="label" style={{ marginBottom: 8 }}>{researchFocusContent.hint}</div>
            {activeFocus.description}
          </div>
        ) : null}
      </div>

      <div className="container grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 44 }}>
        {items.map((item) => {
          return (
            <article
              key={item.id}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 24,
                color: 'inherit',
                transition: 'all 0.3s var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', lineHeight: 1.6, fontSize: 15 }}>{item.subtitle}</p>
              <p style={{ marginTop: 10, color: 'var(--fg-3)', lineHeight: 1.6, fontSize: 14 }}>{item.summary}</p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '9px 14px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                  {uiText.quickPreview}
                </button>
                <button
                  className="btn btn-gradient"
                  style={{ padding: '9px 14px' }}
                  onClick={() => navigate(toDetailPath('research', item.id))}
                >
                  {uiText.viewDetail}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeSection({ locale, items, onOpenDetail, navigate, uiText }) {
  const [keyword, setKeyword] = useState('');
  const [categoryKey, setCategoryKey] = useState('all');

  const categories = useMemo(() => {
    const keys = Array.from(new Set(items.map((item) => item.category)));
    return [{ key: 'all', label: uiText.allCategory }, ...keys.map((category) => ({ key: category, label: category }))];
  }, [items, uiText.allCategory]);

  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatched = categoryKey === 'all' || item.category === categoryKey;
      if (!categoryMatched) return false;
      if (!lower) return true;
      return `${item.title} ${item.subtitle} ${item.summary} ${item.tags.join(' ')} ${item.category}`
        .toLowerCase()
        .includes(lower);
    });
  }, [categoryKey, items, keyword]);

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
            {categories.map((item) => (
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
              <article
                key={item.id}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  border: '1px solid var(--line-1)',
                  background: 'var(--bg-1)',
                  padding: 20,
                  color: 'inherit',
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
                  {item.category}
                </div>
                <div style={{ marginTop: 12, color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.6 }}>{item.subtitle}</div>
                <div style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 13 }}>{item.tags.join(' · ')}</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                    {uiText.quickPreview}
                  </button>
                  <button
                    className="btn btn-gradient"
                    style={{ padding: '8px 12px' }}
                    onClick={() => navigate(toDetailPath('knowledge', item.id))}
                  >
                    {uiText.viewDetail}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection({ locale, items, onOpenDetail, navigate, uiText }) {
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
        {items.map((item) => {
          return (
            <article
              key={item.id}
              style={{
                textAlign: 'left',
                borderRadius: 20,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 22,
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.2 }}>{item.title}</div>
                <span className="label" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ marginTop: 10, color: 'var(--fg-2)', fontSize: 14 }}>{item.subtitle}</p>
              <p style={{ marginTop: 12, color: 'var(--fg-3)', fontSize: 14, lineHeight: 1.6 }}>{item.summary}</p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => onOpenDetail(createDetailItem(item, locale))}>
                  {uiText.quickPreview}
                </button>
                <button
                  className="btn btn-gradient"
                  style={{ padding: '8px 12px' }}
                  onClick={() => navigate(toDetailPath('projects', item.id))}
                >
                  {uiText.viewDetail}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DataSourceStatusSection() {
  const lastUpdated = new Date().toISOString().slice(0, 10);
  const sourceStatus = getDataSourceStatus();

  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container">
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            borderRadius: 20,
            border: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: '24px clamp(18px, 3vw, 30px)',
          }}
        >
          <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 10 }}>
            NexAeon Data Layer｜資料層狀態
          </div>
          <div style={{ display: 'grid', gap: 10, color: 'var(--fg-2)', lineHeight: 1.8 }}>
            <div>Current Source: {sourceStatus.currentSource}</div>
            <div>Future Source: {sourceStatus.futureSource}</div>
            <div>Status: {sourceStatus.status}</div>
            <div>Last Updated: {lastUpdated}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationRoadmapSection() {
  const phases = [
    'Phase 1：Local Content Layer',
    'Phase 2：Notion Knowledge Database',
    'Phase 3：Airtable Research / Project Tracker',
    'Phase 4：n8n Auto Sync Workflow',
    'Phase 5：AI Agent / RAG Query Layer',
  ];

  return (
    <section className="section" style={{ borderTop: '1px solid var(--line-1)' }}>
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--accent-fg)', marginBottom: 16 }}>
            NexAeon Integration Roadmap｜外部接入路線
          </div>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {phases.map((phase) => (
            <article
              key={phase}
              style={{
                borderRadius: 16,
                border: '1px solid var(--line-1)',
                background: 'var(--bg-1)',
                padding: 18,
                color: 'var(--fg-2)',
                lineHeight: 1.7,
              }}
            >
              {phase}
            </article>
          ))}
        </div>
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

export default function DirectionB({ t, lang, setLang, theme, setTheme, navigate }) {
  const rootRef = useRef(null);
  const locale = INTERACTIVE_CONTENT[lang] || INTERACTIVE_CONTENT.en;
  const uiText = UI_TEXT[lang] || UI_TEXT.en;
  const interactiveContent = CORE_INTERACTION_CONTENT[lang] || CORE_INTERACTION_CONTENT.en;
  const [detail, setDetail] = useState(null);
  const researchItems = useMemo(() => getResearchItems(lang), [lang]);
  const knowledgeItems = useMemo(() => getKnowledgeItems(lang), [lang]);
  const projectItems = useMemo(() => getProjectItems(lang), [lang]);

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
    <div ref={rootRef} className="direction-shell">
      <NeuralBackground />
      <Nav locale={locale} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
      <Hero t={t} />
      <ModulesSection key={`modules-${lang}`} content={interactiveContent.modules} onOpenDetail={setDetail} />
      <ResearchDirectionsSection
        key={`research-${lang}`}
        locale={locale}
        items={researchItems}
        onOpenDetail={setDetail}
        navigate={navigate}
        uiText={uiText}
        researchFocusContent={interactiveContent.researchFocus}
      />
      <KnowledgeSection key={`knowledge-${lang}`} locale={locale} items={knowledgeItems} onOpenDetail={setDetail} navigate={navigate} uiText={uiText} />
      <ProjectsSection key={`projects-${lang}`} locale={locale} items={projectItems} onOpenDetail={setDetail} navigate={navigate} uiText={uiText} />
      <DataSourceStatusSection />
      <IntegrationRoadmapSection />
      <AssistantSection key={`assistant-${lang}`} locale={locale} />
      <ContactSection key={`contact-${lang}`} locale={locale} />
      <Footer t={t} />
      <DetailModal detail={detail} locale={locale} uiText={uiText} onClose={() => setDetail(null)} />
    </div>
  );
}
