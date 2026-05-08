import { SEARCH_GRID } from '@/features/search/constants';

export function dedupeResults(items = []) {
  const seen = new Set();
  const deduped = [];

  items.forEach((item) => {
    const key = `${item?.media_type || 'unknown'}-${item?.id || 'unknown'}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(item);
  });

  return deduped;
}

export function getSearchGridBatchSize(width) {
  if (width >= SEARCH_GRID.DESKTOP_BREAKPOINT) {
    return SEARCH_GRID.DESKTOP_COLUMNS * SEARCH_GRID.DESKTOP_ROWS;
  }

  return SEARCH_GRID.MOBILE_COLUMNS * SEARCH_GRID.MOBILE_ROWS;
}
