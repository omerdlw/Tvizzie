import { normalizeString } from '../shared';

export const LIST_FILTER_QUERY_KEYS = Object.freeze(['lsort']);

export const LIST_SORT_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Recently Updated', value: 'updated_desc' }),
  Object.freeze({ label: 'Recently Created', value: 'created_desc' }),
  Object.freeze({ label: 'Oldest Created', value: 'created_asc' }),
  Object.freeze({ label: 'Most Liked', value: 'likes_desc' }),
  Object.freeze({ label: 'Most Reviewed', value: 'reviews_desc' }),
  Object.freeze({ label: 'Most Items', value: 'items_desc' }),
  Object.freeze({ label: 'Title (A-Z)', value: 'title_asc' }),
  Object.freeze({ label: 'Title (Z-A)', value: 'title_desc' }),
]);

const LIST_SORT_VALUE_SET = new Set(LIST_SORT_OPTIONS.map((option) => option.value));

const DEFAULT_LIST_FILTERS = Object.freeze({
  sort: 'updated_desc',
});

function normalizeListSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return LIST_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_LIST_FILTERS.sort;
}

export function parseListFilters(searchParams) {
  return {
    sort: normalizeListSort(searchParams?.get?.('lsort')),
  };
}

export function toListQueryValues(filters = DEFAULT_LIST_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_LIST_FILTERS,
    ...(filters || {}),
  };

  if (normalizedFilters.sort === DEFAULT_LIST_FILTERS.sort) {
    return {};
  }

  return {
    lsort: normalizedFilters.sort,
  };
}

export function hasActiveListFilters(filters = DEFAULT_LIST_FILTERS) {
  return normalizeListSort(filters?.sort) !== DEFAULT_LIST_FILTERS.sort;
}

export function sortProfileLists(items = [], sort = DEFAULT_LIST_FILTERS.sort) {
  const sourceItems = Array.isArray(items) ? items : [];

  return [...sourceItems].sort((left, right) => {
    const leftUpdatedAt = new Date(left?.updatedAt || 0).getTime();
    const rightUpdatedAt = new Date(right?.updatedAt || 0).getTime();
    const leftCreatedAt = new Date(left?.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right?.createdAt || 0).getTime();
    const leftTitle = normalizeString(left?.title).toLocaleLowerCase();
    const rightTitle = normalizeString(right?.title).toLocaleLowerCase();
    const leftLikes = Number(left?.likesCount || 0);
    const rightLikes = Number(right?.likesCount || 0);
    const leftReviews = Number(left?.reviewsCount || 0);
    const rightReviews = Number(right?.reviewsCount || 0);
    const leftItemsCount = Number(left?.itemsCount || 0);
    const rightItemsCount = Number(right?.itemsCount || 0);

    switch (sort) {
      case 'created_desc':
        return rightCreatedAt - leftCreatedAt || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'created_asc':
        return leftCreatedAt - rightCreatedAt || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'likes_desc':
        return rightLikes - leftLikes || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'reviews_desc':
        return rightReviews - leftReviews || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'items_desc':
        return (
          rightItemsCount - leftItemsCount || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle)
        );
      case 'title_asc':
        return leftTitle.localeCompare(rightTitle) || rightUpdatedAt - leftUpdatedAt;
      case 'title_desc':
        return rightTitle.localeCompare(leftTitle) || rightUpdatedAt - leftUpdatedAt;
      case 'updated_desc':
      default:
        return rightUpdatedAt - leftUpdatedAt || rightCreatedAt - leftCreatedAt || leftTitle.localeCompare(rightTitle);
    }
  });
}
