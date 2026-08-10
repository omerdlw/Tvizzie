// ============================================================
// Legal Domain Utilities
// ============================================================

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

  const META = {
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: '2026-01-01',
    },
    terms: {
      title: 'Terms of Service',
      lastUpdated: '2026-01-01',
    },
  };

  return META[normalizedKey] || { title: 'Legal Document', lastUpdated: '' };
}
