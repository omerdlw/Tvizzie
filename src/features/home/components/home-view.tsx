import type { JSX } from "react";
import type { HomeFeed } from "../lib/types";
import { Awards } from "./awards";
import { Canon } from "./canon";
import { Darkroom } from "./darkroom";
import { Opening } from "./opening";
import { Tunnel } from "./tunnel";

// Each section after the first is pulled up over the end of the one before,
// so their boxes overlap; a section's box lets the pointer through, and only
// its stage, while it is up, takes it.
export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  return (
    <main className="relative bg-black [--gutter:max(16px,3vw)]">
      <Opening films={feed.trending} week={feed.week} />
      <Tunnel soon={feed.soon} theatres={feed.theatres} today={feed.today} />
      <Canon films={feed.canon} />
      <Awards films={feed.laureates} />
      <Darkroom directors={feed.directors} />
    </main>
  );
}
