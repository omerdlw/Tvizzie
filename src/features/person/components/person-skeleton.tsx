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
  ASIDE_CLASS,
  BIO_BOX,
  BIO_TYPE,
  CONTAINER_CLASS,
  FACT_ROW_TYPE,
  FILMOGRAPHY_GRID_CLASS,
  HEADER_CLASS,
  LABEL_TYPE,
  MAIN_COLUMN_CLASS,
  NAME_BOX,
  NAME_TYPE,
  PAGE_CLASS,
  PORTRAIT_ITEM,
  RULE_GAP,
  SIDEBAR_CLASS,
  SIDEBAR_FACTS_CLASS,
  bodyClass,
} from "../lib/layout";

const FACT_WIDTHS = [
  ["2.5rem", "8rem"],
  ["2rem", "5rem"],
  ["4.5rem", "9rem"],
  ["5.5rem", "6.5rem"],
] as const;

function Sidebar(): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="w-full shrink-0">
          <SkeletonBlock className="aspect-[2/3] w-full rounded-[20px]" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-12 min-w-0 flex-1 rounded-[20px]" />
          <SkeletonBlock className="h-12 min-w-0 flex-1 rounded-[20px]" />
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

function Career(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title="4rem" />
      <div className="flex flex-col gap-5">
        <div className="flex min-h-14 items-end gap-5">
          <SkeletonBlock className="h-10 w-[7.5rem] rounded-[0.12em]" />
          <div className="flex flex-col gap-2 pb-0.5">
            <SkeletonBlock className="h-[7px] w-24" />
            <SkeletonBlock className="h-2.5 w-48" />
          </div>
        </div>
        <div className="flex h-40 items-end gap-[3px] sm:h-48">
          {Array.from({ length: 24 }, (_, index) => (
            <SkeletonBlock
              className="min-w-[3px] max-w-7 flex-1 rounded-t-[3px] rounded-b-none"
              key={index}
              style={{ height: `${20 + ((index * 37) % 70)}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Filmography(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={<SkeletonBlock className="h-8 w-44 shrink-0 rounded-[13px]" />}
        title="13.5rem"
      />
      <div className={FILMOGRAPHY_GRID_CLASS}>
        {Array.from({ length: 12 }, (_, index) => (
          <div className="min-w-0" key={index}>
            <SkeletonBlock className="aspect-[2/3] w-full rounded-[20px]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton title="3.5rem" />
      <TabsSkeleton width="167px" />
      <CarouselSkeleton
        aspect="aspect-[2/3]"
        count={5}
        itemClassName={PORTRAIT_ITEM}
      />
    </section>
  );
}

export function PersonSkeleton(): JSX.Element {
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
            <div className={`${NAME_BOX} ${NAME_TYPE}`}>
              <div className="h-[1lh] pt-[0.14em]">
                <SkeletonBlock className="h-[0.7em] w-[58%] rounded-[0.12em]" />
              </div>
            </div>
            <div className={`${RULE_GAP} flex items-center gap-4`}>
              <SkeletonLines
                className={`shrink-0 ${LABEL_TYPE}`}
                widths={["3.5rem"]}
              />
              <SkeletonBlock className="h-px min-w-6 flex-1 rounded-none" />
            </div>
            <SkeletonLines
              className={`${BIO_BOX} ${BIO_TYPE}`}
              widths={["100%", "100%", "97%", "64%"]}
            />
          </header>

          <aside className={ASIDE_CLASS}>
            <Sidebar />
          </aside>

          <div className={MAIN_COLUMN_CLASS}>
            <Career />
            <Filmography />
            <Gallery />
          </div>
        </div>
      </div>
    </main>
  );
}
