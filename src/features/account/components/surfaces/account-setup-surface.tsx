"use client";

import { useActionState, useEffect, useState } from "react";
import {
  useDockActionClass,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { accountHref } from "@/config/routes";
import { AUTH_INPUT_CLASS, useAuth } from "@/features/auth";
import { Button, Input } from "@/ui";
import { updateAccountAction } from "../../server/actions";

type SetupResult =
  | { success: true; username: string }
  | { error: string; success: false }
  | null;

function AccountSetupSurface({
  close,
}: {
  close?: (result?: { success?: boolean }) => void;
}) {
  const actionClass = useDockActionClass();
  const auth = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(() =>
    String(auth.user?.user_metadata?.full_name ?? "").trim(),
  );

  const [result, submit, pending] = useActionState<SetupResult, FormData>(
    async () => {
      const name = username.trim();
      if (!name) return { error: "Username is required", success: false };
      const update = await updateAccountAction({
        displayName: displayName.trim() || name,
        username: name,
      });
      if (!update.success) {
        return {
          error:
            update.error ||
            "Couldn't finish setting up your account. Try a different username",
          success: false,
        };
      }
      return { success: true, username: update.data.username || name };
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    close?.({ success: true });
    window.location.replace(accountHref(result.username));
  }, [close, result, toast]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <Input
        aria-label="Username"
        autoComplete="username"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="username"
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        required
        value={username}
      />
      <Input
        aria-label="Display name"
        autoComplete="name"
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="displayName"
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (optional)"
        value={displayName}
      />
      <Button
        className={actionClass({ variant: ACTION_TONE_CLASS })}
        disabled={pending || !username.trim()}
        loading={pending}
        type="submit"
      >
        Continue
      </Button>
    </form>
  );
}

export function createAccountSetupSurfaceEntry(): SurfaceEntry {
  return { component: AccountSetupSurface, title: "Set up account" };
}
