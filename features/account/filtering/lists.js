import { normalizeString } from './shared';

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

function resolveListSortFields(item = {}) {
  return {
    createdAt: new Date(item?.createdAt || 0).getTime(),
    itemsCount: Number(item?.itemsCount || 0),
    likesCount: Number(item?.likesCount || 0),
    reviewsCount: Number(item?.reviewsCount || 0),
    title: normalizeString(item?.title).toLocaleLowerCase(),
    updatedAt: new Date(item?.updatedAt || 0).getTime(),
  };
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
    const leftFields = resolveListSortFields(left);
    const rightFields = resolveListSortFields(right);

    switch (sort) {
      case 'created_desc':
        return (
          rightFields.createdAt - leftFields.createdAt ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'created_asc':
        return (
          leftFields.createdAt - rightFields.createdAt ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'likes_desc':
        return (
          rightFields.likesCount - leftFields.likesCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'reviews_desc':
        return (
          rightFields.reviewsCount - leftFields.reviewsCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'items_desc':
        return (
          rightFields.itemsCount - leftFields.itemsCount ||
          rightFields.updatedAt - leftFields.updatedAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
      case 'title_asc':
        return leftFields.title.localeCompare(rightFields.title) || rightFields.updatedAt - leftFields.updatedAt;
      case 'title_desc':
        return rightFields.title.localeCompare(leftFields.title) || rightFields.updatedAt - leftFields.updatedAt;
      case 'updated_desc':
      default:
        return (
          rightFields.updatedAt - leftFields.updatedAt ||
          rightFields.createdAt - leftFields.createdAt ||
          leftFields.title.localeCompare(rightFields.title)
        );
    }
  });
}
