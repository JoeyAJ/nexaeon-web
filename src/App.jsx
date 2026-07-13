import { useState, useEffect, useMemo, useRef } from 'react';
import './styles.css';
import DirectionB from './components/DirectionB.jsx';
import DemoRuntimePage from './components/DemoRuntimePage.jsx';
import DetailPage from './components/DetailPage.jsx';
import RoleDetailPage from './components/RoleDetailPage.jsx';
import AppErrorBoundary, { getGuardrailCopy, GuardrailStatePage } from './components/AppErrorBoundary.jsx';
import AgentScaffoldPage from './components/AgentScaffoldPage.jsx';
import { Companion } from './components/Companion/index.js';
import PrincessCompanionControls from './components/PrincessCompanionControls.jsx';
import { getAgentByKey } from './data/agentRegistry.js';
import {
  DEFAULT_COMPANION_PREFERENCES,
  getCompanionStorage,
  readCompanionPreferences,
  resetCompanionLayout,
  resetCompanionPreferences,
  updateCompanionPreferences,
} from './lib/companionPreferences.js';
import { createPrincessEventBridge } from './lib/princessEventBridge.ts';
import { createPrincessModuleActivityAdapter } from './lib/princessModuleActivity.ts';
import { hasSeenCompanionIntro } from './lib/companionIntro.js';
import { createNexonFusionOrchestrator } from './lib/nexonFusionOrchestrator.ts';
import { resolvePrincessContext } from './lib/princessContextResolver.js';
import { goBack, markInitialHistoryEntry, navigateTo, parseRoute, replaceCurrentRoute } from './utils/router.js';

const BACK_TO_TOP_TEXT = {
  zh: '回到頂部',
  en: 'Back to top',
  ko: '맨 위로',
};

const INTRO_SEEN_KEY = 'nexaeon_intro_seen';

function suppressIntroReplay() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // Navigation should still work if storage is unavailable.
  }
}

function BackToTopButton({ lang }) {
  const label = BACK_TO_TOP_TEXT[lang] || BACK_TO_TOP_TEXT.en;

  return (
    <button
      className="back-to-top-btn"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}

export default function App() {
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState('dark');
  const [companionSettings, setCompanionSettings] = useState(() => (
    readCompanionPreferences(getCompanionStorage(window), {
      viewport: { width: window.innerWidth, height: window.innerHeight },
    })
  ));
  const [resetPositionToken, setResetPositionToken] = useState(0);
  const [resetSizeToken, setResetSizeToken] = useState(0);
  const [route, setRoute] = useState(() => ({
    ...parseRoute(window.location.pathname),
    hash: window.location.hash,
  }));
  const [companionIntroActive, setCompanionIntroActive] = useState(() => (
    parseRoute(window.location.pathname).kind === 'home'
    && !hasSeenCompanionIntro(window.sessionStorage)
  ));
  const princessEventBridge = useMemo(() => createPrincessEventBridge({ debug: import.meta.env.DEV }), []);
  const navigatorActivity = useMemo(() => createPrincessModuleActivityAdapter(princessEventBridge, 'navigator'), [princessEventBridge]);
  const nexonFusionOrchestrator = useMemo(() => createNexonFusionOrchestrator({
    eventBridge: princessEventBridge,
    debug: import.meta.env.DEV,
  }), [princessEventBridge]);
  const previousLangRef = useRef(lang);
  const previousThemeRef = useRef(theme);
  const previousRouteKeyRef = useRef('');
  const previousCompanionModuleRef = useRef(companionSettings.lastModule);
  const preferencesWriteTimeoutRef = useRef(null);
  const pendingPreferencesPatchRef = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (previousThemeRef.current !== theme && companionSettings.visible && companionSettings.autoBehavior) {
      princessEventBridge.emit({ type: 'theme_change', key: theme });
    }
    previousThemeRef.current = theme;
  }, [companionSettings.autoBehavior, companionSettings.visible, princessEventBridge, theme]);

  useEffect(() => {
    if (previousLangRef.current !== lang && companionSettings.visible && companionSettings.autoBehavior) {
      princessEventBridge.emit({ type: 'language_change', key: lang });
    }
    previousLangRef.current = lang;
  }, [companionSettings.autoBehavior, companionSettings.visible, lang, princessEventBridge]);

  useEffect(() => {
    markInitialHistoryEntry();

    const onPopState = () => {
      setRoute({
        ...parseRoute(window.location.pathname),
        hash: window.location.hash,
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (route.kind === 'redirect' && route.replace && route.to) {
      suppressIntroReplay();
      replaceCurrentRoute(route.to);
      return;
    }

    if (route.kind === 'home' && window.location.hash) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [route.kind, route.type, route.id, route.role, route.slug, route.replace, route.to]);

  const navigate = (path, options) => {
    navigateTo(path, options);
    setRoute({
      ...parseRoute(window.location.pathname),
      hash: window.location.hash,
    });
  };

  const navigateBack = (fallbackPath) => {
    goBack(fallbackPath);
  };

  const goHome = () => {
    suppressIntroReplay();
    navigate('/');
  };

  const invalidRouteCopy = getGuardrailCopy(lang);
  const companionNavigationKey = [
    route.kind,
    route.type,
    route.id,
    route.role,
    route.slug,
    route.key,
    route.hash,
  ].filter(Boolean).join(':');
  const princessContext = useMemo(() => resolvePrincessContext({
    pathname: window.location.pathname,
    routeKey: companionNavigationKey,
    locale: lang,
  }), [companionNavigationKey, lang]);

  useEffect(() => {
    princessEventBridge.setContextProfile(princessContext.profile);
  }, [princessContext.id, princessContext.profile, princessEventBridge]);

  useEffect(() => {
    if (!companionSettings.visible || !companionSettings.autoBehavior) return undefined;
    const currentRouteKey = companionNavigationKey || 'home';
    if (previousRouteKeyRef.current && previousRouteKeyRef.current !== currentRouteKey) {
      princessEventBridge.emit({ type: 'route_leave', key: previousRouteKeyRef.current });
    }

    const moduleId = route.kind === 'detail'
      ? route.type
      : route.kind === 'home' && route.hash
        ? route.hash.replace(/^#/, '')
        : null;

    if (moduleId) {
      princessEventBridge.emit({ type: 'module_enter', moduleId, key: currentRouteKey });
    }
    if (route.kind === 'detail' || route.kind === 'demoRuntime' || route.kind === 'role') {
      princessEventBridge.emit({ type: 'subpage_enter', key: currentRouteKey });
    }
    previousRouteKeyRef.current = currentRouteKey;

    const milestones = new Set();
    let frame = 0;
    const checkScroll = () => {
      frame = 0;
      if (document.hidden) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = window.scrollY / scrollable;
      if (progress >= 0.5 && !milestones.has('half')) {
        milestones.add('half');
        princessEventBridge.emit({ type: 'scroll_milestone', milestone: 'half', key: `${currentRouteKey}:half` });
      }
      if (progress >= 0.96 && !milestones.has('bottom')) {
        milestones.add('bottom');
        princessEventBridge.emit({ type: 'scroll_milestone', milestone: 'bottom', key: `${currentRouteKey}:bottom` });
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(checkScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [companionNavigationKey, companionSettings.autoBehavior, companionSettings.visible, princessEventBridge, route.hash, route.kind, route.type]);

  useEffect(() => {
    const moduleId = princessContext.profile?.id || companionNavigationKey || 'home';
    if (previousCompanionModuleRef.current === moduleId) return;
    previousCompanionModuleRef.current = moduleId;
    updateCompanionPreferences(getCompanionStorage(window), { lastModule: moduleId });
  }, [companionNavigationKey, princessContext.profile?.id]);

  useEffect(() => {
    const flushPreferences = () => {
      if (!Object.keys(pendingPreferencesPatchRef.current).length) return;
      updateCompanionPreferences(getCompanionStorage(window), pendingPreferencesPatchRef.current);
      pendingPreferencesPatchRef.current = {};
    };
    window.addEventListener('pagehide', flushPreferences);
    return () => {
      window.removeEventListener('pagehide', flushPreferences);
      if (preferencesWriteTimeoutRef.current) window.clearTimeout(preferencesWriteTimeoutRef.current);
      flushPreferences();
    };
  }, []);

  const updateCompanionSetting = (key, value) => {
    if (!(key in DEFAULT_COMPANION_PREFERENCES) || ['version', 'position', 'updatedAt'].includes(key)) return;

    setCompanionSettings((current) => {
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });

    if (preferencesWriteTimeoutRef.current) window.clearTimeout(preferencesWriteTimeoutRef.current);
    pendingPreferencesPatchRef.current = { ...pendingPreferencesPatchRef.current, [key]: value };
    preferencesWriteTimeoutRef.current = window.setTimeout(() => {
      preferencesWriteTimeoutRef.current = null;
      updateCompanionPreferences(getCompanionStorage(window), pendingPreferencesPatchRef.current);
      pendingPreferencesPatchRef.current = {};
    }, 180);
  };

  const resetCompanionPositionAndSize = () => {
    if (preferencesWriteTimeoutRef.current) window.clearTimeout(preferencesWriteTimeoutRef.current);
    preferencesWriteTimeoutRef.current = null;
    if (Object.keys(pendingPreferencesPatchRef.current).length) {
      updateCompanionPreferences(getCompanionStorage(window), pendingPreferencesPatchRef.current);
    }
    pendingPreferencesPatchRef.current = {};
    const next = resetCompanionLayout(getCompanionStorage(window));
    setCompanionSettings((current) => ({ ...current, position: next.position, scale: next.scale }));
    setResetPositionToken((current) => current + 1);
    setResetSizeToken((current) => current + 1);
  };

  const resetAllCompanionSettings = () => {
    if (preferencesWriteTimeoutRef.current) window.clearTimeout(preferencesWriteTimeoutRef.current);
    preferencesWriteTimeoutRef.current = null;
    pendingPreferencesPatchRef.current = {};
    const next = resetCompanionPreferences(getCompanionStorage(window));
    setCompanionSettings(next);
    setResetPositionToken((current) => current + 1);
    setResetSizeToken((current) => current + 1);
  };

  return (
    <div className="app-shell">
      <AppErrorBoundary
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        navigate={navigate}
      >
        {route.kind === 'demoRuntime' ? (
          <DemoRuntimePage
            slug={route.slug}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
          />
        ) : route.kind === 'detail' ? (
          <DetailPage
            type={route.type}
            id={route.id}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            navigateBack={navigateBack}
            princessEventBridge={princessEventBridge}
            navigatorActivity={navigatorActivity}
            nexonFusionOrchestrator={nexonFusionOrchestrator}
          />
        ) : route.kind === 'role' ? (
          <RoleDetailPage role={route.role} navigate={navigate} navigateBack={navigateBack} lang={lang} setLang={setLang} />
        ) : route.kind === 'agentScaffold' ? (
          <AgentScaffoldPage
            agent={getAgentByKey(route.key)}
            navigate={navigate}
            navigateBack={navigateBack}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
          />
        ) : route.kind === 'invalid' || route.kind === 'redirect' ? (
          <GuardrailStatePage
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            title={invalidRouteCopy.notFoundTitle}
            body={invalidRouteCopy.notFoundBody}
            primaryLabel={invalidRouteCopy.backPrevious}
            secondaryLabel={invalidRouteCopy.backHome}
            onPrimary={() => navigateBack('/')}
            onSecondary={goHome}
            testId="not-found-route"
          />
        ) : (
          <DirectionB
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            navigate={navigate}
            playIntro={companionIntroActive}
            onIntroComplete={() => setCompanionIntroActive(false)}
          />
        )}
      </AppErrorBoundary>
      <Companion
        lang={lang}
        navigationKey={companionNavigationKey}
        visible={companionSettings.visible}
        autoBehaviorEnabled={companionSettings.autoBehavior && !companionIntroActive}
        proactiveBubblesEnabled={companionSettings.proactiveBubbles}
        accessoriesEnabled={companionSettings.accessoriesEnabled}
        interactionEnabled={companionSettings.interactionEnabled && !companionIntroActive}
        motionLevel={companionSettings.motionLevel}
        preferredScale={companionSettings.scale}
        onScaleChange={(scale) => setCompanionSettings((current) => ({ ...current, scale }))}
        introActive={companionIntroActive}
        resetPositionToken={resetPositionToken}
        resetSizeToken={resetSizeToken}
        eventBridge={princessEventBridge}
        contextProfile={princessContext.profile}
      />
      <PrincessCompanionControls
        lang={lang}
        settings={companionSettings}
        onSettingChange={updateCompanionSetting}
        onResetLayout={resetCompanionPositionAndSize}
        onResetAll={resetAllCompanionSettings}
      />
      <BackToTopButton lang={lang} />
    </div>
  );
}
