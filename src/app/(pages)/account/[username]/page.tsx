import type { JSX } from "react";
import { AccountOverviewView } from "@/features/account/server";

export default async function AccountOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<JSX.Element> {
  return <AccountOverviewView username={(await params).username} />;
}
