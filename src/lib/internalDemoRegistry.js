export const internalDemoRegistry = Object.freeze({
  // slug: React component
});

export function getInternalDemoComponent(slug) {
  return internalDemoRegistry[String(slug || '').trim()] || null;
}
