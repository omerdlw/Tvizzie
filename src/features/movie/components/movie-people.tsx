"use client";

import { useState, type CSSProperties } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { Button, Icon, SegmentedControl, TONE } from "@/ui";
import { MOVIE_COMPACT_PEOPLE, MOVIE_FEATURED_PEOPLE } from "../lib/constants";
import { Header, Item, Section, Swap } from "@/motion/stage";
import type { PersonEntry } from "../lib/types";
import { PeopleModal, type PeopleModalData } from "./movie-modals";
import { PersonCard } from "./person-card";

type Tab = "cast" | "crew";

function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2),
  } as CSSProperties;
}

interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
}

export function MoviePeople({ cast, crew }: MoviePeopleProps) {
  const [openModal] = useModal(PeopleModal);
  const tabs = [
    ...(cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0]?.key ?? "cast");
  if (tabs.length === 0) return null;

  const people = tab === "cast" ? cast : crew;
  const featured = people.slice(0, MOVIE_FEATURED_PEOPLE);
  const compact = people.slice(
    MOVIE_FEATURED_PEOPLE,
    MOVIE_FEATURED_PEOPLE + MOVIE_COMPACT_PEOPLE,
  );
  const hasMore = people.length > featured.length + compact.length;

  const openAll = () => {
    const data: PeopleModalData = { cast, crew, initialTab: tab };
    void openModal(data);
  };

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <SegmentedControl
            ariaLabel="Cast or crew"
            className={TONE.tabs}
            items={tabs}
            onChange={setTab}
            value={tab}
          />
        }
        icon="solar:users-group-rounded-bold"
        title="Cast & Crew"
      />

      <Swap className="flex flex-col gap-3" fades id={tab}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {featured.map((person) => (
            <Item
              as="li"
              className="min-w-0"
              exit={false}
              from="light"
              key={person.key}
            >
              <PersonCard person={person} radius={18} />
            </Item>
          ))}
        </ul>

        {compact.length > 0 || hasMore ? (
          <div
            className={`grid h-10 gap-3 sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))] ${hasMore ? "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))_2.5rem]" : "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))]"}`}
            style={compactCells(compact.length, hasMore)}
          >
            {compact.map((person, index) => (
              <Item
                className={`min-w-0 ${index > 1 ? "hidden sm:block" : ""}`}
                exit={false}
                from="light"
                key={person.key}
              >
                <PersonCard compact person={person} radius={20} />
              </Item>
            ))}
            <Item className="min-w-0" exit={false} from="light">
              <Button
                aria-label="Show full cast and crew"
                className={`cine-press center h-10 w-full cursor-pointer rounded-full ${TONE.surface}`}
                onClick={openAll}
              >
                <Icon icon="solar:alt-arrow-right-linear" size={16} />
              </Button>
            </Item>
          </div>
        ) : null}
      </Swap>
    </Section>
  );
}
