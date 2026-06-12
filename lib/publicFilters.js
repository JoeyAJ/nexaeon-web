import { findProperty, getPropertyText } from './notionProperties.js';

export const PUBLIC_STATUS_FIELD_NAMES = ['公開狀態', 'Public Status', 'Status'];

export function isPublishedNotionPage(page, names = PUBLIC_STATUS_FIELD_NAMES) {
  const property = findProperty(page?.properties || {}, names);
  if (!property || (property.type !== 'select' && property.type !== 'status')) return false;
  return getPropertyText(property) === 'Published';
}

export function isPublicAirtableVisibility(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value.name === 'Public';
  }

  return value === 'Public';
}
