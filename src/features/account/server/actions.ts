"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { accountHref } from "@/config/routes";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { requireUser } from "@/features/auth/server";
import type { AccountPatchInput, CurrentAccount } from "../lib/types";
import { updateAccount } from "./profile";

type FollowStatus = "accepted" | "pending";

function revalidateAccount(username?: string | null): void {
  if (username) revalidatePath(accountHref(username));
  revalidatePath("/account");
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<FollowStatus>> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return err("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { data: targets, error: targetError } = await client.rpc(
      "get_account_follow_target",
      { p_user_id: followingId },
    );
    if (targetError) throw targetError;
    if (!targets?.[0]) return err("Account not found");

    const status: FollowStatus = targets[0].is_private ? "pending" : "accepted";
    const { error } = await client
      .from("account_follows")
      .upsert(
        { follower_id: user.id, following_id: followingId, status },
        { onConflict: "follower_id,following_id" },
      );
    if (error) throw error;

    revalidateAccount(targetUsername);
    return ok(status);
  } catch (error: unknown) {
    report("AccountAction follow", error);
    return err(
      toUserMessage(error, {
        fallback: "Couldn't follow this account. Please try again",
      }),
      "FOLLOW_FAILED",
    );
  }
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<null>> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return err("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { error } = await client
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    if (error) throw error;

    revalidateAccount(targetUsername);
    return ok(null);
  } catch (error: unknown) {
    report("AccountAction unfollow", error);
    return err(
      toUserMessage(error, {
        fallback: "Couldn't unfollow this account. Please try again",
      }),
      "UNFOLLOW_FAILED",
    );
  }
}

export async function updateAccountAction(
  input: AccountPatchInput,
): Promise<Result<CurrentAccount>> {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const { account } = await updateAccount({ client, input, userId: user.id });
    if (!account) {
      return err("Your account couldn't be updated. Please try again");
    }

    revalidateAccount(account.username);
    return ok(account);
  } catch (error: unknown) {
    report("AccountAction update account", error);
    return err(
      toUserMessage(error, {
        fallback: "Your account couldn't be updated. Please try again",
      }),
      "ACCOUNT_UPDATE_FAILED",
    );
  }
}
