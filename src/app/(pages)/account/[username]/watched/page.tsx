import type { JSX } from "react";
import type { SearchParams } from "@/features/account/lib/browse";
import { MediaCollectionPage } from "@/features/account/components/browse/media-collection-page";

export default async function AccountWatchedPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const { username } = await params;
  return (
    <MediaCollectionPage
      kind="watched"
      searchParams={searchParams}
      username={username}
    />
  );
}
