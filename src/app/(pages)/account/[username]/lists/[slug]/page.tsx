import type { JSX } from "react";
import { AccountListView } from "@/features/account/server";
import type { SearchParams } from "@/infrastructure/http/search-params";

export default async function AccountListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ slug, username }, query] = await Promise.all([params, searchParams]);
  return (
    <AccountListView
      query={query}
      slug={decodeURIComponent(slug)}
      username={username}
    />
  );
}
