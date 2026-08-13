'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import PersonGridFrame from '@/domains/media/ui/layouts/person-grid-frame';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import Registry from '@/app/(media)/registry';

const SKELETON = 'skeleton-block';
const SOFT_SKELETON = 'skeleton-block-soft';

function Line({ className = '', soft = false }) {
  return <div className={`${soft ? SOFT_SKELETON : SKELETON}  ${className}`} />;
}

function FullBleedRule({ edge = 'bottom' }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 w-screen -translate-x-1/2 border-black/10 ${
        edge === 'top' ? 'top-0 border-t' : 'bottom-0 border-b'
      }`}
    />
  );
}

function SegmentedControlSkeleton() {
  return (
    <div className="inline-flex shrink-0 items-stretch  border border-black/10 p-[2px]">
      <div className="flex overflow-hidden ">
        <div className="bg-primary flex h-7 items-center  px-3">
          <Line className="h-2 w-12" soft />
        </div>
        <div className="flex h-7 items-center  px-3">
          <Line className="h-2 w-14" soft />
        </div>
      </div>
    </div>
  );
}

function PersonSectionHeaderSkeleton({ controls = false }) {
  return (
    <div className="relative flex min-h-14 w-full items-center justify-between gap-4 px-6">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`size-5 shrink-0  ${SKELETON}`} />
        <Line className="h-3 w-24" />
      </div>
      {controls ? <SegmentedControlSkeleton /> : null}
      <FullBleedRule />
    </div>
  );
}

function PersonHeroSkeleton() {
  return (
    <section className="relative flex w-full flex-col items-center gap-5 px-4 py-14 sm:gap-7 sm:py-20 lg:py-24">
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div
          className={`h-12 w-12 shrink-0  ${SKELETON} sm:h-16 sm:w-16 lg:h-20 lg:w-20`}
        />
        <div className={`h-12 w-44  ${SKELETON} sm:h-16 sm:w-64 lg:h-20 lg:w-80`} />
      </div>
      <div className="mx-auto flex w-full max-w-[72ch] flex-col items-center gap-2">
        <Line className="h-4 w-full max-w-[50ch]" soft />
        <Line className="h-4 w-[88%] max-w-[44ch]" soft />
        <Line className="h-4 w-2/3 max-w-[32ch]" soft />
        <Line className="h-4 w-1/2 max-w-[24ch]" soft />
        <Line className="mt-3 h-3 w-16" soft />
      </div>
      <FullBleedRule />
    </section>
  );
}

function PersonGallerySkeleton() {
  return (
    <section className="relative w-full">
      <PersonSectionHeaderSkeleton />
      <div className="grid grid-cols-3 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className={`aspect-2/3  ${SKELETON}`} />
        ))}
      </div>
    </section>
  );
}

function PersonFilmographySkeleton() {
  return (
    <section className="relative w-full">
      <FullBleedRule edge="top" />
      <PersonSectionHeaderSkeleton controls />
      <div className="grid grid-cols-3 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className={`aspect-2/3  ${SKELETON}`} />
        ))}
      </div>
      <FullBleedRule />
    </section>
  );
}

export function PersonDeferredContentSkeleton() {
  return (
    <>
      <PersonGallerySkeleton />
      <PersonFilmographySkeleton />
    </>
  );
}

function PersonDetailRouteSkeleton() {
  return (
    <PageGradientShell className="overflow-hidden">
      <PersonGridFrame />
      <div
        className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col pb-12`}
      >
        <PersonHeroSkeleton />
        <PersonDeferredContentSkeleton />
      </div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <PersonDetailRouteSkeleton />
    </>
  );
}
