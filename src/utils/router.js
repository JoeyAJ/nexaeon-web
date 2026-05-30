const DETAIL_ROUTE_PATTERN = /^\/(research|projects|knowledge)\/([^/]+)$/;
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

export function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));

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
