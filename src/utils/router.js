import { NAVIGATOR_AGENT } from '../data/agentBrands.js';
import { getAgentByRoute } from '../data/agentRegistry.js';

const DETAIL_ROUTE_PATTERN = /^\/(identity|research|teaching|knowledge-lab|projects|field-lab)\/([^/]+)$/;
const DEMO_RUNTIME_ROUTE_PATTERN = /^\/projects\/module-demos\/([^/]+)$/;
const ROLE_ROUTE_PATTERN = /^\/(students|researchers|university|enterprise|second-brain)$/;

export function parseRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/') {
    return { kind: 'home' };
  }

  if (NAVIGATOR_AGENT.legacyRoutes.includes(normalizedPath)) {
    return {
      kind: 'redirect',
      to: NAVIGATOR_AGENT.route,
      replace: true,
    };
  }

  const agentRoute = getAgentByRoute(normalizedPath);
  if (agentRoute && agentRoute.key !== 'navigator') {
    return {
      kind: 'agentScaffold',
      key: agentRoute.key,
    };
  }

  const roleMatch = normalizedPath.match(ROLE_ROUTE_PATTERN);
  if (roleMatch) {
    return {
      kind: 'role',
      role: roleMatch[1],
    };
  }

  const runtimeMatch = normalizedPath.match(DEMO_RUNTIME_ROUTE_PATTERN);
  if (runtimeMatch) {
    return {
      kind: 'demoRuntime',
      slug: decodeURIComponent(runtimeMatch[1]),
    };
  }

  const match = normalizedPath.match(DETAIL_ROUTE_PATTERN);
  if (!match) {
    return {
      kind: 'invalid',
      path: normalizedPath,
    };
  }

  return {
    kind: 'detail',
    type: match[1],
    id: decodeURIComponent(match[2]),
  };
}

export function toDetailPath(type, id) {
  return `/${type}/${encodeURIComponent(id)}`;
}

export function toDemoRuntimePath(slug) {
  return `/projects/module-demos/${encodeURIComponent(slug)}`;
}

function getCurrentPath() {
  return `${window.location.pathname}${window.location.hash}`;
}

function getNavigationDepth() {
  return Number(window.history.state?.nexaeonDepth || 0);
}

export function markInitialHistoryEntry() {
  if (window.history.state?.nexaeonEntry) return;

  window.history.replaceState(
    {
      ...(window.history.state || {}),
      nexaeonEntry: true,
      nexaeonDepth: 0,
    },
    '',
    getCurrentPath(),
  );
}

export function navigateTo(path, options = {}) {
  const { scroll = true } = options;
  const nextState = {
    nexaeonEntry: true,
    nexaeonDepth: getNavigationDepth() + 1,
  };

  if (getCurrentPath() === path) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.history.pushState(nextState, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));

  if (!scroll) return;

  const [pathnamePart, hashPart] = path.split('#');
  if (hashPart && (pathnamePart === '' || pathnamePart === '/')) {
    requestAnimationFrame(() => {
      const target = document.getElementById(decodeURIComponent(hashPart));
      if (!target) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return;
  }

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
}

export function replaceCurrentRoute(path) {
  window.history.replaceState(
    {
      ...(window.history.state || {}),
      nexaeonEntry: true,
      nexaeonDepth: getNavigationDepth(),
    },
    '',
    path,
  );
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function goBack(fallbackPath = '/') {
  if (getNavigationDepth() > 0) {
    window.history.back();
    return;
  }

  navigateTo(fallbackPath);
}
