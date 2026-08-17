import { LEGAL_DOCUMENT_META } from './constants.js';

export function formatLegalEffectiveDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function normalizeAnchorId(text = '') {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function getLegalDocumentMeta(documentKey = '') {
  const normalizedKey = String(documentKey || '')
    .toLowerCase()
    .trim();

  return LEGAL_DOCUMENT_META[normalizedKey] || { title: 'Legal Document', lastUpdated: '' };
}
