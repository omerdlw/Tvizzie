import type { Friend, MovieSocialProof, SocialPerson } from "./types";

interface MovieProofRow {
  account_id: string;
  avatar_url: string | null;
  display_name: string | null;
  liked: boolean;
  rating: number | string | null;
  reviewed: boolean;
  total: number | string;
  username: string;
  watched: boolean;
  watchlisted: boolean;
}

export function toPerson(row: {
  account_id: string;
  avatar_url: string | null;
  display_name: string | null;
  username: string;
}): SocialPerson {
  return {
    avatarUrl: row.avatar_url,
    displayName: row.display_name?.trim() || row.username,
    id: row.account_id,
    username: row.username,
  };
}

export function buildMovieSocialProof(
  rows: readonly MovieProofRow[],
): MovieSocialProof {
  const friends: Friend[] = rows.map((row) => {
    const rating = row.rating === null ? null : Number(row.rating);
    return {
      ...toPerson(row),
      liked: row.liked,
      rating: rating !== null && Number.isFinite(rating) ? rating : null,
      reviewed: row.reviewed,
      watched: row.watched,
      watchlisted: row.watchlisted && !row.watched,
    };
  });

  const rated = friends.flatMap((friend) =>
    friend.rating === null ? [] : [friend.rating],
  );

  return {
    averageRating:
      rated.length > 0
        ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length
        : null,
    counts: {
      liked: friends.filter((friend) => friend.liked).length,
      ratings: rated.length,
      reviews: friends.filter((friend) => friend.reviewed).length,
      watched: friends.filter((friend) => friend.watched).length,
      watchlist: friends.filter((friend) => friend.watchlisted).length,
    },
    friends,
    total: Number(rows[0]?.total ?? 0),
  };
}

export function formatNames(names: readonly string[], shown = 2): string {
  if (names.length <= shown) {
    return names.length <= 1
      ? (names[0] ?? "")
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  const rest = names.length - shown;
  return `${names.slice(0, shown).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

export type ProofTab = "all" | "watched" | "liked" | "watchlist" | "reviews";

export function matchesTab(friend: Friend, tab: ProofTab): boolean {
  switch (tab) {
    case "watched":
      return friend.watched;
    case "liked":
      return friend.liked;
    case "watchlist":
      return friend.watchlisted;
    case "reviews":
      return friend.reviewed;
    default:
      return true;
  }
}

export function describeProof(proof: MovieSocialProof): {
  details: string;
  headline: string;
} {
  const { counts, friends } = proof;
  const namesOf = (pick: (friend: Friend) => boolean) =>
    friends.filter(pick).map((friend) => friend.displayName);

  let headline: string;
  let lead: "liked" | "watched" | "watchlist";
  if (counts.watched > 0) {
    headline = `${formatNames(namesOf((friend) => friend.watched))} watched this`;
    lead = "watched";
  } else if (counts.watchlist > 0) {
    const names = namesOf((friend) => friend.watchlisted);
    headline = `${formatNames(names)} ${names.length === 1 ? "wants" : "want"} to watch this`;
    lead = "watchlist";
  } else {
    headline = `${formatNames(namesOf((friend) => friend.liked))} liked this`;
    lead = "liked";
  }

  const details: string[] = [];
  if (lead !== "liked" && counts.liked > 0) {
    details.push(`${counts.liked} liked`);
  }
  if (counts.reviews > 0) {
    details.push(
      `${counts.reviews} ${counts.reviews === 1 ? "review" : "reviews"}`,
    );
  }
  if (lead !== "watchlist" && counts.watchlist > 0) {
    details.push(`${counts.watchlist} to watch`);
  }
  if (proof.averageRating !== null) {
    details.push(`★ ${proof.averageRating.toFixed(1)} average`);
  }

  return { details: details.join(" · "), headline };
}
