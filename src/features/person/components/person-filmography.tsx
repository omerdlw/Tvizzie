"use client";

import { useMemo, useState } from "react";
import { MoviePosterLink } from "@/features/movie";
import { Button, SegmentedControl, Select, TONE } from "@/ui";
import {
  PERSON_DEFAULT_SORT,
  PERSON_FILMOGRAPHY_PREVIEW,
} from "../lib/constants";
import { FILMOGRAPHY_GRID_CLASS } from "../lib/layout";
import { gridGap } from "../lib/motion";
import { Beat, Header, Item, Section, Swap } from "@/motion/stage";
import type { FilmographyGroup, FilmographySort } from "../lib/types";
import {
  FILMOGRAPHY_SORTS,
  isFilmographySort,
  sortFilmography,
} from "../lib/credits";

const SORT_OPTIONS = FILMOGRAPHY_SORTS.map(({ key, label }) => ({
  label,
  value: key,
}));

export function PersonFilmography({
  groups,
}: {
  groups: readonly FilmographyGroup[];
}) {
  const [active, setActive] = useState(groups[0]?.key ?? "");
  const [sort, setSort] = useState<FilmographySort>(PERSON_DEFAULT_SORT);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const group = groups.find((item) => item.key === active) ?? groups[0];
  const credits = useMemo(
    () => (group ? sortFilmography(group.credits, sort) : []),
    [group, sort],
  );
  if (!group) return null;

  const showAll = expanded.has(group.key);
  const visible = showAll
    ? credits
    : credits.slice(0, PERSON_FILMOGRAPHY_PREVIEW);
  const several = groups.length > 1;

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <Select
            ariaLabel="Sort filmography"
            className="w-44"
            classNames={{
              content: "rounded-[18px]",
              option: "rounded-[14px]",
              trigger:
                "rounded-full bg-white/[0.06] ring-white/[0.04] hover:bg-white/10 hover:ring-white/[0.08]",
            }}
            onChange={(value) => isFilmographySort(value) && setSort(value)}
            options={SORT_OPTIONS}
            size="sm"
            value={sort}
          />
        }
        icon="solar:clapperboard-play-bold"
        title={
          several
            ? "Filmography"
            : `Filmography · ${group.label} (${group.total})`
        }
      />

      {several ? (
        <Beat>
          <div className="mb-8 flex w-full items-center">
            <SegmentedControl
              ariaLabel="Kind of work"
              className={TONE.tabs}
              items={groups.map((item) => ({
                key: item.key,
                label: `${item.label} (${item.total})`,
              }))}
              onChange={setActive}
              value={group.key}
            />
          </div>
        </Beat>
      ) : null}

      <Swap
        className="flex flex-col"
        gap={gridGap(visible.length)}
        id={`${group.key}:${sort}`}
      >
        <ul className={FILMOGRAPHY_GRID_CLASS}>
          {visible.map((credit) => (
            <Item as="li" className="min-w-0" from="light" key={credit.key}>
              <MoviePosterLink
                detail={credit.role}
                radius={16}
                carried
                movie={{
                  id: credit.id,
                  posterPath: credit.posterPath,
                  title: credit.title,
                  year: credit.year,
                }}
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 20vw, 30vw"
              />
            </Item>
          ))}
        </ul>
        {credits.length > visible.length ? (
          <Item>
            <Button
              className={`cine-press mt-3 h-10 w-full cursor-pointer rounded-full text-[13px] font-medium ${TONE.surface}`}
              onClick={() => setExpanded(new Set(expanded).add(group.key))}
              type="button"
            >
              Show all {credits.length}
            </Button>
          </Item>
        ) : null}
      </Swap>
    </Section>
  );
}
