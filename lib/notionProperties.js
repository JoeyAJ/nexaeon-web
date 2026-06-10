export function getPlainText(richText = []) {
  if (!Array.isArray(richText)) return '';
  return richText.map((part) => part?.plain_text || '').join('').trim();
}

function normalizePropertyName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_\-｜|/]+/g, '');
}

export function findProperty(properties, names, preferredTypes = []) {
  const entries = Object.entries(properties || {});
  const normalizedNames = names.map(normalizePropertyName);

  for (const name of names) {
    const property = properties?.[name];
    if (property) return property;
  }

  for (const [propertyName, property] of entries) {
    if (normalizedNames.includes(normalizePropertyName(propertyName))) return property;
  }

  for (const preferredType of preferredTypes) {
    const match = entries.find(([, property]) => property?.type === preferredType);
    if (match) return match[1];
  }

  return null;
}

export function getPropertyText(property) {
  if (!property) return '';
  if (property.type === 'title') return getPlainText(property.title);
  if (property.type === 'rich_text') return getPlainText(property.rich_text);
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  if (property.type === 'number') return String(property.number ?? '');
  if (property.type === 'checkbox') return property.checkbox ? 'true' : 'false';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'created_time') return property.created_time || '';
  if (property.type === 'last_edited_time') return property.last_edited_time || '';
  if (property.type === 'url') return property.url || '';
  if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean).join(', ');
  if (property.type === 'people') return property.people.map((person) => person.name || person.id).filter(Boolean).join(', ');
  if (property.type === 'relation') return String(property.relation?.length ?? 0);
  if (property.type === 'files') {
    return (property.files || [])
      .map((file) => file?.file?.url || file?.external?.url || file?.name)
      .filter(Boolean)
      .join(', ');
  }
  if (property.type === 'formula') {
    if (property.formula?.type === 'string') return property.formula.string || '';
    if (property.formula?.type === 'number') return String(property.formula.number ?? '');
    if (property.formula?.type === 'date') return property.formula.date?.start || '';
    if (property.formula?.type === 'boolean') return property.formula.boolean ? 'true' : 'false';
  }

  return '';
}

function splitListText(value) {
  return String(value)
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getTitle(properties, names) {
  const property = findProperty(properties, names, ['title']);
  if (!property) return '';
  if (property.type === 'title') return getPlainText(property.title);
  return getPropertyText(property);
}

export function getText(properties, names, preferredTypes = []) {
  return getPropertyText(findProperty(properties, names, preferredTypes));
}

export function getSelect(properties, names) {
  const property = findProperty(properties, names, ['select']);
  if (!property) return '';
  if (property.type === 'select') return property.select?.name || '';
  return getPropertyText(property);
}

export function getStatus(properties, names) {
  const property = findProperty(properties, names, ['status']);
  if (!property) return '';
  if (property.type === 'status') return property.status?.name || '';
  return getPropertyText(property);
}

export function getMultiSelect(properties, names) {
  const property = findProperty(properties, names, ['multi_select']);
  if (!property) return [];
  if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean);
  if (property.type === 'people') return property.people.map((person) => person.name || person.id).filter(Boolean);
  if (property.type === 'relation') return property.relation.map((item) => item.id).filter(Boolean);

  const text = getPropertyText(property);
  if (property.type === 'select' || property.type === 'status') return text ? [text] : [];
  if (property.type === 'rich_text' || property.type === 'title') return splitListText(text);
  if (property.type === 'number' || property.type === 'date' || property.type === 'created_time' || property.type === 'last_edited_time' || property.type === 'formula' || property.type === 'checkbox') {
    return text ? [text] : [];
  }

  return [];
}

export function getNumber(properties, names, fallback = null) {
  const property = findProperty(properties, names, ['number']);
  if (!property) return fallback;
  if (property.type === 'number') return property.number ?? fallback;

  const text = getPropertyText(property);
  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getCheckbox(properties, names) {
  const property = findProperty(properties, names, ['checkbox']);
  if (!property) return false;
  if (property.type === 'checkbox') return Boolean(property.checkbox);
  return getPropertyText(property).toLowerCase() === 'true';
}

export function getDate(properties, names) {
  const property = findProperty(properties, names, ['date', 'created_time', 'last_edited_time']);
  if (!property) return '';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'created_time') return property.created_time || '';
  if (property.type === 'last_edited_time') return property.last_edited_time || '';
  return getPropertyText(property);
}

export function getUrl(properties, names) {
  const property = findProperty(properties, names, ['url', 'files']);
  if (!property) return '';
  if (property.type === 'url') return property.url || '';
  if (property.type === 'files') return getFiles(properties, names)[0] || '';
  return getPropertyText(property);
}

export function getFiles(properties, names) {
  const property = findProperty(properties, names, ['files']);
  if (!property) return [];
  if (property.type !== 'files') {
    const text = getPropertyText(property);
    return text ? [text] : [];
  }

  return (property.files || [])
    .map((file) => file?.file?.url || file?.external?.url || '')
    .filter(Boolean);
}

export function getRelationCount(properties, names) {
  const property = findProperty(properties, names, ['relation']);
  if (!property) return 0;
  if (property.type === 'relation') return property.relation?.length ?? 0;

  const parsed = Number(getPropertyText(property));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compactList(values) {
  return values.flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}
