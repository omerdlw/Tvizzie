import { NextResponse } from 'next/server';

import * as cheerio from 'cheerio';

import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';

const PERSON_ID_PATTERN = /^\d+$/;

async function enforcePersonAwardsRateLimit(requestContext) {
  await enforceSlidingWindowRateLimit({
    namespace: 'api:person-awards',
    windowMs: 10 * 60 * 1000,
    dimensions: [
      { id: 'ip', value: requestContext.ipAddress, limit: 80 },
      { id: 'device', value: requestContext.deviceId, limit: 60 },
    ],
    message: 'Too many awards requests',
  });
}

export async function GET(request, { params }) {
  const requestContext = getRequestContext(request);
  const { id } = await params;

  if (!id || !PERSON_ID_PATTERN.test(String(id).trim())) {
    return NextResponse.json({ error: 'Missing person ID' }, { status: 400 });
  }

  try {
    await enforcePersonAwardsRateLimit(requestContext);

    const url = `https://www.themoviedb.org/person/${id}/awards`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch awards from TMDB' }, { status: res.status });
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    let totalWins = 0;
    let totalNominations = 0;

    $('.space-y-12 > div').each((i, orgEl) => {
      const orgNameEl = $(orgEl).find('.font-semibold.leading-9.text-xl a');
      if (!orgNameEl.length) return;

      const orgTitle = orgNameEl.text().trim();
      const orgLogo = $(orgEl).find('img.logo').attr('src');

      const orgObj = {
        id: orgTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: orgTitle,
        logo: orgLogo,
        years: [],
      };

      const itemsContainer = $(orgEl).find('.divide-y > div');

      itemsContainer.each((j, itemEl) => {
        const ceremonyEl = $(itemEl).find('a[href*="/ceremony/"]');
        const ceremony = ceremonyEl.text().trim();
        const yearMatch = ceremony.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : $(itemEl).find('p.md\\:text-right.font-bold').text().trim();

        const typeEl = $(itemEl)
          .find('.font-semibold')
          .filter((_, element) => {
            const text = $(element).text().trim().toLowerCase();
            return /win|winner|nominee|nomination/.test(text);
          })
          .first();
        const type = typeEl.text().trim() || 'Nominee';

        const categoryEl = $(itemEl).find('a[href*="/category/"]');
        const category = categoryEl.text().trim();

        const projectImgEl = $(itemEl).find('img.poster');
        const poster = projectImgEl.attr('src');
        const projectTitle = projectImgEl.attr('alt');
        const projectLink = projectImgEl.closest('a').attr('href');
        let projectId = null;
        let mediaType = 'movie';

        if (projectLink) {
          const match = projectLink.match(/\/(movie|tv)\/(\d+)/);
          if (match) {
            mediaType = match[1];
            projectId = match[2];
          }
        }

        if (projectId && mediaType !== 'movie') {
          return;
        }

        if (type.toLowerCase().includes('win') || type.toLowerCase().includes('kazan')) {
          totalWins++;
        } else {
          totalNominations++;
        }

        let yearObj = orgObj.years.find((y) => y.year === year);
        if (!yearObj) {
          yearObj = { year, eventName: ceremony, categories: [] };
          orgObj.years.push(yearObj);
        }

        yearObj.categories.push({
          type,
          category,
          project: projectTitle,
          projectId,
          mediaType,
          poster,
        });
      });

      orgObj.years = orgObj.years
        .map((yearEntry) => ({
          ...yearEntry,
          categories: yearEntry.categories.filter(Boolean),
        }))
        .filter((yearEntry) => yearEntry.categories.length > 0);

      if (orgObj.years.length === 0) {
        return;
      }

      results.push(orgObj);
    });

    return NextResponse.json({
      organizations: results,
      stats: {
        totalWins,
        totalNominations: totalWins + totalNominations,
      },
    });
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      return NextResponse.json(
        { error: 'Too many awards requests. Please try again later' },
        {
          status: 429,
          headers: {
            'Retry-After': String(error.retryAfterSeconds || 60),
          },
        }
      );
    }

    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
