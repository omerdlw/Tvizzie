'use client';

import { Fragment } from 'react';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import { NavHeightSpacer } from '@/modules/nav';
import { MEDIA_DETAIL_STACK_CLASS } from '@/domains/media/ui/layouts/media-detail-section';

export function SegmentedControlSkeleton({
  itemWidths = ['w-7', 'w-8'],
  isPill = false,
  className = '',
}) {
  const roundedOuter = isPill ? 'rounded-full' : 'rounded-[14px]';
  const roundedInner = isPill ? 'rounded-full' : 'rounded-[10px]';

  return (
    <div
      className={`inline-flex shrink-0 items-center p-[3px] ${roundedOuter} skeleton-block ${className}`}
    >
      <div className="flex items-center">
        {itemWidths.map((width, index) => (
          <div
            key={index}
            className={`flex h-6 items-center justify-center px-2.5 ${
              index === 0 ? `${roundedInner} skeleton-block-soft` : ''
            }`}
          >
            <div
              className={`h-2 ${width} rounded-full ${
                index === 0 ? 'bg-white/15' : 'skeleton-block-soft'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaRouteSkeletonShell({ children }) {
  return (
    <div
      className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-16 [overflow-anchor:none] sm:px-6 lg:px-8`}
    >
      {children}
    </div>
  );
}

export function MediaBackdropSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative isolate h-64 w-full overflow-hidden sm:h-80 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(30rem,45vw,36rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32"
    ></div>
  );
}

export function MediaSidebarSkeleton() {
  return (
    <aside className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-auto">
      <div className="flex flex-col gap-4">
        <div className="skeleton-block aspect-2/3 w-full shrink-0 rounded-[20px]" />

        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
            <div className="skeleton-block flex h-[50px] items-center justify-center gap-2 rounded-[20px]">
              <div className="skeleton-block-soft size-4 rounded-full" />
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2.5">
          <div className="skeleton-block h-3.5 w-24 rounded-full" />
          <div className="flex flex-wrap gap-1.5">
            <div className="skeleton-block-soft h-7 w-16 rounded-full" />
            <div className="skeleton-block-soft h-7 w-20 rounded-full" />
            <div className="skeleton-block-soft h-7 w-14 rounded-full" />
            <div className="skeleton-block-soft h-7 w-18 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <div className="skeleton-block size-3.5 shrink-0 rounded-full" />
              <div
                className={`skeleton-block-soft h-3.5 rounded-full ${
                  i === 0 ? 'w-40' : i === 1 ? 'w-32' : i === 2 ? 'w-24' : i === 3 ? 'w-28' : 'w-36'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function MediaHeroSkeleton() {
  return (
    <div className="relative mb-8 flex w-full flex-col">
      <div className="skeleton-block h-16 w-3/4 max-w-xl rounded-[20px] sm:h-20 lg:h-24" />
      <div className="skeleton-block-soft mt-4 h-3.5 w-48 rounded-full" />
      <div className="mt-3 flex max-w-[70ch] flex-col gap-2">
        <div className="skeleton-block-soft h-4 w-full rounded-full" />
        <div className="skeleton-block-soft h-4 w-[92%] rounded-full" />
        <div className="skeleton-block-soft h-4 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export function MediaCastSkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-24 rounded-full" />
        </div>
        <SegmentedControlSkeleton itemWidths={['w-7', 'w-8']} />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="skeleton-block flex h-[84px] items-center gap-3 rounded-[20px] p-1 pr-4"
            >
              <div className="skeleton-block-soft h-[76px] w-14 shrink-0 rounded-[16px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="skeleton-block-soft h-3.5 w-28 rounded-full" />
                <div className="skeleton-block-soft h-2.5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex h-10 items-center gap-2.5">
          <div className="skeleton-block flex h-10 flex-1 items-center gap-3 rounded-[16px] p-1 pr-2">
            <div className="skeleton-block-soft size-8 shrink-0 rounded-[12px]" />
            <div className="skeleton-block-soft h-3.5 w-20 rounded-full" />
          </div>
          <div className="skeleton-block flex h-10 flex-1 items-center gap-3 rounded-[16px] p-1 pr-2">
            <div className="skeleton-block-soft size-8 shrink-0 rounded-[12px]" />
            <div className="skeleton-block-soft h-3.5 w-20 rounded-full" />
          </div>
          <div className="center skeleton-block size-10 shrink-0 rounded-[16px]">
            <div className="skeleton-block-soft size-4 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MediaTvSeasonsSkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-20 rounded-full" />
        </div>
        <SegmentedControlSkeleton itemWidths={['w-3.5', 'w-3.5', 'w-3.5']} />
      </div>
      <div className="flex w-full gap-3 overflow-hidden rounded-[20px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-block relative aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 overflow-hidden rounded-[20px] sm:w-72"
          >
            <div className="skeleton-block-soft absolute top-2 right-2 size-11 rounded-[14px]" />
            <div className="absolute right-0 bottom-0 left-0 space-y-2 p-3">
              <div className="skeleton-block-soft h-2.5 w-8 rounded-full" />
              <div className="skeleton-block-soft h-3.5 w-3/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MediaGallerySkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex w-full gap-3 overflow-hidden rounded-[20px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-block aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 rounded-[20px] sm:w-72"
          />
        ))}
      </div>
    </section>
  );
}

export function MediaImagesSkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-20 rounded-full" />
        </div>
        <SegmentedControlSkeleton itemWidths={['w-14', 'w-10', 'w-8']} />
      </div>
      <div className="flex w-full gap-3 overflow-hidden rounded-[20px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-block aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 rounded-[20px] sm:w-72"
          />
        ))}
      </div>
    </section>
  );
}

export function MediaVideosSkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-20 rounded-full" />
        </div>
        <SegmentedControlSkeleton itemWidths={['w-10', 'w-10']} />
      </div>
      <div className="flex w-full gap-3 overflow-hidden rounded-[20px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-block aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 rounded-[20px] sm:w-72"
          />
        ))}
      </div>
    </section>
  );
}

export function MediaRecommendationsSkeleton({ titleWidth = 'w-24' }) {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className={`skeleton-block h-4 rounded-full ${titleWidth}`} />
        </div>
      </div>
      <div className="flex w-full gap-3 overflow-hidden rounded-[20px]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-block aspect-2/3 w-[calc((100%-1.5rem)/3)] shrink-0 rounded-[20px] md:w-[calc((100%-2.25rem)/4)]"
          />
        ))}
      </div>
    </section>
  );
}

export function MediaVisualMediaSkeleton() {
  return (
    <div className={MEDIA_DETAIL_STACK_CLASS}>
      <MediaGallerySkeleton />
      <MediaImagesSkeleton />
    </div>
  );
}

export function MediaDiscoverySkeleton() {
  return (
    <div className={MEDIA_DETAIL_STACK_CLASS}>
      <MediaVideosSkeleton />
      <MediaRecommendationsSkeleton titleWidth="w-24" />
      <MediaRecommendationsSkeleton titleWidth="w-28" />
    </div>
  );
}

export function MediaReviewsSkeleton() {
  return (
    <section className="mt-12 w-full sm:mt-14 lg:mt-16">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-28 rounded-full" />
        </div>
        <div className="skeleton-block h-8 w-24 rounded-[10px]" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="skeleton-block size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="skeleton-block h-3.5 w-36 rounded-full" />
              <div className="skeleton-block-soft h-3.5 w-full rounded-full" />
              <div className="skeleton-block-soft h-3.5 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TvSeasonRatingsSkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="overflow-x-auto pt-1 pb-4">
        <div
          className="grid w-max gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: '2.25rem repeat(8, 2.5rem)' }}
        >
          <div aria-hidden="true" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div key={s} className="center h-7">
              <div className="skeleton-block-soft h-3 w-6 rounded-full" />
            </div>
          ))}

          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((e) => (
            <Fragment key={e}>
              <div className="center size-8 self-center">
                <div className="skeleton-block-soft h-3 w-5 rounded-full" />
              </div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <div key={`${e}-${s}`} className="skeleton-block size-10 rounded-[8px]" />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MovieAwardsSkeleton() {
  return (
    <section className="relative flex w-full flex-col gap-6 sm:gap-8">
      <div className="flex w-full flex-col text-left">
        <div className="skeleton-block -mt-2 h-16 w-3/4 max-w-lg rounded-[16px] sm:-mt-2.5 sm:h-20 lg:-mt-3 lg:h-24" />
        <div className="mt-2.5 flex items-center justify-start gap-2.5 py-2.5">
          <div className="skeleton-block-soft h-4 w-16 rounded-full" />
          <div className="skeleton-block-soft h-4 w-24 rounded-full" />
          <div className="skeleton-block-soft h-4 w-20 rounded-full" />
          <div className="skeleton-block-soft h-4 w-16 rounded-full" />
        </div>
      </div>

      <div className="flex w-full items-center gap-2.5 overflow-hidden py-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-block h-[38px] w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="flex w-full flex-col gap-10 sm:gap-12">
        {[0, 1].map((g) => (
          <div key={g} className="flex w-full flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2.5 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="skeleton-block size-11 rounded-[10px] sm:size-12" />
                <div className="flex flex-col justify-center gap-1">
                  <div className="skeleton-block h-5 w-40 rounded-full" />
                  <div className="skeleton-block-soft h-3.5 w-24 rounded-full" />
                </div>
              </div>
              <div className="skeleton-block-soft h-4 w-16 rounded-full" />
            </div>

            <div className="flex w-full flex-col">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2.5 border-t border-white/5 py-2.5"
                >
                  <div className="flex flex-col gap-1.5 pl-[54px] sm:pl-[58px]">
                    <div className="skeleton-block-soft h-3 w-28 rounded-full" />
                    <div className="skeleton-block h-4 w-48 rounded-full" />
                    <div className="skeleton-block-soft h-3 w-36 rounded-full" />
                  </div>
                  <div className="skeleton-block-soft h-4 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PersonHeroSkeleton() {
  return (
    <section className="relative flex w-full flex-col items-center gap-6 pb-8 text-center sm:gap-7 sm:pb-10 lg:pb-12">
      <div className="skeleton-block aspect-2/3 w-full shrink-0 rounded-[20px] lg:w-[20rem] xl:w-[24rem]" />
      <div className="skeleton-block h-16 w-3/4 max-w-lg rounded-[20px] sm:h-20 lg:h-24" />
      <div className="mx-auto flex w-full max-w-[72ch] flex-col items-center gap-2">
        <div className="skeleton-block-soft h-4 w-full max-w-[50ch] rounded-full" />
        <div className="skeleton-block-soft h-4 w-[88%] max-w-[44ch] rounded-full" />
        <div className="skeleton-block-soft h-4 w-2/3 max-w-[32ch] rounded-full" />
      </div>
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton-block size-9 rounded-full" />
        ))}
      </div>
    </section>
  );
}

export function PersonAwardsSkeleton() {
  return <MovieAwardsSkeleton />;
}

export function PersonTimelineSkeleton() {
  return (
    <section className="relative w-full">
      <div className="w-full">
        <div className="relative mx-auto max-w-2xl">
          <div className="flex flex-col gap-8">
            {Array.from({ length: 4 }).map((_, yearIndex) => (
              <div key={yearIndex} className="relative flex">
                <div className="w-16 shrink-0 sm:w-24">
                  <div className="skeleton-block mt-2 ml-auto h-4 w-10 rounded-full sm:w-14" />
                </div>

                <div className="skeleton-block absolute top-[18px] left-16 z-10 size-3 -translate-x-1/2 rounded-full sm:left-24" />

                <div className="min-w-0 flex-1 space-y-3 pt-1 pl-4 sm:pl-8">
                  {Array.from({ length: yearIndex === 0 ? 2 : 1 }).map((_, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="skeleton-block flex items-center gap-4 rounded-[20px] p-2"
                    >
                      <div className="skeleton-block-soft h-24 w-16 shrink-0 rounded-[14px] sm:w-20" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="skeleton-block-soft h-4 w-48 rounded-full" />
                        <div className="skeleton-block-soft h-3.5 w-32 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PersonGallerySkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="w-full">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="skeleton-block aspect-2/3 rounded-[20px]" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PersonFilmographySkeleton() {
  return (
    <section className="relative flex w-full flex-col">
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="skeleton-block size-4 shrink-0 rounded-full" />
          <div className="skeleton-block h-4 w-24 rounded-full" />
        </div>
        <SegmentedControlSkeleton itemWidths={['w-8', 'w-10']} />
      </div>
      <div className="w-full">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="skeleton-block aspect-2/3 rounded-[20px]" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PersonDeferredContentSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10 md:gap-12">
      <PersonGallerySkeleton />
      <PersonFilmographySkeleton />
    </div>
  );
}

export function MediaDiscoverySectionSkeleton({ titleWidth = 'w-28' }) {
  return <MediaRecommendationsSkeleton titleWidth={titleWidth} />;
}

export function MediaFeatureSectionSkeleton({ video = false, titleWidth = 'w-16' }) {
  return video ? <MediaVideosSkeleton /> : <MediaGallerySkeleton />;
}
