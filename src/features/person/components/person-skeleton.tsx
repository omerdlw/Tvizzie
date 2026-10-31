import type { JSX } from "react";
import {
  FILMOGRAPHY_GRID_CLASS,
  LABEL_TYPE,
  LINKS_CLASS,
  SIDEBAR_FACTS_CLASS,
} from "../lib/layout";
import { PERSON_FILMOGRAPHY_PREVIEW } from "../lib/constants";
import {
  ASIDE_CLASS,
  BackdropHeroSkeleton,
  bodyClass,
  CAROUSEL_ITEM,
  CarouselSkeleton,
  CONTAINER_CLASS,
  FACT_ROW_TYPE,
  HEADER_CLASS,
  HEADLINE_BOX,
  HEADLINE_TYPE,
  MAIN_COLUMN_CLASS,
  PAGE_CLASS,
  PROSE_BOX,
  PROSE_TYPE,
  RULE_GAP,
  SectionHeaderSkeleton,
  SIDEBAR_CLASS,
  SkeletonBlock,
  SkeletonLines,
  TabsSkeleton,
} from "@/ui";

const FACT_WIDTHS = [
  ["2.5rem", "8rem"],
  ["2rem", "1.25rem"],
  ["4.5rem", "9rem"],
  ["5.5rem", "6.5rem"],
  ["4.5rem", "10rem"],
] as const;

function Sidebar(): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="w-full shrink-0">
          <SkeletonBlock className="aspect-[2/3] w-full rounded-[24px]" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-12 min-w-0 flex-1 rounded-full" />
          <SkeletonBlock className="h-12 min-w-0 flex-1 rounded-full" />
        </div>
      </div>

      <div className={SIDEBAR_FACTS_CLASS}>
        <div className="flex flex-col">
          {FACT_WIDTHS.map(([label, value], index) => (
            <div
              className="group/row relative py-3 first:pt-0 last:pb-0"
              key={index}
            >
              <div
                className={`${FACT_ROW_TYPE} flex h-[1lh] items-center justify-between gap-6`}
              >
                <SkeletonBlock
                  className="h-[7px] rounded-full"
                  style={{ width: label }}
                />
                <SkeletonBlock
                  className="h-2.5 rounded-full"
                  style={{ width: value }}
                />
              </div>
              <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px group-last/row:hidden" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const BAR_COUNT = 24;

function Career(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={
          <div className="hidden h-4 items-center sm:flex">
            <SkeletonBlock className="h-[7px] w-28 rounded-full" />
          </div>
        }
        title="3.5rem"
      />
      <div className="flex flex-col gap-5">
        <div className="flex min-h-14 items-end gap-5">
          <div className="font-zuume text-5xl leading-[0.8] sm:text-6xl">
            <SkeletonBlock className="h-[1lh] w-[1.35em] rounded-[8px]" />
          </div>
          <div className="flex flex-col gap-1 pb-0.5">
            <SkeletonLines
              className="text-[11px] leading-4"
              widths={["6rem"]}
            />
            <SkeletonLines className="text-sm leading-5" widths={["12rem"]} />
          </div>
        </div>
        <div className="relative flex h-40 items-end gap-[3px] sm:h-48">
          {Array.from({ length: BAR_COUNT }, (_, index) => (
            <SkeletonBlock
              className="min-w-[3px] max-w-7 flex-1 rounded-t-[3px]"
              key={index}
              style={{ height: `${20 + ((index * 37) % 70)}%` }}
            />
          ))}
          <SkeletonBlock className="absolute inset-x-0 bottom-0 h-px" />
        </div>
        <div className="-mt-3 flex h-4 gap-[3px]">
          {Array.from({ length: BAR_COUNT }, (_, index) => (
            <div
              className="relative flex min-w-[3px] max-w-7 flex-1 items-center justify-center"
              key={index}
            >
              {index % 4 === 1 ? (
                <SkeletonBlock className="absolute h-[7px] w-8 rounded-full" />
              ) : null}
            </div>
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
        actions={<SkeletonBlock className="h-8 w-44 rounded-full" />}
        title="6rem"
      />
      <div className="mb-8 flex w-full items-center">
        <TabsSkeleton chosen="97px" width="183px" />
      </div>
      <div className="flex flex-col">
        <div className={FILMOGRAPHY_GRID_CLASS}>
          {Array.from({ length: PERSON_FILMOGRAPHY_PREVIEW }, (_, index) => (
            <div className="min-w-0" key={index}>
              <SkeletonBlock className="aspect-[2/3] w-full rounded-[16px]" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="mt-3 h-10 w-full rounded-full" />
      </div>
    </section>
  );
}

function Gallery(): JSX.Element {
  return (
    <section className="flex w-full flex-col">
      <SectionHeaderSkeleton
        actions={
          <div className="flex items-center gap-2">
            <TabsSkeleton chosen="76px" width="171px" />
            <SkeletonBlock className="size-8 shrink-0 rounded-full" />
          </div>
        }
        title="3.5rem"
      />
      <CarouselSkeleton
        aspect="aspect-[2/3]"
        blockClassName="rounded-[16px]"
        count={5}
        itemClassName={CAROUSEL_ITEM}
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
            <div className={`${HEADLINE_BOX} ${HEADLINE_TYPE}`}>
              <div className="h-[1lh] pt-[0.14em]">
                <SkeletonBlock className="h-[0.7em] w-[58%] rounded-[16px]" />
              </div>
            </div>
            <div className={`${RULE_GAP} flex items-center gap-4`}>
              <SkeletonLines
                className={`shrink-0 ${LABEL_TYPE}`}
                widths={["4.5rem"]}
              />
              <SkeletonBlock className="h-px min-w-6 flex-1" />
              <div className={LINKS_CLASS}>
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="center size-9" key={index}>
                    <SkeletonBlock className="size-5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <SkeletonLines
                className={`${PROSE_BOX} w-full ${PROSE_TYPE}`}
                widths={["100%", "100%", "97%", "100%", "38%"]}
              />
              <SkeletonLines
                className="text-[11px] leading-4"
                widths={["4.5rem"]}
              />
            </div>
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
