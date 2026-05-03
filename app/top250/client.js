'use client';

import { motion } from 'framer-motion';

import { ACCOUNT_ROUTE_SHELL_CLASS, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import { cn } from '@/core/utils';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import SearchAction from '@/features/navigation/actions/search-action';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import MediaCard from '@/ui/media/media-card';

import { TOP250_ROUTE_MOTION, Top250SectionReveal, getTop250GridItemMotion } from './motion';

const TOP250_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.42,
  transition: {
    duration: 1.1,
    delay: 0.06,
    ease: [0.23, 1, 0.32, 1],
  },
  initial: {
    opacity: 0,
    scale: 1.05,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transitionEnd: {
      transform: 'none',
      willChange: 'auto',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.025,
  },
});

function getPosterSrc(item) {
  const preferredPoster = getPreferredMoviePosterSrc(
    {
      id: item.tmdbId,
      entityId: item.tmdbId,
      poster_path: item.posterPath,
    },
    'w342'
  );

  if (preferredPoster) {
    return preferredPoster;
  }

  if (item.posterPath) {
    return `${TMDB_IMG}/w342${item.posterPath}`;
  }

  return item.imageUrl || null;
}

function getBackdropSrc(items) {
  const backdropItem = items.find((item) => item.backdropPath);
  return backdropItem?.backdropPath ? `${TMDB_IMG}/original${backdropItem.backdropPath}` : null;
}

function Top250MovieCard({ item, index }) {
  const itemMotion = getTop250GridItemMotion({ index });
  const posterSrc = getPosterSrc(item);
  const href = item.tmdbId ? `/movie/${item.tmdbId}` : item.imdbUrl;

  return (
    <motion.div initial={itemMotion.initial} animate={itemMotion.animate} transition={itemMotion.transition}>
      <MediaCard
        href={href}
        className="bg-primary w-full border border-white/10 transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
        imageSrc={posterSrc}
        imageAlt={item.title}
        imageSizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        imagePreset="poster"
        imageLoading={index < 8 ? 'eager' : 'lazy'}
        imagePriority={index < 4}
        tooltipText={`${item.title}${item.year ? ` (${item.year})` : ''}`}
      />
    </motion.div>
  );
}

export default function Top250Client({ data }) {
  usePosterPreferenceVersion();
  const items = Array.isArray(data?.items) ? data.items : [];
  const backgroundImage = getBackdropSrc(items);

  useRegistry({
    nav: {
      title: 'IMDb Top 250',
      description: `${items.length} movies ranked by IMDb ratings snapshot`,
      icon: 'cib:imdb',
      action: <SearchAction />,
    },
    background: backgroundImage
      ? {
          animation: TOP250_BACKGROUND_ANIMATION,
          image: backgroundImage,
          overlay: true,
          overlayOpacity: 0.5,
          overlayColor: 'var(--white)',
          noiseStyle: {
            opacity: 0.1,
          },
          imageStyle: {
            opacity: 0.9,
          },
        }
      : {
          image: null,
          video: null,
          overlay: false,
          overlayOpacity: 0,
        },
  });

  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content">
        <main className="pt-0 pb-20">
          <div className={cn(ACCOUNT_ROUTE_SHELL_CLASS, 'account-detail-grid-frame content-detail-grid-frame')}>
            <div className="account-detail-grid-main content-detail-grid-main">
              <Top250SectionReveal delay={TOP250_ROUTE_MOTION.orchestration.gridDelay}>
                <section className="account-detail-grid-subsection bg-transparent">
                  <div className="account-detail-section-shell flex flex-col">
                    <div className="account-detail-section-body">
                      {items.length ? (
                        <section className="top250-grid">
                          {items.map((item, index) => (
                            <Top250MovieCard key={item.imdbId} item={item} index={index} />
                          ))}
                        </section>
                      ) : (
                        <section className="bg-primary border border-white/10 px-4 py-5 text-sm font-medium text-white/60">
                          No Top 250 movies found.
                        </section>
                      )}
                    </div>
                  </div>
                </section>
              </Top250SectionReveal>
            </div>
          </div>
        </main>
      </PageGradientShell>
      <NavHeightSpacer className="w-full bg-black" />
    </>
  );
}
