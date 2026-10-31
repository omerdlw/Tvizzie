import type { JSX } from "react";
import { GRAMMAR, Stage, landed, size } from "@/motion/stage";
import { CONTAINER_CLASS, PAGE_CLASS } from "@/ui";
import type { HomeFeed } from "../lib/types";
import { HomeHero } from "./home-hero";
import { HomeJoin } from "./home-join";
import { HomeLists } from "./home-lists";
import { HomeMembers } from "./home-members";
import { HomePulse } from "./home-pulse";
import { HomeReviews } from "./home-reviews";
import { HomeRising } from "./home-rising";
import {
  FilmRow,
  FriendsRow,
  PopularRow,
  RatedRow,
  SharedRow,
} from "./home-rows";
import { HomeShowing } from "./home-showing";

const OPENING_END = GRAMMAR.title.at + GRAMMAR.title.run + landed(1);
const OPENING = {
  end: OPENING_END,
  length: OPENING_END - GRAMMAR.opening.base + size(1),
};

// One page that scrolls like any other: no pinned scenes, no scroll-driven
// set pieces. The hero projects what members and the world are watching,
// then the sections go from the viewer's own circle outwards.
export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;
  const firstName = circle?.name.split(/\s+/)[0] ?? null;

  return (
    <Stage
      className={`home-page ${PAGE_CLASS}`}
      opening={OPENING}
      picture={feed.features.length > 0}
      wash={false}
    >
      <h1 className="sr-only">Guffin</h1>
      <div className={CONTAINER_CLASS}>
        <HomeHero features={feed.features} />

        <div className="mt-16 flex w-full flex-col gap-16 sm:mt-20 sm:gap-20">
          <HomePulse
            greeting={firstName ? `Welcome back, ${firstName}` : null}
            pulse={feed.pulse}
          />
          {circle ? <FriendsRow logs={circle.friends} /> : null}
          <PopularRow films={feed.popular} />
          {circle ? <SharedRow films={circle.shared} /> : null}
          {circle?.picks ? (
            <FilmRow
              films={circle.picks.films}
              icon="solar:magic-stick-3-bold"
              title={`Because you liked ${circle.picks.because}`}
            />
          ) : null}
          <HomeReviews reviews={feed.reviews} />
          <HomeShowing soon={feed.soon} theatres={feed.theatres} />
          <HomeRising films={feed.rising} />
          <RatedRow films={feed.rated} />
          <HomeLists lists={feed.lists} />
          <HomeMembers
            members={feed.members}
            title={
              circle && circle.following > 0
                ? "People you may know"
                : "Reviewers to follow"
            }
          />
          <HomeJoin members={feed.pulse.members} />
        </div>
      </div>
    </Stage>
  );
}
