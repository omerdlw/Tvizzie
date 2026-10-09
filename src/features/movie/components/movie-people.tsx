"use client";

import { useState, type CSSProperties } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { Button, Icon, SegmentedControl } from "@/ui";
import { MOVIE_COMPACT_PEOPLE, MOVIE_FEATURED_PEOPLE } from "../lib/constants";
import { Header, Item, Section, Swap } from "../stage";
import type { PersonEntry } from "../lib/types";
import { PeopleModal, type PeopleModalData } from "./movie-modals";
import { PersonCard } from "./person-card";

type Tab = "cast" | "crew";

function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2) + extra,
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
    void openModal(data as unknown as Record<string, unknown>);
  };

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <SegmentedControl
            ariaLabel="Cast or crew"
            items={tabs}
            onChange={setTab}
            value={tab}
          />
        }
        icon="solar:users-group-rounded-bold"
        title="Cast & Crew"
      />

      <Swap className="flex flex-col gap-3" id={tab}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {featured.map((person) => (
            <Item as="li" className="min-w-0" key={person.key}>
              <PersonCard person={person} />
            </Item>
          ))}
        </ul>

        {compact.length > 0 || hasMore ? (
          <div
            className="grid h-10 grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))]"
            style={compactCells(compact.length, hasMore)}
          >
            {compact.map((person, index) => (
              <Item
                className={`min-w-0 ${index > 1 ? "hidden sm:block" : ""}`}
                from="scale"
                key={person.key}
              >
                <PersonCard compact person={person} />
              </Item>
            ))}
            <Item className="min-w-0" from="scale">
              <Button
                aria-label="Show full cast and crew"
                className="cine-press center h-10 w-full cursor-pointer rounded-[16px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
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
