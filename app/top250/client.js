'use client';

import Link from 'next/link';

import { AppRouteItem, AppRouteSection, AppRouteShell } from '@/app/motion';
import { ACCOUNT_ROUTE_SHELL_CLASS, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import { cn } from '@/core/utils';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import AdaptiveImage from '@/ui/elements/adaptive-image';

function getBannerSrc(item) {
  if (item?.backdropPath) {
    return `${TMDB_IMG}/w1280${item.backdropPath}`;
  }

  if (item?.imageUrl) {
    return item.imageUrl;
  }

  if (item?.posterPath) {
    return `${TMDB_IMG}/w780${item.posterPath}`;
  }

  return null;
}

function getMovieHref(item) {
  return item?.tmdbId ? `/movie/${item.tmdbId}` : item?.imdbUrl;
}

function getMetaLine(item) {
  const directorLabel = Array.isArray(item?.directors) ? item.directors.filter(Boolean).join(', ') : '';
  const yearLabel = item?.year ? String(item.year) : '';

  if (directorLabel && yearLabel) {
    return `${directorLabel} - ${yearLabel}`;
  }

  return directorLabel || yearLabel || 'Director and year unavailable';
}

function getOverview(item) {
  const overview = String(item?.overview || '').trim();
  return overview || 'No editorial overview is available for this title yet.';
}

function Top250MovieCard({ item, index }) {
  const href = getMovieHref(item);
  const bannerSrc = getBannerSrc(item);

  return (
    <AppRouteItem className="mx-auto w-full max-w-5xl border-b border-dashed border-white/10 py-12" index={index}>
      <Link
        href={href}
        className="group ransition-colors flex w-full flex-col gap-6 font-sans hover:border-white/20 sm:gap-7 sm:py-4"
      >
        <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <p className="text-4xl leading-none font-thin text-white italic sm:text-5xl">{item.rank}</p>
          <h2 className="font-zuume max-w-[20ch] text-5xl leading-none text-white sm:text-8xl">{item.title}</h2>
          <p className="text-sm font-medium text-white/50 sm:text-base">{getMetaLine(item)}</p>
        </div>

        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {bannerSrc ? (
            <AdaptiveImage
              src={bannerSrc}
              alt={item.title}
              fill={true}
              sizes="(max-width: 768px) 100vw, 960px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold text-white/50 uppercase">
              No gallery image available
            </div>
          )}
        </div>
      </Link>
    </AppRouteItem>
  );
}

export default function Top250Client({ data }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content isolate">
      <AppRouteShell as="main" className="pt-0">
        <div className={cn(ACCOUNT_ROUTE_SHELL_CLASS, 'account-detail-grid-frame')}>
          <div className="account-detail-grid-main flex w-full min-w-0 flex-col">
            <AppRouteSection className="account-detail-grid-subsection bg-transparent" index={0}>
              <div className="account-detail-section-shell flex flex-col">
                <section className="flex w-full flex-col gap-10 px-5 sm:px-8 lg:px-14">
                  {items.map((item, index) => (
                    <Top250MovieCard key={item.imdbId} item={item} index={index} />
                  ))}
                </section>
              </div>
            </AppRouteSection>

            <AppRouteSection className="account-detail-grid-subsection bg-transparent" index={1}>
              <NavHeightSpacer className="w-full" />
            </AppRouteSection>
          </div>
        </div>
      </AppRouteShell>
    </PageGradientShell>
  );
}
