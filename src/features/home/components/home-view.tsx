import type { JSX } from "react";
import { CONTAINER_CLASS, PAGE_CLASS, Scene, SceneBody } from "@/motion";
import { SCENE } from "../lib/motion";
import type { HomeFeed } from "../lib/types";
import { Canon } from "./canon";
import { HomeChrome } from "./home-chrome";
import { HomeCommunity } from "./home-community";
import { HomeDiscover } from "./home-discover";
import { HomeFooter } from "./home-footer";
import { HomeReel } from "./home-reel";
import { PointerPoster } from "./pointer-poster";
import { Pulse } from "./pulse";
import { Showtimes } from "./showtimes";
import { Ticker } from "./ticker";

const SECTIONS = "flex w-full flex-col gap-28 sm:gap-32 lg:gap-40";

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const hasReel = feed.reel.length > 0;

  return (
    <Scene className={PAGE_CLASS} score={SCENE}>
      <h1 className="sr-only">Tvizzie</h1>
      <HomeChrome />
      <PointerPoster />
      {hasReel ? <HomeReel movies={feed.reel} /> : null}

      <SceneBody
        className={`${CONTAINER_CLASS} ${SECTIONS} ${
          hasReel ? "-mt-28 sm:-mt-36 lg:-mt-44" : "pt-24"
        }`}
      >
        <Pulse movies={feed.pulse} />
        <Showtimes soon={feed.soon} theatres={feed.theatres} />
        <Canon />
        <Ticker people={feed.names} />
        <HomeDiscover initial={feed.discover} />
        <HomeCommunity />
        <HomeFooter />
      </SceneBody>
    </Scene>
  );
}
