"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { globalEvents } from "@omerdlw/base-framework/events";
import {
  DOCK_EVENTS,
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { Button, Icon, Input, Spinner } from "@/ui";
import {
  isSeedEmail,
  requestEmailAuth,
  signInSeedAccount,
  signInWithOAuth,
  signInWithPasskey,
} from "../lib/client";
import { OAUTH_PROVIDERS } from "../lib/constants";
import { getAuthErrorMessage } from "../lib/messages";
import { useAuth } from "../lib/provider";
import type { OAuthProvider } from "../lib/types";
import { getAuthCallbackUrl, sanitizeNextPath } from "../lib/utils";
import { createVerificationSurfaceEntry } from "./verification-surface";

type SignInMethod = OAuthProvider | "email" | "passkey";

interface SignInData {
  email?: string;
  next?: string | null;
}

interface SignInSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: SignInData;
}

const SURFACE_WIDTH = 250;
const REDIRECT_TIMEOUT_MS = 12000;

const METHODS: Record<SignInMethod, { icon: string; label: string }> = {
  email: { icon: "solar:letter-bold", label: "Email" },
  github: { icon: "mdi:github", label: "GitHub" },
  google: { icon: "flat-color-icons:google", label: "Google" },
  passkey: { icon: "solar:key-bold", label: "Passkey" },
  x: { icon: "simple-icons:x", label: "X" },
};

export const AUTH_INPUT_CLASS =
  "h-10 w-full rounded-[16px] bg-white/[0.06] px-4 text-sm text-white ring-1 ring-inset ring-white/[0.04] placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:ring-white/[0.12] focus:outline-none";

const PRIMARY_CLASS =
  "ui-sheen center h-10 w-full cursor-pointer gap-2 rounded-[16px] bg-white px-4 text-[13px] font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 [--sheen-ink:0_0_0] [--sheen:0.08]";

const SECONDARY_CLASS =
  "center h-10 w-full cursor-pointer gap-2 rounded-[16px] bg-white/[0.06] px-3 text-[13px] font-medium text-white/75 ring-1 ring-inset ring-white/[0.04] hover:bg-white/10 hover:text-white hover:ring-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50";

const LEGAL_LINK_CLASS =
  "underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/70";

function showSigningIn(description: string) {
  globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
    description,
    duration: 0,
    flow: "login",
    icon: <Spinner size={24} />,
    priority: 110,
    themeType: "LOGIN",
    title: "Signing In",
    type: "LOGIN",
  });
}

function clearSigningIn() {
  globalEvents.emit(DOCK_EVENTS.STATUS_CLEAR, { flow: "login", type: "LOGIN" });
}

function usePostAuthRedirect(next?: string | null): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const query = searchParams.toString();
    const current = `${pathname || "/"}${query ? `?${query}` : ""}`;
    return sanitizeNextPath(next || current, "/");
  }, [next, pathname, searchParams]);
}

function MethodButton({
  busy,
  disabled,
  method,
  onSelect,
  primary = false,
}: {
  busy: boolean;
  disabled: boolean;
  method: SignInMethod;
  onSelect: (method: SignInMethod) => void;
  primary?: boolean;
}) {
  const { icon, label } = METHODS[method];
  return (
    <Button
      aria-label={`Continue with ${label}`}
      className={primary ? PRIMARY_CLASS : SECONDARY_CLASS}
      disabled={disabled}
      loading={busy}
      onClick={() => onSelect(method)}
    >
      <Icon className="shrink-0" icon={icon} size={16} />
      <span className="truncate">
        {primary ? `Continue with ${label}` : label}
      </span>
    </Button>
  );
}

function SignInSurface({ close, data = {} }: SignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const toast = useToast();
  const [active, setActive] = useState<SignInMethod | null>(null);
  const redirectTimer = useRef<number | null>(null);
  const postAuthRedirect = usePostAuthRedirect(data.next);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  async function signIn(method: OAuthProvider | "passkey") {
    if (!auth.client) return;
    setActive(method);
    showSigningIn(
      method === "passkey"
        ? "Preparing passkey sign-in"
        : `Redirecting to ${METHODS[method].label} sign-in`,
    );

    let redirecting = false;
    try {
      if (method === "passkey") {
        await signInWithPasskey(auth.client);
        close?.({ success: true });
        window.location.replace(postAuthRedirect);
        return;
      }
      await signInWithOAuth(
        auth.client,
        method,
        getAuthCallbackUrl(postAuthRedirect),
      );
      redirecting = true;
      redirectTimer.current = window.setTimeout(
        clearSigningIn,
        REDIRECT_TIMEOUT_MS,
      );
    } catch (error) {
      clearSigningIn();
      toast(
        getAuthErrorMessage(error, "Couldn't sign you in. Please try again"),
      );
    } finally {
      if (!redirecting) setActive(null);
    }
  }

  function select(method: SignInMethod) {
    if (active) return;
    if (method === "email") {
      openSurface(
        createEmailSignInSurfaceEntry({
          email: data.email?.trim(),
          next: postAuthRedirect,
        }),
      );
      return;
    }
    void signIn(method);
  }

  if (!auth.isConfigured) {
    return (
      <p className="rounded-[16px] bg-white/[0.06] px-4 py-3 text-sm text-white/70 ring-1 ring-inset ring-white/[0.04]">
        Configure the Supabase variables in .env.local first
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <MethodButton
        busy={active === "passkey"}
        disabled={Boolean(active)}
        method="passkey"
        onSelect={select}
        primary
      />
      <div className="grid w-full grid-cols-2 gap-2.5">
        {(["email", ...OAUTH_PROVIDERS] as const).map((method) => (
          <MethodButton
            busy={active === method}
            disabled={Boolean(active)}
            key={method}
            method={method}
            onSelect={select}
          />
        ))}
      </div>
      <p className="px-4 pt-0.5 text-center text-[11px] leading-4 text-balance text-white/40">
        By continuing you agree to the{" "}
        <Link
          className={LEGAL_LINK_CLASS}
          href="/terms"
          onClick={() => close?.()}
          prefetch={false}
        >
          Terms
        </Link>{" "}
        and the{" "}
        <Link
          className={LEGAL_LINK_CLASS}
          href="/privacy"
          onClick={() => close?.()}
          prefetch={false}
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

type EmailResult =
  | { email: string; signedIn: boolean; success: true }
  | { error: string; success: false }
  | null;

function EmailSignInSurface({ data = {} }: SignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const toast = useToast();
  const [email, setEmail] = useState(() => data.email?.trim() ?? "");
  const postAuthRedirect = usePostAuthRedirect(data.next);

  const [result, submit, pending] = useActionState<EmailResult, FormData>(
    async () => {
      const target = email.trim();
      if (!target) return { error: "Email is required", success: false };
      try {
        if (isSeedEmail(target)) {
          await signInSeedAccount(target);
          window.location.replace(postAuthRedirect);
          return { email: target, signedIn: true, success: true };
        }
        if (!auth.client) throw new Error("Authentication is not configured");
        await requestEmailAuth(auth.client, {
          createUser: true,
          email: target,
        });
        return { email: target, signedIn: false, success: true };
      } catch (error) {
        return {
          error: getAuthErrorMessage(
            error,
            "Couldn't send your code. Please try again",
          ),
          success: false,
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    if (!result.signedIn) {
      openSurface(
        createVerificationSurfaceEntry({
          email: result.email,
          next: postAuthRedirect,
        }),
      );
    }
  }, [openSurface, postAuthRedirect, result, toast]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <Input
        aria-label="Email"
        autoComplete="email"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        type="email"
        value={email}
      />
      <Button
        className={PRIMARY_CLASS}
        disabled={pending}
        loading={pending}
        type="submit"
      >
        <span className="truncate">Continue with email</span>
      </Button>
    </form>
  );
}

function createEmailSignInSurfaceEntry(data: SignInData): SurfaceEntry {
  return {
    component: EmailSignInSurface,
    props: { data },
    title: "Sign In",
    width: SURFACE_WIDTH,
  };
}

export function createSignInSurfaceEntry(data: SignInData = {}): SurfaceEntry {
  return {
    component: SignInSurface,
    props: { data },
    title: "Sign In",
    width: SURFACE_WIDTH,
  };
}
