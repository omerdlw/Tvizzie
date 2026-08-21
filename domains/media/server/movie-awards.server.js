'use server';

import { cache } from 'react';

const AWARDS_REVALIDATE_SECONDS = 60 * 60 * 24;
const AWARDS_TIMEOUT_MS = 10_000;
const MEDIA_ID_PATTERN = /^\d+$/;
const TMDB_BASE_URL = 'https://www.themoviedb.org';

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
  return decodeHtml(str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
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
        /<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"|<img[^>]+src="([^"]+)"[^>]+class="[^"]*logo[^"]*"/gi,
      ),
    ];
    let logo = null;
    if (logoMatches.length > 0) {
      const lastLogo = logoMatches[logoMatches.length - 1];
      logo = lastLogo[1] || lastLogo[2] || null;
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
      let poster = null;
      let project = null;
      let projectId = null;
      let mediaType = null;

      if (projectLinkMatch) {
        const pHref = projectLinkMatch[1];
        projectId = projectLinkMatch[2];
        mediaType = pHref.startsWith('/movie/') ? 'movie' : 'tv';
        const pInner = projectLinkMatch[3];
        const imgMatch = pInner.match(/<img[^>]+src="([^"]+)"/i);
        const altMatch =
          pInner.match(/<img[^>]+alt="([^"]+)"/i) || projectLinkMatch[0].match(/title="([^"]+)"/i);
        poster = imgMatch ? imgMatch[1] : null;
        project = altMatch ? decodeHtml(altMatch[1]) : null;
      }

      const personMatches = [
        ...row.matchAll(
          /<a[^>]*href="\/person\/(\d+)[^"]*"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
        ),
      ];

      const recipients = [];
      const seenPersonIds = new Set();
      for (const pm of personMatches) {
        const personId = pm[1];
        if (seenPersonIds.has(personId)) continue;
        seenPersonIds.add(personId);
        const personName = cleanText(pm[2]);
        const imgMatch = pm[3].match(/<img[^>]+src="([^"]+)"/i);
        const profile = imgMatch ? imgMatch[1] : null;
        recipients.push({
          id: personId,
          name: personName,
          profile,
        });
      }

      const categories = yearsByValue.get(year) || [];
      categories.push({
        category,
        categoryHref,
        ceremony,
        ceremonyHref,
        key: `${ceremonyHref}-${categoryHref}-${categories.length}`,
        mediaType,
        poster,
        project,
        projectId,
        recipients,
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

async function fetchTmdbMediaAwards(mediaType, id) {
  const resolvedType = mediaType === 'tv' ? 'tv' : 'movie';
  const response = await fetch(`${TMDB_BASE_URL}/${resolvedType}/${id}/awards?language=en-US`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Tvizzie/1.0 (+https://tvizzie.com)',
    },
    next: {
      revalidate: AWARDS_REVALIDATE_SECONDS,
      tags: [`${resolvedType}-awards:${id}`],
    },
    signal: AbortSignal.timeout(AWARDS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`TMDB ${resolvedType} awards request failed with status ${response.status}`);
  }

  return response.text();
}

export const getMediaAwards = cache(async (mediaType, id) => {
  const normalizedId = String(id || '').trim();
  if (!MEDIA_ID_PATTERN.test(normalizedId)) return createEmptyAwards();

  try {
    return createAwardsPayload(await fetchTmdbMediaAwards(mediaType, normalizedId));
  } catch {
    return createEmptyAwards();
  }
});

export const getMovieAwards = cache(async (movieId) => {
  return getMediaAwards('movie', movieId);
});

export const getTvAwards = cache(async (tvId) => {
  return getMediaAwards('tv', tvId);
});

export async function getMediaAwardsServer({ id, mediaType = 'movie', movieId, tvId }) {
  const resolvedId = id || movieId || tvId;
  const resolvedType = mediaType === 'tv' || Boolean(tvId) ? 'tv' : 'movie';
  if (!resolvedId) return { success: false, error: 'missing_id' };

  try {
    return {
      success: true,
      data: await getMediaAwards(resolvedType, resolvedId),
    };
  } catch {
    return { success: false, error: 'awards_unavailable' };
  }
}

export async function getMovieAwardsServer({ movieId }) {
  return getMediaAwardsServer({ mediaType: 'movie', id: movieId });
}

export async function getTvAwardsServer({ tvId }) {
  return getMediaAwardsServer({ mediaType: 'tv', id: tvId });
}
