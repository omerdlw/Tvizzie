"use client";

import { useEffect, useRef } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { DOCK_EVENTS } from "@omerdlw/base-framework/modules/dock";
import {
  clearLastKnownAccount,
  signedInStatus,
  saveLastKnownAccount,
  useAccount,
} from "@/features/account";
import { useAuth } from "../lib/provider";

const STATUS_DURATION_MS = 3000;

function takeOAuthReturnFlag(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("auth") !== "login") return false;
  url.searchParams.delete("auth");
  window.history.replaceState(null, "", url.toString());
  return true;
}

export function AuthListener(): null {
  const auth = useAuth();
  const { account: currentAccount } = useAccount();
  const lastAccount = useRef(currentAccount);
  const resolved = useRef(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentAccount) return;
    lastAccount.current = currentAccount;
    saveLastKnownAccount(currentAccount);
  }, [currentAccount]);

  useEffect(() => {
    if (!auth.isReady) return;
    const userId = auth.user?.id ?? null;
    const returnedFromOAuth = takeOAuthReturnFlag();
    const settled = resolved.current;

    if (
      userId &&
      (returnedFromOAuth || (settled && previousUserId.current !== userId))
    ) {
      const details = signedInStatus({
        account: currentAccount || lastAccount.current,
        user: auth.user,
      });
      globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
        ...details,
        duration: STATUS_DURATION_MS,
        type: "LOGIN",
      });
    } else if (settled && !userId && previousUserId.current) {
      clearLastKnownAccount();
      globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
        description: "See you soon",
        duration: STATUS_DURATION_MS,
        icon: "solar:logout-2-bold",
        title: "Signed out",
        type: "LOGOUT",
      });
    }

    resolved.current = true;
    previousUserId.current = userId;
  }, [auth.isReady, auth.user, currentAccount]);

  return null;
}
