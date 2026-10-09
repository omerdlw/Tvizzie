"use client";

import { useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { motion, useTransform } from "motion/react";
import { movieHref } from "@/config/routes";
import { PosterThumb } from "@/features/artwork";
import { useDockLinkClick } from "@/motion";
import { layoutTop } from "@/motion/flow";
import { useScrollY } from "@/motion/scroll";
import { Cascade, Header, Item, Section, Trace } from "../stage";
import type { TimelineCredit, TimelineYear } from "../lib/types";

function TimelineRow({ credit }: { credit: TimelineCredit }) {
  const href = movieHref(credit.id);
  const handleClick = useDockLinkClick(href);

  return (
    <Link
      className="cine-fade group flex items-center gap-4 rounded-[20px] p-2 ring-1 ring-transparent ring-inset hover:bg-white/10 hover:ring-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <PosterThumb
        className="w-14 sm:w-16"
        movieId={credit.id}
        original
        posterPath={credit.posterPath}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm leading-tight font-semibold text-white sm:text-base">
          {credit.title}
        </span>
        {credit.detail ? (
          <span className="truncate text-xs text-white/50 sm:text-sm">
            {credit.detail}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function useSpine(ref: RefObject<HTMLElement | null>) {
  const scrollY = useScrollY();
  const box = useRef({ end: 1, start: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const height = element.offsetHeight;
      const view = window.innerHeight;
      const start = layoutTop(element) - view * 0.6;
      const furthest = document.documentElement.scrollHeight - view;
      box.current = {
        end: Math.max(start + 1, Math.min(start + height, furthest)),
        start,
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return useTransform(scrollY, (y) => {
    const { end, start } = box.current;
    return Math.min(1, Math.max(0, (y - start) / (end - start)));
  });
}

const SPINE = "left-14 sm:left-20";

export function PersonTimeline({ years }: { years: TimelineYear[] }) {
  const list = useRef<HTMLOListElement>(null);
  const progress = useSpine(list);
  if (years.length === 0) return null;

  const films = years.reduce((total, { credits }) => total + credits.length, 0);

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:sort-by-time-bold" title={`Timeline (${films})`} />

      <ol className="relative flex flex-col" ref={list}>
        <Trace
          axis="y"
          className={`absolute top-2 bottom-0 w-px origin-top bg-white/10 ${SPINE}`}
        />
        <motion.span
          aria-hidden="true"
          className={`absolute top-2 bottom-0 w-px origin-top bg-white/50 ${SPINE}`}
          style={{ scaleY: progress }}
          suppressHydrationWarning
        />
        {years.map(({ credits, year }, index) => (
          <li data-year={year ?? "undated"} key={year ?? "undated"}>
            <Cascade
              className={`relative flex ${index === years.length - 1 ? "" : "pb-8"}`}
              free
            >
              <Item
                className="w-14 shrink-0 pt-1 pr-3 text-right sm:w-20 sm:pr-4"
                from="left"
              >
                <h3 className="text-xs font-bold text-white/50 tabular-nums sm:text-sm">
                  {year ?? "—"}
                </h3>
              </Item>
              <Item
                className={`absolute top-1.5 z-10 size-3 -translate-x-1/2 rounded-full bg-white ring-2 ring-black ring-inset ${SPINE}`}
                from="dot"
              >
                <span aria-hidden="true" />
              </Item>
              <ul className="flex min-w-0 flex-1 flex-col gap-1 pl-4 sm:pl-6">
                {credits.map((credit) => (
                  <Item as="li" from="left" key={credit.key}>
                    <TimelineRow credit={credit} />
                  </Item>
                ))}
              </ul>
            </Cascade>
          </li>
        ))}
      </ol>
    </Section>
  );
}
