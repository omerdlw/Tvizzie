import type { JSX } from "react";
import { AccountMediaView } from "@/features/account/server";
import type { SearchParams } from "@/infrastructure/http/search-params";

export default async function AccountLikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountMediaView kind="likes" query={query} username={username} />;
}
