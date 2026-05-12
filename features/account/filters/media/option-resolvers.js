import { BASE_GENRE_OPTIONS, GENRE_VALUE_TO_LABEL, MEDIA_SORT_GROUPS } from './options';
import { collectGenreValues, collectServiceValues } from './values';

function toDisplayLabel(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function collectMediaGenreOptions(items = []) {
  const discovered = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectGenreValues(item).forEach((genreValue) => discovered.add(genreValue));
  });

  if (discovered.size === 0) {
    return [{ label: 'Any genre', value: 'all' }];
  }

  const options = [...discovered]
    .filter(Boolean)
    .map((value) => ({
      label: GENRE_VALUE_TO_LABEL[value] || toDisplayLabel(value),
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any genre', value: 'all' }, ...options];
}

export function getAllMediaGenreOptions() {
  return [{ label: 'Any genre', value: 'all' }, ...BASE_GENRE_OPTIONS];
}

export function resolveMediaSortOption(value) {
  for (const group of MEDIA_SORT_GROUPS) {
    const option = group.options.find((entry) => entry.value === value);

    if (option) {
      return {
        ...option,
        groupLabel: group.label,
      };
    }
  }

  return null;
}

export function collectMediaServiceOptions(items = []) {
  const labels = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectServiceValues(item).forEach((serviceValue) => {
      if (!serviceValue || labels.has(serviceValue)) {
        return;
      }

      labels.set(serviceValue, toDisplayLabel(serviceValue));
    });
  });

  const options = [...labels.entries()]
    .map(([value, label]) => ({
      label,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any service', value: 'all' }, ...options];
}

export function getDecadeOptions(minDecade = 1870) {
  const currentYear = new Date().getUTCFullYear();
  const currentDecade = currentYear - (currentYear % 10);
  const options = [];

  for (let decade = currentDecade; decade >= minDecade; decade -= 10) {
    options.push({
      label: `${decade}s`,
      value: String(decade),
    });
  }

  return [{ label: 'Any decade', value: 'all' }, ...options];
}
