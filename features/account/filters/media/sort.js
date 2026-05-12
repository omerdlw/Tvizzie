import { DEFAULT_MEDIA_FILTERS } from './options';
import { buildHash } from '../shared';
import { resolveAddedTime, resolveMediaTitle, resolveReleaseTime, toMediaKey } from './identity';
import { resolveAverageRating, resolvePopularity } from './values';

export function sortMediaItems(items = [], sort = DEFAULT_MEDIA_FILTERS.sort) {
  const decorated = items.map((item, index) => ({
    averageRating: resolveAverageRating(item),
    index,
    item,
    title: resolveMediaTitle(item).toLocaleLowerCase(),
  }));

  decorated.sort((left, right) => {
    switch (sort) {
      case 'release_asc': {
        const diff = resolveReleaseTime(left.item) - resolveReleaseTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_desc': {
        const diff = resolveAddedTime(right.item) - resolveAddedTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_asc': {
        const diff = resolveAddedTime(left.item) - resolveAddedTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'average_desc': {
        const leftRating = left.averageRating === null ? -1 : left.averageRating;
        const rightRating = right.averageRating === null ? -1 : right.averageRating;
        const diff = rightRating - leftRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'average_asc': {
        const leftRating = left.averageRating === null ? 10 : left.averageRating;
        const rightRating = right.averageRating === null ? 10 : right.averageRating;
        const diff = leftRating - rightRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'title_asc': {
        const diff = left.title.localeCompare(right.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'title_desc': {
        const diff = right.title.localeCompare(left.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'popularity_desc': {
        const diff = resolvePopularity(right.item) - resolvePopularity(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'shuffle': {
        const leftHash = buildHash(toMediaKey(left.item) || String(left.index));
        const rightHash = buildHash(toMediaKey(right.item) || String(right.index));
        const diff = leftHash - rightHash;
        if (diff !== 0) return diff;
        break;
      }
      case 'release_desc':
      default: {
        const diff = resolveReleaseTime(right.item) - resolveReleaseTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title);
    }

    return left.index - right.index;
  });

  return decorated.map((entry) => entry.item);
}
