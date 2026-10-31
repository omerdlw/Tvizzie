import type { JSX } from "react";
import { AccountDiaryView } from "@/features/account/server";
import type { SearchParams } from "@/infrastructure/http/search-params";

export default async function AccountDiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountDiaryView query={query} username={username} />;
}
