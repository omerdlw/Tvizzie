import type { JSX } from "react";
import { Icon } from "@/ui";
import { FAVORITES_MAX } from "../lib/browse-data";
import { getAccountOverview } from "../server/browse";
import { getAccountPageContext } from "../server/context";
import { AccountBio } from "../components/browse/account-bio";
import { AccountLink } from "../components/browse/account-link";
import { ActivityCalendar } from "../components/browse/activity-calendar";
import { ActivityFeed } from "../components/browse/activity-row";
import { EmptyState } from "../components/browse/empty-state";
import { ListTeaser } from "../components/browse/list-row";
import { PosterGrid, PosterTile } from "../components/browse/poster-grid";
import {
  DiaryDigest,
  PeopleGrid,
  RatingsChart,
} from "../components/browse/profile-sidebar";
import { ReviewList } from "../components/browse/review-list";
import { CountLink, Section, ViewAll } from "../components/browse/section";
import { accountHref } from "@/config/routes";

const RECENT = 5;
const REVIEWS = 3;
const POPULAR = 3;
const DIARY = 10;
const LISTS = 3;
const FOLLOWING = 18;
const ACTIVITY = 5;

const ROW =
  "grid-cols-5 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-5 lg:grid-cols-5";

export async function AccountOverviewView({
  username,
}: {
  username: string;
}): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;

  const base = accountHref(account.username);

  const {
    activity,
    activityDays,
    counts,
    diary,
    favorites: pinned,
    following,
    followingCount,
    lists,
    popular: liked,
    reviews,
    spread,
    watched,
    watchlist,
  } = await getAccountOverview({
    accountId: account.id,
    accountUsername: account.username,
    client,
    limits: {
      activity: ACTIVITY,
      diary: DIARY,
      following: FOLLOWING,
      lists: LISTS,
      popular: REVIEWS + POPULAR,
      reviews: REVIEWS,
      watched: RECENT,
      watchlist: 5,
    },
  });

  const favorites = pinned.slice(0, FAVORITES_MAX);
  const shown = new Set(reviews.map((review) => review.id));
  const popular = liked
    .filter((review) => !shown.has(review.id))
    .slice(0, POPULAR);
  const ratings = spread.reduce((sum, count) => sum + count, 0);
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  return (
    <div className="grid w-full gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-12">
        {favorites.length > 0 || isOwner ? (
          <Section
            action={
              isOwner ? <ViewAll href={`${base}/likes`} label="Edit" /> : null
            }
            title="Favorite films"
          >
            <ul className={`grid ${ROW}`}>
              {favorites.map((film) => (
                <PosterTile item={film} key={film.tmdbId} />
              ))}
              {isOwner
                ? Array.from(
                    { length: FAVORITES_MAX - favorites.length },
                    (_, index) => (
                      <li key={`slot-${index}`}>
                        <AccountLink
                          aria-label="Pin a favorite from your likes"
                          className="center aspect-[2/3] rounded-[16px] border border-dashed border-white/15 text-white/25 hover:border-white/35 hover:text-white/60"
                          href={`${base}/likes`}
                        >
                          <Icon icon="solar:add-circle-linear" size={20} />
                        </AccountLink>
                      </li>
                    ),
                  )
                : null}
            </ul>
          </Section>
        ) : null}

        {watched.length > 0 ? (
          <Section
            action={
              counts.watched > watched.length ? (
                <ViewAll href={`${base}/watched`} />
              ) : null
            }
            title="Recently watched"
          >
            <PosterGrid className={ROW} items={watched} />
          </Section>
        ) : null}

        {watchlist.length > 0 ? (
          <Section
            action={
              <CountLink count={counts.watchlist} href={`${base}/watchlist`} />
            }
            title="Watchlist"
          >
            <PosterGrid className={ROW} items={watchlist} />
          </Section>
        ) : null}

        {reviews.length > 0 ? (
          <Section
            action={
              counts.reviews > reviews.length ? (
                <ViewAll href={`${base}/reviews`} label="More" />
              ) : null
            }
            title="Recent reviews"
          >
            <ReviewList
              isOwner={isOwner}
              reviews={reviews}
              signedIn={viewerId !== null}
              username={account.username}
            />
          </Section>
        ) : null}

        {popular.length > 0 ? (
          <Section
            action={
              <ViewAll href={`${base}/reviews?sort=likes_desc`} label="More" />
            }
            title="Popular reviews"
          >
            <ReviewList
              isOwner={isOwner}
              reviews={popular}
              signedIn={viewerId !== null}
              username={account.username}
            />
          </Section>
        ) : null}

        {watched.length === 0 && reviews.length === 0 ? (
          <EmptyState icon="solar:clapperboard-open-bold">
            {isOwner
              ? "Films you watch, rate and review will show up here."
              : "Nothing here yet."}
          </EmptyState>
        ) : null}

        {lists.length > 0 ? (
          <Section
            action={<CountLink count={counts.lists} href={`${base}/lists`} />}
            title="Lists"
          >
            <div className="grid gap-x-4 gap-y-8 sm:grid-cols-3">
              {lists.map((list) => (
                <ListTeaser
                  key={list.id}
                  list={list}
                  username={account.username}
                />
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <aside className="grid min-w-0 content-start gap-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-1">
        {account.bio ? (
          <Section title="Bio">
            <AccountBio
              bio={account.bio}
              displayName={account.displayName || account.username}
              username={account.username}
            />
          </Section>
        ) : null}

        {diary.length > 0 ? (
          <Section
            action={<CountLink count={counts.diary} href={`${base}/diary`} />}
            title="Diary"
          >
            <DiaryDigest entries={diary} />
          </Section>
        ) : null}

        {ratings > 0 ? (
          <Section
            action={<CountLink count={ratings} href={`${base}/reviews`} />}
            title="Ratings"
          >
            <RatingsChart spread={spread} />
          </Section>
        ) : null}

        {activity.length > 0 ? (
          <Section
            action={<ViewAll href={`${base}/activity`} />}
            title="Activity"
          >
            <div className="flex flex-col gap-6">
              <ActivityCalendar days={activityDays} />
              <ActivityFeed actor={actor} items={activity} />
            </div>
          </Section>
        ) : null}

        {following.length > 0 ? (
          <Section
            summary={followingCount.toLocaleString("en-US")}
            title="Following"
          >
            <PeopleGrid people={following} />
          </Section>
        ) : null}
      </aside>
    </div>
  );
}
