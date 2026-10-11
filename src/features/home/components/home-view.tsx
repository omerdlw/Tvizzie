import type { JSX } from "react";
import type { HomeFeed } from "../lib/types";
import { Opening } from "./opening";
import { Tunnel } from "./tunnel";

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  return (
    <main className="relative bg-black [--gutter:max(16px,3vw)]">
      <Opening films={feed.trending} week={feed.week} />
      <Tunnel soon={feed.soon} theatres={feed.theatres} today={feed.today} />
    </main>
  );
}
