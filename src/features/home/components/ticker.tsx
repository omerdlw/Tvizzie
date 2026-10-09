"use client";

import type { JSX } from "react";
import Link from "next/link";
import { personHref } from "@/config/routes";
import { useDockLinkClick } from "@/motion";
import type { HomePerson } from "../lib/types";

function Name({ person }: { person: HomePerson }): JSX.Element {
  const href = personHref(person.id);
  const onClick = useDockLinkClick(href);
  return (
    <Link
      className="cine-fade font-zuume text-4xl leading-none font-bold text-white/20 uppercase outline-none hover:text-white focus-visible:text-white sm:text-5xl"
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      {person.name}
    </Link>
  );
}

function Run({
  hidden = false,
  people,
}: {
  hidden?: boolean;
  people: readonly HomePerson[];
}): JSX.Element {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className="home-ticker flex shrink-0 items-center gap-8 pr-8"
    >
      {people.map((person) => (
        <li className="flex items-center gap-8" key={person.id}>
          <Name person={person} />
          <span
            aria-hidden="true"
            className="font-zuume text-4xl text-white/10 sm:text-5xl"
          >
            /
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Ticker({
  people,
}: {
  people: readonly HomePerson[];
}): JSX.Element | null {
  if (people.length < 4) return null;

  return (
    <nav
      aria-label="People in the spotlight"
      className="home-ticker-row relative left-1/2 flex w-screen -translate-x-1/2 overflow-hidden select-none [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <Run people={people} />
      <Run hidden people={people} />
    </nav>
  );
}
