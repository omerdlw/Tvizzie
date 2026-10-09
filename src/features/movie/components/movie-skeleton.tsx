import type { JSX } from "react";
import { BackdropHeroSkeleton } from "@/ui/backdrop-hero";
import {
  CarouselSkeleton,
  SectionHeaderSkeleton,
  SkeletonBlock,
  SkeletonLines,
  TabsSkeleton,
} from "@/ui/skeleton-parts";
import {
  AFTER_TAGLINE,
  ASIDE_CLASS,
  CONTAINER_CLASS,
  FACT_ROW_TYPE,
  GALLERY_BACKDROP_ITEM,
  HEADER_CLASS,
  MAIN_COLUMN_CLASS,
  OVERVIEW_BOX,
  OVERVIEW_TYPE,
  PAGE_CLASS,
  POSTER_ROW_ITEM,
  RULE_GAP,
  SIDEBAR_CLASS,
  SIDEBAR_FACTS_CLASS,
  TAGLINE_TYPE,
  TITLE_BOX,
  TITLE_TYPE,
  bodyClass,
} from "../lib/layout";

const FACT_WIDTHS = [
  ["3.5rem", "7rem"],
  ["2.5rem", "9rem"],
  ["4.5rem", "6.5rem"],
  ["3.5rem", "5.5rem"],
  ["4.5rem", "7.5rem"],
  ["3rem", "1.25rem"],
  ["4rem", "3.5rem"],
  ["3.25rem", "4.5rem"],
  ["3.5rem", "3rem"],
  ["4rem", "4.5rem"],
] as const;

function Sidebar(): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="w-full shrink-0">
          <SkeletonBlock className="aspect-[2/3] w-full rounded-[20px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock className="h-12 rounded-[20px]" key={index} />
          ))}
        </div>
      </div>

      <div className={SIDEBAR_FACTS_CLASS}>
        <div className="flex flex-col">
          {FACT_WIDTHS.map(([label, value], index) => (
            <div
              className="py-3 pb-[calc(0.75rem+1px)] first:pt-0 last:pb-0"
              key={index}
            >
              <div
                className={`${FACT_ROW_TYPE} flex h-[1lh] items-center justify-between gap-6`}
              >
                <SkeletonBlock className="h-[7px]" style={{ width: label }} />
                <SkeletonBlock className="h-2.5" style={{ width: value }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonCardSkeleton({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <div className="flex h-10 min-w-0 items-center gap-3 p-1 pr-2">
      <SkeletonBlock className="size-8 shrink-0 rounded-[12px]" />
      <SkeletonBlock className="h-2 w-20" />
    </div>
  ) : (
    <div className="flex h-[84px] items-center gap-3 p-1 pr-4">
      <SkeletonBlock className="h-[76px] w-14 shrink-0 rounded-[16px]" />
      <div className="flex min-w-0 flex-col">
        <SkeletonLines className="text-sm" widths={["8rem"]} />
        <SkeletonLines className="text-xs" widths={["5rem"]} />
      </div>
    </div>
  );
}

function People(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title="5.75rem" />
      <TabsSkeleton width="112px" />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <PersonCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid h-10 grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))] gap-3 [--cells-sm:3] sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))] sm:[--cells:4]">
          {Array.from({ length: 3 }, (_, index) => (
            <div className={index > 1 ? "hidden sm:block" : ""} key={index}>
              <PersonCardSkeleton compact />
            </div>
          ))}
          <SkeletonBlock className="h-10 w-full rounded-[16px]" />
        </div>
      </div>
    </section>
  );
}

function Gallery({
  tabs,
  title,
}: {
  tabs: string;
  title: string;
}): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title={title} />
      <TabsSkeleton width={tabs} />
      <CarouselSkeleton
        aspect="aspect-video"
        count={3}
        itemClassName={GALLERY_BACKDROP_ITEM}
      />
    </section>
  );
}

export function MovieSkeleton(): JSX.Element {
  return (
    <main
      aria-busy="true"
      className={`overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic
    >
      <div className={CONTAINER_CLASS}>
        <div className="relative">
          <BackdropHeroSkeleton />
        </div>

        <div className={bodyClass(true)}>
          <header className={HEADER_CLASS}>
            <div className={`${TITLE_BOX} ${TITLE_TYPE}`}>
              <div className="h-[1lh] pt-[0.14em]">
                <SkeletonBlock className="h-[0.7em] w-[58%] rounded-[0.12em]" />
              </div>
            </div>
            <SkeletonBlock className={`${RULE_GAP} h-px w-full rounded-none`} />
            <SkeletonLines className={TAGLINE_TYPE} widths={["13rem"]} />
            <SkeletonLines
              className={`${AFTER_TAGLINE} ${OVERVIEW_BOX} ${OVERVIEW_TYPE}`}
              widths={["100%", "100%", "97%", "64%"]}
            />
          </header>

          <aside className={ASIDE_CLASS}>
            <Sidebar />
          </aside>

          <div className={MAIN_COLUMN_CLASS}>
            <People />
            <Gallery tabs="161px" title="3.5rem" />
            <Gallery tabs="162px" title="3rem" />
            <section className="flex w-full flex-col">
              <SectionHeaderSkeleton title="7rem" />
              <CarouselSkeleton
                aspect="aspect-[2/3]"
                count={5}
                itemClassName={POSTER_ROW_ITEM}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
