const DETAIL_ROUTE_PATTERN = /^\/(research|projects|knowledge)\/([^/]+)$/;

export function parseRoute(pathname) {
  const match = pathname.match(DETAIL_ROUTE_PATTERN);
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
}
