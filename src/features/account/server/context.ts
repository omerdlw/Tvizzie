import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/features/auth/server/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type { PublicAccount } from "../lib/types";
import { getAccountFollowRelation } from "./follows";
import { getPublicAccount } from "./profile";

interface AccountPageContext {
  account: PublicAccount;
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  isOwner: boolean;
  // A private account shows nothing past its hero until the viewer follows
  // it, so its pages read nothing either.
  locked: boolean;
  viewerId: string | null;
}

const loadViewer = cache(getOptionalUser);

const load = cache(async (username: string) => {
  const client = await createServerSupabaseClient();
  const [account, viewer] = await Promise.all([
    getPublicAccount({ client, username }),
    loadViewer(),
  ]);
  return { account, client, viewer };
});

const loadFollower = cache(
  async (
    client: AccountPageContext["client"],
    targetId: string,
    viewerId?: string,
  ) =>
    (await getAccountFollowRelation({ client, targetId, viewerId })).isFollower,
);

export async function getAccountPageContext(
  username: string,
): Promise<AccountPageContext> {
  let handle: string;
  try {
    handle = decodeURIComponent(username);
  } catch {
    notFound();
  }

  const { account, client, viewer } = await load(handle);
  if (!account) notFound();

  const isOwner = viewer?.id === account.id;
  const locked =
    account.isPrivate &&
    !isOwner &&
    !(await loadFollower(client, account.id, viewer?.id));

  return {
    account,
    client,
    isOwner,
    locked,
    viewerId: viewer?.id ?? null,
  };
}
