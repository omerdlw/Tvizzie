const ACCOUNT_SKELETON_ROUTE_VARIANTS = Object.freeze([
  { pattern: /\/lists\/[^/]+(?:\/)?$/, variant: 'list-detail' },
  { pattern: /\/activity(?:\/)?$/, variant: 'activity' },
  { pattern: /\/likes(?:\/)?$/, variant: 'collection' },
  { pattern: /\/lists(?:\/)?$/, variant: 'lists' },
  { pattern: /\/reviews(?:\/)?$/, variant: 'reviews' },
  { pattern: /\/watched(?:\/)?$/, variant: 'collection' },
  { pattern: /\/watchlist(?:\/)?$/, variant: 'collection' },
]);

export function resolveAccountSkeletonVariant(pathname = '') {
  const normalizedPathname = String(pathname || '').split('?')[0];
  return ACCOUNT_SKELETON_ROUTE_VARIANTS.find((item) => item.pattern.test(normalizedPathname))?.variant || 'overview';
}
