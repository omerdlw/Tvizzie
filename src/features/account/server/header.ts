import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { report } from "@omerdlw/base-framework/utils";
import type { Database } from "@/infrastructure/supabase/client";
import type { MutualFollowers } from "@/features/social/lib/types";
import { toPerson } from "@/features/social/lib/utils";

export interface AccountHeader {
  followersCount: number;
  followingCount: number;
  followStatus: string | null;
  // A locked profile shows no numbers of its library.
  library: {
    lists: number;
    reviews: number;
    thisYear: number;
    watched: number;
  } | null;
  // Only for a signed-in viewer on someone else's profile.
  mutual: MutualFollowers | null;
}

interface HeaderRow {
  follow_status: string | null;
  followers_count: number;
  following_count: number;
  library: {
    lists: number;
    reviews: number;
    this_year: number;
    watched: number;
  } | null;
  mutual: {
    people: {
      account_id: string;
      avatar_url: string | null;
      display_name: string | null;
      username: string;
    }[];
    total: number;
  } | null;
}

const EMPTY_HEADER: AccountHeader = {
  followersCount: 0,
  followingCount: 0,
  followStatus: null,
  library: null,
  mutual: null,
};

// What every account page shows around itself, in one round trip: the
// viewer's follow, the follow counts, who they both follow and the library's
// numbers. Read separately it was six requests on every account page.
export async function getAccountHeader({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient<Database>;
}): Promise<AccountHeader> {
  const { data, error } = await client.rpc("get_account_header", {
    p_account_id: accountId,
  });
  if (error) {
    report("Account header read", error);
    return EMPTY_HEADER;
  }

  const row = data as unknown as HeaderRow | null;
  if (!row) return EMPTY_HEADER;

  return {
    followersCount: row.followers_count,
    followingCount: row.following_count,
    followStatus: row.follow_status,
    library: row.library && {
      lists: row.library.lists,
      reviews: row.library.reviews,
      thisYear: row.library.this_year,
      watched: row.library.watched,
    },
    mutual: row.mutual && {
      people: row.mutual.people.map(toPerson),
      total: row.mutual.total,
    },
  };
}
