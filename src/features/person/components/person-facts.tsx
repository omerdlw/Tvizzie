"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/ui";
import { movieHref } from "@/config/routes";
import { FACT_ROW_TYPE } from "../lib/layout";
import { SCENE, factsGap, undoGap } from "../lib/motion";
import { Count, Decode, Fade, Line } from "../stage";
import { PERSON_ALIAS_VISIBLE } from "../lib/constants";
import { FactLink } from "./person-fact-link";

function Row({
  at,
  children,
  label,
  out,
}: {
  at: number;
  children: ReactNode;
  label: string;
  out: number;
}) {
  return (
    <div className="group/row relative flex items-baseline justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">
        <Decode at={at} hover out={out}>
          {label}
        </Decode>
      </dt>
      <Fade
        as="dd"
        at={at + SCENE.facts.lag}
        className={`min-w-0 text-right ${FACT_ROW_TYPE} font-medium text-white tabular-nums`}
        out={out}
      >
        {children}
      </Fade>
      <Line
        at={at}
        className="absolute inset-x-0 bottom-0 bg-white/[0.06] group-last/row:hidden"
        out={out}
      />
    </div>
  );
}

interface When {
  at: number;
  out: number;
}

interface Fact {
  label: string;
  value: (when: When) => ReactNode;
}

function Text({ children, when }: { children: string; when: When }) {
  return (
    <Decode at={when.at} hover out={when.out}>
      {children}
    </Decode>
  );
}

function Figure({
  unit,
  value,
  when,
}: {
  unit: string;
  value: number;
  when: When;
}) {
  return (
    <>
      <Count at={when.at} format={(n) => `${n}`} hover value={value} /> {unit}
    </>
  );
}

interface PersonFactsProps {
  age: number | null;
  aliases: readonly string[];
  born: string | null;
  died: string | null;
  knownFor: readonly { id: number; title: string }[];
  place: string | null;
}

export function PersonFacts({
  age,
  aliases,
  born,
  died,
  knownFor,
  place,
}: PersonFactsProps) {
  const facts: Fact[] = [];
  if (born) {
    facts.push({
      label: "Born",
      value: (when) => <Text when={when}>{born}</Text>,
    });
  }
  if (died) {
    facts.push({
      label: "Died",
      value: (when) => <Text when={when}>{died}</Text>,
    });
  }
  if (age !== null) {
    facts.push({
      label: died ? "Aged" : "Age",
      value: (when) => <Figure unit="years" value={age} when={when} />,
    });
  }
  if (place) {
    facts.push({
      label: "Birthplace",
      value: (when) => <Text when={when}>{place}</Text>,
    });
  }
  if (aliases.length > 0) {
    facts.push({
      label: "Also known as",
      value: (when) => {
        const visible = aliases.slice(0, PERSON_ALIAS_VISIBLE);
        const hidden = aliases.slice(PERSON_ALIAS_VISIBLE);
        return (
          <>
            {visible.map((alias, index) => (
              <span key={alias}>
                <Text when={when}>{alias}</Text>
                {index < visible.length - 1 ? (
                  <Fade as="span" at={when.at} out={when.out}>
                    {", "}
                  </Fade>
                ) : null}
              </span>
            ))}
            {hidden.length > 0 ? (
              <Tooltip position="top" text={hidden.join(", ")}>
                <span className="ml-1.5 cursor-help text-xs font-bold text-white/70">
                  +{hidden.length}
                </span>
              </Tooltip>
            ) : null}
          </>
        );
      },
    });
  }
  if (knownFor.length > 0) {
    facts.push({
      label: "Known for",
      value: (when) =>
        knownFor.map((film, index) => (
          <span key={film.id}>
            <FactLink href={movieHref(film.id)} label={film.title}>
              <Decode at={when.at} hover out={when.out}>
                {film.title}
              </Decode>
            </FactLink>
            {index < knownFor.length - 1 ? (
              <Fade as="span" at={when.at} out={when.out}>
                {", "}
              </Fade>
            ) : null}
          </span>
        )),
    });
  }

  const gap = factsGap(facts.length);
  const outGap = undoGap(facts.length);

  return (
    <dl className="flex flex-col" data-exit="">
      {facts.map((fact, index) => {
        const at = SCENE.facts.at + index * gap;
        const out = index * outGap;
        return (
          <Row at={at} key={fact.label} label={fact.label} out={out}>
            {fact.value({ at: at + SCENE.facts.lag, out })}
          </Row>
        );
      })}
    </dl>
  );
}
