import type { JSX } from "react";
import { AccountOverview } from "@/features/account/components/browse/overview";

export default async function AccountOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<JSX.Element> {
  const { username } = await params;
  return <AccountOverview username={username} />;
}
