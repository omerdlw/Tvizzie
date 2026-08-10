import 'server-only';

import { cache } from 'react';
import * as cheerio from 'cheerio';

const AWARDS_REVALIDATE_SECONDS = 60 * 60 * 24;
const AWARDS_TIMEOUT_MS = 10_000;
const PERSON_ID_PATTERN = /^\d+$/;
const TMDB_AWARDS_URL = 'https://www.themoviedb.org/person';

function createEmptyAwards() {
  return {
    organizations: [],
    stats: {
      totalNominations: 0,
      totalWins: 0,
    },
  };
}

function getAwardYear(ceremony, fallbackYear) {
  const match = ceremony.match(/\((\d{4})\)/);
  return match?.[1] || fallbackYear || '—';
}

function getAwardProject($, item) {
  const projectLink = $(item).find('a[href^="/movie/"], a[href^="/tv/"]').first();
  const href = projectLink.attr('href') || '';
  const match = href.match(/^\/(movie|tv)\/(\d+)/);
  const image = projectLink.find('img.poster').first();

  return {
    mediaType: match?.[1] || null,
    poster: image.attr('src') || null,
    project: image.attr('alt') || projectLink.attr('title') || null,
    projectId: match?.[2] || null,
  };
}

function getAwardType($, item) {
  const type = $(item).find('span.rounded-md').first().text().trim();
  return /win|kazand/i.test(type) ? 'Win' : 'Nominee';
}

function getOrganizationAwards($, element) {
  const organization = $(element);
  const titleLink = organization.find('.font-semibold.leading-9.text-xl a').first();
  const title = titleLink.text().trim();

  if (!title) return null;

  const logo = organization.find('img.logo').first().attr('src') || null;
  const yearsByValue = new Map();

  organization.find('.divide-y > div').each((_, item) => {
    const ceremonyLink = $(item).find('a[href*="/ceremony/"]').first();
    const categoryLink = $(item).find('a[href*="/category/"]').first();
    const ceremony = ceremonyLink.text().trim();
    const category = categoryLink.text().trim();

    if (!ceremony || !category) return;

    const year = getAwardYear(ceremony, $(item).find('p.md\\:text-right.font-bold').text().trim());
    const categories = yearsByValue.get(year) || [];
    categories.push({
      category,
      key: `${ceremonyLink.attr('href') || categoryLink.attr('href')}-${categories.length}`,
      type: getAwardType($, item),
      ...getAwardProject($, item),
    });
    yearsByValue.set(year, categories);
  });

  const years = Array.from(yearsByValue, ([year, categories]) => ({
    categories,
    year,
  })).sort((left, right) => right.year.localeCompare(left.year));

  return years.length
    ? {
        id: titleLink.attr('href') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        logo,
        title,
        years,
      }
    : null;
}

function createAwardsPayload(html) {
  const $ = cheerio.load(html);
  const organizations = $('.space-y-12 > div')
    .toArray()
    .map((element) => getOrganizationAwards($, element))
    .filter(Boolean);
  const entries = organizations.flatMap((organization) =>
    organization.years.flatMap((year) => year.categories),
  );

  return {
    organizations,
    stats: {
      totalNominations: entries.filter((entry) => entry.type === 'Nominee').length,
      totalWins: entries.filter((entry) => entry.type === 'Win').length,
    },
  };
}

async function fetchTmdbAwards(personId) {
  const response = await fetch(`${TMDB_AWARDS_URL}/${personId}/awards?language=en-US`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Tvizzie/1.0 (+https://tvizzie.com)',
    },
    next: {
      revalidate: AWARDS_REVALIDATE_SECONDS,
      tags: [`person-awards:${personId}`],
    },
    signal: AbortSignal.timeout(AWARDS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`TMDB awards request failed with status ${response.status}`);
  }

  return response.text();
}

export const getPersonAwards = cache(async (personId) => {
  const normalizedPersonId = String(personId || '').trim();
  if (!PERSON_ID_PATTERN.test(normalizedPersonId)) return createEmptyAwards();

  return createAwardsPayload(await fetchTmdbAwards(normalizedPersonId));
});
