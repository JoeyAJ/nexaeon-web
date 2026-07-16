import { findProperty, getPropertyText } from './notionProperties.js';
import { isPublishedVisibility } from './content/visibility.js';

export const PUBLIC_STATUS_FIELD_NAMES = ['公開狀態', 'Public Status', 'Status'];

export function isPublishedNotionPage(page, names = PUBLIC_STATUS_FIELD_NAMES) {
  const property = findProperty(page?.properties || {}, names);
  if (!property || (property.type !== 'select' && property.type !== 'status')) return false;
  return isPublishedVisibility(getPropertyText(property));
}

export function isPublicAirtableVisibility(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return isPublishedVisibility(value.name);
  }

  return isPublishedVisibility(value);
}
