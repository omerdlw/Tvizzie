import type { JSX } from "react";
import { getAccountLibrarySummary } from "../../server/library-summary";
import {
  getRecentActivity,
  getRecentLists,
  getRecentMedia,
  getRecentReviews,
} from "../../server/browse";
import { getAccountPageContext } from "../../server/context";
import { ActivityRow } from "./activity-row";
import { EmptyState } from "./empty-state";
import { LIST_GRID, ListCard } from "./list-card";
import { PosterGrid } from "./poster-grid";
import { ReviewCard } from "./review-card";
import { SectionHeading } from "./section-heading";
import type { MediaItem } from "../../lib/browse-data";

const MEDIA_LIMIT = 6;
const LIST_LIMIT = 3;
const ACTIVITY_LIMIT = 6;
const REVIEW_LIMIT = 3;

export async function AccountOverview({
  username,
}: {
  username: string;
}): Promise<JSX.Element> {
  const { account, client, isOwner, viewerId } =
    await getAccountPageContext(username);
  const accountId = account.id;
  const base = `/account/${encodeURIComponent(account.username)}`;

  const [summary, watchlist, watched, likes, lists, activity, reviews] =
    await Promise.all([
      getAccountLibrarySummary({ accountId, client }),
      getRecentMedia({
        accountId,
        client,
        kind: "watchlist",
        limit: MEDIA_LIMIT,
      }),
      getRecentMedia({
        accountId,
        client,
        kind: "watched",
        limit: MEDIA_LIMIT,
      }),
      getRecentMedia({ accountId, client, kind: "likes", limit: MEDIA_LIMIT }),
      getRecentLists({ accountId, client, limit: LIST_LIMIT }),
      getRecentActivity({
        accountId,
        accountUsername: account.username,
        client,
        limit: ACTIVITY_LIMIT,
      }),
      getRecentReviews({ accountId, client, limit: REVIEW_LIMIT, viewerId }),
    ]);

  const { counts, favorites } = summary;
  const actor = {
    displayName: account.displayName || account.username,
    username: account.username,
  };

  const favoriteItems: MediaItem[] = favorites.map((favorite) => ({
    ...favorite,
    pinned: true,
  }));

  const media = [
    {
      href: "watchlist",
      icon: "solar:bookmark-bold",
      items: watchlist,
      kind: "watchlist",
      title: "Watchlist",
    },
    {
      href: "watched",
      icon: "solar:eye-bold",
      items: watched,
      kind: "watched",
      title: "Watched",
    },
    {
      href: "likes",
      icon: "solar:heart-bold",
      items: likes,
      kind: "likes",
      title: "Likes",
    },
  ] as const;

  const isEmpty =
    favoriteItems.length === 0 &&
    media.every((section) => section.items.length === 0) &&
    lists.length === 0 &&
    activity.length === 0 &&
    reviews.length === 0;

  if (isEmpty) {
    return (
      <EmptyState>
        {isOwner
          ? "Mark, like and list movies and they will gather here"
          : "This account has no activity or content yet"}
      </EmptyState>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10 lg:gap-12">
      {favoriteItems.length > 0 ? (
        <section>
          <SectionHeading icon="solar:star-bold" title="Favorites" />
          <PosterGrid items={favoriteItems} />
        </section>
      ) : null}

      {media.map((section) =>
        section.items.length > 0 ? (
          <section key={section.kind}>
            <SectionHeading
              href={
                counts[section.kind] > MEDIA_LIMIT
                  ? `${base}/${section.href}`
                  : undefined
              }
              icon={section.icon}
              title={section.title}
            />
            <PosterGrid
              items={section.items}
              source={isOwner ? { kind: section.kind } : null}
            />
          </section>
        ) : null,
      )}

      {lists.length > 0 ? (
        <section>
          <SectionHeading
            href={counts.lists > LIST_LIMIT ? `${base}/lists` : undefined}
            icon="solar:list-bold"
            title="Lists"
          />
          <div className={LIST_GRID}>
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                ownerEdit={isOwner}
                username={account.username}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activity.length > 0 ? (
        <section>
          <SectionHeading
            href={`${base}/activity`}
            icon="solar:bolt-bold"
            title="Recent Activity"
          />
          <div className="flex flex-col gap-2">
            {activity.map((item) => (
              <ActivityRow actor={actor} item={item} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section>
          <SectionHeading
            href={counts.reviews > REVIEW_LIMIT ? `${base}/reviews` : undefined}
            icon="solar:chat-round-bold"
            title="Recent Reviews"
          />
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <ReviewCard
                isOwner={isOwner}
                key={review.id}
                review={review}
                signedIn={viewerId !== null}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
