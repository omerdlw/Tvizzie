"use client";

import { useMemo, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import {
  getAuthCallbackUrl,
  getAuthErrorMessage,
  linkIdentity,
  OAUTH_PROVIDERS,
  unlinkIdentity,
  useAuth,
  type OAuthProvider,
} from "@/features/auth";
import { Button, Icon } from "@/ui";
import { ROW_BUTTON_CLASS } from "./shared";

const PROVIDERS: Record<OAuthProvider, { icon: string; label: string }> = {
  github: { icon: "mdi:github", label: "GitHub" },
  google: { icon: "flat-color-icons:google", label: "Google" },
  x: { icon: "simple-icons:x", label: "X" },
};

function providerOf(identity: UserIdentity): OAuthProvider | null {
  const name = identity.provider.trim().toLowerCase();
  if (name === "google" || name === "google.com") return "google";
  if (name === "github" || name === "github.com") return "github";
  if (["x", "x.com", "twitter", "twitter.com"].includes(name)) return "x";
  return null;
}

export function ProvidersPanel({
  identities,
  reload,
}: {
  identities: UserIdentity[];
  reload: () => Promise<void>;
}) {
  const auth = useAuth();
  const toast = useToast();
  const [linking, setLinking] = useState<OAuthProvider | null>(null);
  const [unlinking, setUnlinking] = useState<OAuthProvider | null>(null);
  const [unlinkedIds, setUnlinkedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const active = useMemo(
    () => identities.filter((identity) => !unlinkedIds.has(identity.id)),
    [identities, unlinkedIds],
  );

  const connected = useMemo(() => {
    const linked = new Map<OAuthProvider, UserIdentity>();
    for (const identity of active) {
      const provider = providerOf(identity);
      if (provider) linked.set(provider, identity);
    }
    return linked;
  }, [active]);

  async function unlink(provider: OAuthProvider, identity: UserIdentity) {
    if (unlinking || !auth.client) return;
    if (active.length < 2) {
      toast("Keep at least one sign-in method connected to this account");
      return;
    }
    const { label } = PROVIDERS[provider];
    setUnlinking(provider);
    try {
      await unlinkIdentity(auth.client, identity);
      setUnlinkedIds((ids) => new Set([...ids, identity.id]));
      toast(`${label} disconnected`);
      await reload();
      await auth.refresh();
    } catch (error) {
      toast(getAuthErrorMessage(error, `Couldn't disconnect ${label}`));
    } finally {
      setUnlinking(null);
    }
  }

  async function link(provider: OAuthProvider) {
    if (linking || !auth.client) return;
    setLinking(provider);
    try {
      await linkIdentity(auth.client, provider, getAuthCallbackUrl("/account"));
    } catch (error) {
      setLinking(null);
      toast(
        getAuthErrorMessage(
          error,
          `Couldn't connect ${PROVIDERS[provider].label}`,
        ),
      );
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {[...connected].map(([provider, identity]) => (
        <div
          className="flex h-10 w-full items-center justify-between rounded-[16px] bg-white/[0.06] p-1 pl-4 text-white ring-1 ring-inset ring-white/[0.04]"
          key={provider}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Icon
              className="shrink-0"
              icon={PROVIDERS[provider].icon}
              size={18}
            />
            <span className="truncate text-sm font-medium text-white">
              {PROVIDERS[provider].label}
            </span>
          </div>
          <Button
            className={cn(ROW_BUTTON_CLASS, "py-0", ACTION_TONE_CLASS)}
            disabled={Boolean(unlinking)}
            loading={unlinking === provider}
            onClick={() => unlink(provider, identity)}
          >
            Disconnect
          </Button>
        </div>
      ))}
      {OAUTH_PROVIDERS.filter((provider) => !connected.has(provider)).map(
        (provider) => (
          <Button
            className="group/link flex h-10 w-full items-center justify-between rounded-[16px] bg-white/[0.06] px-4 text-white/70 ring-1 ring-inset ring-white/[0.04] hover:bg-white/10 hover:text-white hover:ring-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(linking)}
            key={provider}
            loading={linking === provider}
            onClick={() => link(provider)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon
                className="ui-glyph center shrink-0 text-white/70 group-hover/link:text-white"
                icon={PROVIDERS[provider].icon}
                size={18}
              />
              <span className="truncate text-sm font-medium">
                Connect {PROVIDERS[provider].label}
              </span>
            </span>
            <Icon
              className="center shrink-0 text-white/50 group-hover/link:text-white/80"
              icon="solar:link-linear"
              size={16}
            />
          </Button>
        ),
      )}
    </div>
  );
}
