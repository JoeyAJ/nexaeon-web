const DETAIL_ROUTE_PATTERN = /^\/(identity|research|teaching|knowledge-lab|projects|field-lab)\/([^/]+)$/;
const ROLE_ROUTE_PATTERN = /^\/(students|researchers|university|enterprise|second-brain)$/;

export function parseRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const roleMatch = normalizedPath.match(ROLE_ROUTE_PATTERN);
  if (roleMatch) {
    return {
      kind: 'role',
      role: roleMatch[1],
    };
  }

  const match = normalizedPath.match(DETAIL_ROUTE_PATTERN);
  if (!match) {
    return { kind: 'home' };
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

export function goBack(fallbackPath = '/') {
  if (getNavigationDepth() > 0) {
    window.history.back();
    return;
  }

  navigateTo(fallbackPath);
}
