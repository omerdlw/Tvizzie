import type { JSX } from "react";
import { AccountReviewsView } from "@/features/account/server";
import type { SearchParams } from "@/infrastructure/http/search-params";

export default async function AccountReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountReviewsView query={query} username={username} />;
}
