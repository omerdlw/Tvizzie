import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/features/auth/server/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type { PublicAccount } from "../lib/types";
import { getPublicAccount } from "./profile";

interface AccountPageContext {
  account: PublicAccount;
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  isOwner: boolean;
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

  return {
    account,
    client,
    isOwner: viewer?.id === account.id,
    viewerId: viewer?.id ?? null,
  };
}
