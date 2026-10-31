"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  DockSurfaceAction,
  DockSurfaceHeaderButton,
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@omerdlw/base-framework/utils";
import { createAccountSetupSurfaceEntry } from "@/features/account";
import { requestJson } from "@/infrastructure/http/client";
import { Input, Loader } from "@/ui";
import { requestEmailAuth, verifyEmailOtp } from "../lib/client";
import { getAuthErrorMessage } from "../lib/messages";
import { useAuth } from "../lib/provider";
import { getAuthCallbackUrl, sanitizeNextPath } from "../lib/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const ERROR_RESET_DELAY_MS = 700;
const AUTO_FOCUS_DELAY_MS = 150;

const BOX_STYLES = {
  BASE: "center h-11 @[280px]:h-14 rounded-[16px] text-base @[280px]:text-lg font-semibold text-white/70 ring-1 ring-inset ring-white/5 hover:text-white",
  ERROR:
    "bg-white/10 text-white ring-white/[0.16] hover:bg-white/15 hover:ring-white/[0.16]",
  ACTIVE: "bg-white/5 text-white ring-white/10 hover:bg-white/10",
  SUCCESS:
    "bg-white/15 text-white ring-white/20 hover:bg-white/20 hover:ring-white/20",
};

interface VerificationData {
  email: string;
  next?: string | null;
  onVerified?: () => Promise<void> | void;
}

export function createVerificationSurfaceEntry(
  data: VerificationData,
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: VerificationSurface,
    props: { data },
    title: "Verify email",
    ...config,
  };
}

function normalizeOtpValue(value?: string): string {
  return (value ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
}

function useResendTimer(cooldownSeconds: number) {
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + cooldownSeconds * 1000,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resendAvailableAt) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const resendRemainingSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const canResend = resendRemainingSeconds === 0;

  const resetTimer = useCallback(() => {
    setResendAvailableAt(Date.now() + cooldownSeconds * 1000);
    setNow(Date.now());
  }, [cooldownSeconds]);

  return { resendRemainingSeconds, canResend, resetTimer };
}

interface OtpBoxesProps {
  code: string;
  disabled?: boolean;
  hasError?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  isFocused: boolean;
  onCodeChange: (value?: string) => void;
  setIsFocused: (focused: boolean) => void;
}

function OtpBoxes({
  code,
  disabled,
  hasError,
  inputRef,
  isFocused,
  onCodeChange,
  setIsFocused,
}: OtpBoxesProps) {
  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <Input
        ref={inputRef}
        aria-label="Verification code"
        autoComplete="one-time-code"
        className="absolute inset-0 z-10 size-full cursor-text rounded-none bg-transparent px-0 py-0 text-transparent opacity-0 outline-none ring-0 focus:bg-transparent focus:ring-0"
        disabled={disabled}
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onCodeChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onPaste={(event) => {
          event.preventDefault();
          onCodeChange(event.clipboardData?.getData("text"));
        }}
        type="text"
        value={code}
      />
      <div className="grid grid-cols-6 gap-1.5 @[280px]:gap-2.5 overflow-visible">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = code[index] || "";
          const isActive = isFocused && activeIndex === index;
          const isSuccess = digit && !hasError;
          const isError = hasError && digit;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                BOX_STYLES.BASE,
                isError && BOX_STYLES.ERROR,
                isActive && !digit && BOX_STYLES.ACTIVE,
                isSuccess && BOX_STYLES.SUCCESS,
              )}
            >
              {digit ? (
                <span className="ui-develop" key={digit}>
                  {digit}
                </span>
              ) : isActive ? (
                <span
                  aria-hidden="true"
                  className="ui-caret h-[1.1em] w-0.5 rounded-full bg-white"
                />
              ) : (
                <span className="invisible">0</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface VerificationSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data: VerificationData;
}

function VerificationSurface({ close, data }: VerificationSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const { next, onVerified } = data;
  const email = data.email.trim();
  const postAuthRedirect = sanitizeNextPath(next, "/account");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitInFlight = useRef(false);
  const lastSubmittedCode = useRef("");
  const resetErrorTimeout = useRef<number | null>(null);

  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { resendRemainingSeconds, canResend, resetTimer } = useResendTimer(
    RESEND_COOLDOWN_SECONDS,
  );
  const isBusy = isSubmitting || isResending;

  useEffect(() => {
    const focusTimer = window.setTimeout(
      () => inputRef.current?.focus?.(),
      AUTO_FOCUS_DELAY_MS,
    );
    return () => {
      window.clearTimeout(focusTimer);
      if (resetErrorTimeout.current)
        window.clearTimeout(resetErrorTimeout.current);
    };
  }, []);

  const sendCode = useCallback(async () => {
    if (isBusy || !canResend || !auth.client) return;

    setIsResending(true);
    try {
      await requestEmailAuth(auth.client, {
        createUser: true,
        email,
        emailRedirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
      setCode("");
      setHasCodeError(false);
      resetTimer();
    } catch (error) {
      toast(
        getAuthErrorMessage(
          error,
          "Couldn't send a new code. Please try again",
        ),
      );
    } finally {
      setIsResending(false);
    }
  }, [
    auth.client,
    canResend,
    email,
    isBusy,
    postAuthRedirect,
    resetTimer,
    toast,
  ]);

  const completeVerification = useCallback(
    async (value: string) => {
      const normalizedCode = normalizeOtpValue(value);

      if (
        !auth.client ||
        normalizedCode.length !== OTP_LENGTH ||
        isBusy ||
        submitInFlight.current ||
        lastSubmittedCode.current === normalizedCode
      )
        return;

      lastSubmittedCode.current = normalizedCode;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        await verifyEmailOtp(auth.client, email, normalizedCode);

        if (onVerified) {
          await onVerified();
          close?.({ success: true });
          return;
        }

        const me = await requestJson<{
          account: { username: string | null } | null;
        }>("/api/account/me", {
          notifyOnError: false,
          notifyOnUnauthorized: false,
        }).catch(() => null);
        const hasUsername = Boolean(me?.account?.username);

        if (!hasUsername) {
          openSurface(createAccountSetupSurfaceEntry());
          return;
        }

        close?.({ success: true });
        window.location.replace(postAuthRedirect);
      } catch (error) {
        lastSubmittedCode.current = "";
        setHasCodeError(true);
        toast(
          getAuthErrorMessage(error, "That code didn't work. Please try again"),
        );

        if (resetErrorTimeout.current)
          window.clearTimeout(resetErrorTimeout.current);

        resetErrorTimeout.current = window.setTimeout(() => {
          setCode("");
          setHasCodeError(false);
          setIsFocused(false);
          inputRef.current?.focus?.();
          resetErrorTimeout.current = null;
        }, ERROR_RESET_DELAY_MS);
      } finally {
        submitInFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [
      auth.client,
      close,
      onVerified,
      email,
      isBusy,
      openSurface,
      postAuthRedirect,
      toast,
    ],
  );

  const handleCodeChange = useCallback(
    (value?: string) => {
      const normalizedValue = normalizeOtpValue(value);
      setCode(normalizedValue);
      if (normalizedValue.length === OTP_LENGTH) {
        completeVerification(normalizedValue);
      }
    },
    [completeVerification],
  );

  if (!auth.isConfigured) {
    return (
      <p className="rounded-[16px] bg-white/[0.06] px-4 py-3 text-sm text-white/70 ring-1 ring-inset ring-white/[0.04]">
        Configure the Supabase variables in .env.local first
      </p>
    );
  }

  return (
    <>
      <DockSurfaceAction>
        <DockSurfaceHeaderButton
          disabled={isBusy || !canResend}
          onClick={sendCode}
        >
          {isResending ? (
            <Loader>Resend</Loader>
          ) : canResend ? (
            "Resend"
          ) : (
            `${resendRemainingSeconds}s`
          )}
        </DockSurfaceHeaderButton>
      </DockSurfaceAction>

      <form
        aria-busy={isBusy}
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          completeVerification(code);
        }}
      >
        <OtpBoxes
          code={code}
          disabled={isBusy}
          hasError={hasCodeError}
          inputRef={inputRef}
          isFocused={isFocused}
          onCodeChange={handleCodeChange}
          setIsFocused={setIsFocused}
        />
      </form>
    </>
  );
}
