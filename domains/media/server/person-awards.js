'use server';

import { cache } from 'react';

const AWARDS_REVALIDATE_SECONDS = 60 * 60 * 24;
const AWARDS_TIMEOUT_MS = 10_000;
const PERSON_ID_PATTERN = /^\d+$/;
const TMDB_BASE_URL = 'https://www.themoviedb.org';
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

function decodeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanText(str) {
  if (!str) return '';
  return decodeHtml(
    str
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function normalizeImageUrl(src) {
  if (!src) return null;
  let value = String(src).trim();
  if (!value) return null;
  if (value.startsWith('//')) {
    value = `https:${value}`;
  } else if (value.startsWith('/')) {
    value = `${TMDB_BASE_URL}${value}`;
  }
  // Ensure original full-resolution image from TMDB CDN
  value = value.replace(/\/t\/p\/(?:w\d+[^/]*|h\d+[^/]*)\//i, '/t/p/original/');
  return value;
}

function createAwardsPayload(rawHtml) {
  if (!rawHtml) return createEmptyAwards();

  const spaceY12Index = rawHtml.indexOf('space-y-12');
  if (spaceY12Index === -1) return createEmptyAwards();
  const mainHtml = rawHtml.slice(spaceY12Index);

  const titleRegex =
    /<div class="[^"]*font-semibold leading-9 text-xl[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  const titleMatches = [];
  while ((match = titleRegex.exec(mainHtml)) !== null) {
    titleMatches.push({
      index: match.index,
      href: match[1],
      title: cleanText(match[2]),
    });
  }

  const organizations = [];
  for (let i = 0; i < titleMatches.length; i++) {
    const cur = titleMatches[i];
    const nextIndex = i + 1 < titleMatches.length ? titleMatches[i + 1].index : mainHtml.length;
    const prevBlock = mainHtml.substring(i === 0 ? 0 : titleMatches[i - 1].index, cur.index);
    const orgChunk = mainHtml.substring(cur.index, nextIndex);

    const logoMatches = [
      ...prevBlock.matchAll(
        /<img[^>]+class="[^"]*logo[^"]*"[^>]+(?:src|data-src)="([^"]+)"|<img[^>]+(?:src|data-src)="([^"]+)"[^>]+class="[^"]*logo[^"]*"/gi,
      ),
    ];
    let logo = null;
    if (logoMatches.length > 0) {
      const lastLogo = logoMatches[logoMatches.length - 1];
      logo = normalizeImageUrl(lastLogo[1] || lastLogo[2] || null);
    }

    const divideYIndex = orgChunk.indexOf('divide-y');
    if (divideYIndex === -1) continue;
    const tableChunk = orgChunk.slice(divideYIndex);

    const rowBlocks = tableChunk.split(/<div [^>]*class="[^"]*flex flex-row[^"]*"/);
    const yearsByValue = new Map();

    for (let r = 1; r < rowBlocks.length; r++) {
      const row = rowBlocks[r];
      const ceremonyMatch = row.match(
        /<a[^>]*href="([^"]*\/ceremony\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/,
      );
      const categoryMatch = row.match(
        /<a[^>]*href="([^"]*\/category\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/,
      );
      if (!ceremonyMatch || !categoryMatch) continue;

      const ceremonyHref = ceremonyMatch[1];
      const ceremony = cleanText(ceremonyMatch[2]);
      const categoryHref = categoryMatch[1];
      const category = cleanText(categoryMatch[2]);

      const yearMatch = ceremony.match(/\((\d{4})\)/);
      const fallbackYearMatch = row.match(/<p class="[^"]*font-bold[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const fallbackYear = fallbackYearMatch ? cleanText(fallbackYearMatch[1]) : '';
      const year = yearMatch ? yearMatch[1] : fallbackYear || '—';

      const typeMatch = row.match(
        /<span[^>]*class="[^"]*round(?:ed-md)?\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      );
      const typeText = typeMatch ? cleanText(typeMatch[1]) : '';
      const type = /win|kazand/i.test(typeText) ? 'Win' : 'Nominee';

      const projectLinkMatch = row.match(
        /<a[^>]*href="(\/(?:movie|tv)\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/,
      );
      let mediaType = null;
      let projectId = null;
      let project = null;
      let poster = null;

      if (projectLinkMatch) {
        const pHref = projectLinkMatch[1];
        projectId = projectLinkMatch[2];
        mediaType = pHref.startsWith('/movie/') ? 'movie' : 'tv';
        const pInner = projectLinkMatch[3];
        const imgMatch = pInner.match(/<img[^>]+(?:src|data-src)="([^"]+)"/i);
        const altMatch =
          pInner.match(/<img[^>]+alt="([^"]+)"/i) || projectLinkMatch[0].match(/title="([^"]+)"/i);
        poster = normalizeImageUrl(imgMatch ? imgMatch[1] : null);
        project = altMatch ? decodeHtml(altMatch[1]) : null;
      }

      const categories = yearsByValue.get(year) || [];
      categories.push({
        category,
        categoryHref,
        ceremony,
        ceremonyHref,
        key: `${ceremonyHref || categoryHref}-${categories.length}`,
        mediaType,
        poster,
        project,
        projectId,
        type,
      });
      yearsByValue.set(year, categories);
    }

    const years = Array.from(yearsByValue, ([year, categories]) => ({
      categories,
      year,
    })).sort((left, right) => right.year.localeCompare(left.year));

    if (years.length) {
      organizations.push({
        id: cur.href || cur.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        logo,
        title: cur.title,
        years,
      });
    }
  }

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

export async function getPersonAwardsServer({ personId }) {
  if (!personId) return { success: false, error: 'missing_person_id' };

  try {
    return {
      success: true,
      data: await getPersonAwards(personId),
    };
  } catch {
    return { success: false, error: 'awards_unavailable' };
  }
}
