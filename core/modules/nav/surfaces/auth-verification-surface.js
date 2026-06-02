'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { requestVerificationCode, verifyCodeRequest } from '@/features/auth/requests';
import {
  formatVerificationExpiry,
  normalizeEmail,
  resolveVerificationErrorMessage,
  resolveVerificationTimestamp,
} from '@/features/auth/auth-flow';
import { resolveAuthVerificationHeader } from '@/core/modules/modal/header';
import { useSurfaceHeader } from './surface-shell';
import { useToast } from '@/core/modules/notification/hooks';
import { cn } from '@/core/utils';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import { Spinner } from '@/ui/loadings/spinner';

const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

function dismissSurface(close) {
  if (typeof close === 'function') {
    close({
      success: false,
      cancelled: true,
    });
  }
}

function closeVerification(close, result) {
  if (typeof close === 'function') {
    close(result);
  }
}

function normalizeOtpValue(value) {
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 6);
}

function OtpBoxes({ code, disabled, hasError, inputRef, isFocused, onPasteComplete, setIsFocused, setCode }) {
  const activeIndex = code.length >= 6 ? 5 : code.length;

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        disabled={disabled}
        value={code}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => setCode(normalizeOtpValue(event.target.value))}
        onPaste={(event) => {
          event.preventDefault();
          const pastedCode = normalizeOtpValue(event.clipboardData?.getData('text'));

          setCode(pastedCode);

          if (pastedCode.length === 6) {
            onPasteComplete?.(pastedCode);
          }
        }}
        className="absolute inset-0 z-10 bg-transparent text-transparent [caret-color:transparent] outline-none"
      />

      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = code[index] || '';
          const isActive = isFocused && activeIndex === index;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                'center border-info bg-primary/30 hover:bg-primary/50 h-13 border border-black/10 text-lg font-semibold text-black/70 transition-colors hover:border-black/20 hover:text-black',
                hasError &&
                  digit &&
                  'border-error/20 bg-error/20 text-error hover:border-error/10 hover:bg-error/10 border',
                isActive &&
                  !digit &&
                  'border border-black/10 bg-black/5 text-black hover:border-black/10 hover:bg-black/10',
                digit &&
                  !hasError &&
                  'border-success/20 bg-success/20 text-success hover:border-success/10 hover:bg-success/10 border'
              )}
            >
              {digit || <span className="invisible">0</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthVerificationSurface({ close, data, header }) {
  const toast = useToast();
  const autoSentRef = useRef(false);
  const codeInputRef = useRef(null);
  const lastAutoSubmittedCodeRef = useRef('');
  const resetErrorTimeoutRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const completedRef = useRef(false);
  const activeSubmissionKeyRef = useRef('');

  const purpose = String(data?.purpose || '')
    .trim()
    .toLowerCase();
  const email = normalizeEmail(data?.email);
  const identifier = String(data?.identifier || '').trim();
  const hasValidVerificationTarget =
    purpose === PURPOSES.ACCOUNT_DELETE ||
    purpose === PURPOSES.PASSWORD_CHANGE ||
    purpose === PURPOSES.PASSWORD_SET ||
    purpose === PURPOSES.PROVIDER_LINK ||
    (email && email.includes('@')) ||
    ((purpose === PURPOSES.SIGN_IN || purpose === PURPOSES.PASSWORD_RESET) && Boolean(identifier));

  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [rememberDevice, setRememberDevice] = useState(Boolean(data?.rememberDevice));
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);

  const resendRemainingMs = Math.max(0, resolveVerificationTimestamp(resendAvailableAt) - now);
  const codeRemainingMs = Math.max(0, resolveVerificationTimestamp(expiresAt) - now);
  const resendRemainingSeconds = Math.max(0, Math.ceil(resendRemainingMs / 1000));
  const canResendCode = resendRemainingMs <= 0;
  const codeExpiryLabel = formatVerificationExpiry(expiresAt);
  const isCodeExpired = Boolean(expiresAt) && codeRemainingMs <= 0;
  const shouldShowRememberDevice = purpose === PURPOSES.SIGN_IN && data?.allowRememberDevice !== false;

  const [meta, setMeta] = useState(() => ({
    codeExpiryLabel: null,
    hasChallenge: false,
    isExpired: false,
    isSending: hasValidVerificationTarget,
  }));

  const sendCode = useCallback(
    async ({ isInitial = false } = {}) => {
      if (isSending || isSubmitting) return;

      if (!hasValidVerificationTarget) {
        toast.error('A valid username or email is required');
        return;
      }

      if (!isInitial && !canResendCode) {
        toast.error(`Please wait ${resendRemainingSeconds}s before resending`);
        return;
      }

      setIsSending(true);

      try {
        const challenge = await requestVerificationCode({
          email,
          identifier,
          forceNew:
            isInitial &&
            data?.forceNewCodeOnOpen === true &&
            (purpose === PURPOSES.SIGN_IN || purpose === PURPOSES.SIGN_UP),
          purpose,
        });

        setCode('');
        setChallengeToken(String(challenge?.challengeToken || '').trim());
        setExpiresAt(challenge?.expiresAt || null);
        setResendAvailableAt(challenge?.resendAvailableAt || null);
        setNow(Date.now());
        setHasCodeError(false);
        lastAutoSubmittedCodeRef.current = '';
        completedRef.current = false;
        activeSubmissionKeyRef.current = '';
      } catch (error) {
        if (isInitial) {
          autoSentRef.current = false;
        }

        toast.error(resolveVerificationErrorMessage(error, 'Verification code could not be sent'), {
          id: `auth-verification-send-${purpose}`,
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      canResendCode,
      email,
      hasValidVerificationTarget,
      identifier,
      isSending,
      isSubmitting,
      purpose,
      resendRemainingSeconds,
      data?.forceNewCodeOnOpen,
      toast,
    ]
  );

  useEffect(() => {
    return () => {
      if (resetErrorTimeoutRef.current) {
        window.clearTimeout(resetErrorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!resendAvailableAt && !expiresAt) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expiresAt, resendAvailableAt]);

  useEffect(() => {
    if (autoSentRef.current) return;
    if (!hasValidVerificationTarget) {
      return;
    }

    autoSentRef.current = true;
    void sendCode({ isInitial: true });
  }, [hasValidVerificationTarget, sendCode]);

  useEffect(() => {
    if (!challengeToken || isSending) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      codeInputRef.current?.focus?.();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [challengeToken, isSending]);

  useEffect(() => {
    const shouldShowSendingState = isSending || (hasValidVerificationTarget && !challengeToken);

    setMeta((prev) => ({
      ...prev,
      codeExpiryLabel,
      hasChallenge: Boolean(challengeToken),
      isExpired: isCodeExpired,
      isSending: shouldShowSendingState,
    }));
  }, [challengeToken, codeExpiryLabel, hasValidVerificationTarget, isCodeExpired, isSending]);

  const submitVerification = useCallback(
    async (codeValue = code) => {
      const normalizedCode = normalizeOtpValue(codeValue);
      const submissionKey = `${challengeToken}:${normalizedCode}`;

      if (completedRef.current || submitInFlightRef.current || isSubmitting || isSending) {
        return;
      }
      if (isCodeExpired) {
        toast.error('Verification code has expired. Request a new code');
        return;
      }

      if (!challengeToken) {
        toast.error('Verification session was not found. Request a new code');
        return;
      }

      if (!/^\d{6}$/.test(normalizedCode)) {
        toast.error('Verification code must be 6 digits');
        return;
      }
      if (activeSubmissionKeyRef.current === submissionKey) {
        return;
      }

      activeSubmissionKeyRef.current = submissionKey;
      submitInFlightRef.current = true;
      setIsSubmitting(true);

      try {
        const verificationResult = await verifyCodeRequest({
          challengeToken,
          code: normalizedCode,
          email,
          rememberDevice,
          purpose,
        });

        completedRef.current = true;
        closeVerification(close, {
          success: true,
          purpose,
          email,
          rememberDevice,
          session: verificationResult?.session || null,
          passwordResetProof: verificationResult?.passwordResetProof || null,
          signUpProof: verificationResult?.signUpProof || null,
          verifiedAt: verificationResult?.verifiedAt || null,
        });
      } catch (error) {
        const resolvedMessage = resolveVerificationErrorMessage(error, 'Verification could not be completed');
        const shouldIgnoreAlreadyUsedAfterSuccess = completedRef.current && resolvedMessage.includes('already used');

        if (shouldIgnoreAlreadyUsedAfterSuccess) {
          return;
        }

        if (resolvedMessage === 'Verification code is invalid') {
          setHasCodeError(true);

          if (resetErrorTimeoutRef.current) {
            window.clearTimeout(resetErrorTimeoutRef.current);
          }

          resetErrorTimeoutRef.current = window.setTimeout(() => {
            setCode('');
            setHasCodeError(false);
            setIsCodeFocused(false);
            resetErrorTimeoutRef.current = null;
            codeInputRef.current?.focus?.();
          }, 1000);
        }

        toast.error(resolvedMessage, {
          id: `auth-verification-submit-${purpose}`,
        });
      } finally {
        if (!completedRef.current && activeSubmissionKeyRef.current === submissionKey) {
          activeSubmissionKeyRef.current = '';
        }
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [challengeToken, close, code, email, isCodeExpired, isSending, isSubmitting, purpose, rememberDevice, toast]
  );

  useEffect(() => {
    const normalizedCode = normalizeOtpValue(code);

    if (hasCodeError && normalizedCode.length < 6) {
      setHasCodeError(false);
    }

    if (normalizedCode.length !== 6) {
      lastAutoSubmittedCodeRef.current = '';
      return;
    }

    if (isSubmitting || isSending || isCodeExpired || !challengeToken) {
      return;
    }

    const autoSubmitKey = `${challengeToken}:${normalizedCode}`;

    if (lastAutoSubmittedCodeRef.current === autoSubmitKey) {
      return;
    }

    lastAutoSubmittedCodeRef.current = autoSubmitKey;

    void submitVerification(normalizedCode);
  }, [challengeToken, code, hasCodeError, isCodeExpired, isSending, isSubmitting, submitVerification]);

  const resolvedHeader = useMemo(() => {
    const fallbackHeader = resolveAuthVerificationHeader({
      data,
    });

    const defaultDescription = header?.description || 'Enter the 6-digit code sent to your email';
    const dynamicDescription = meta?.isExpired
      ? 'Süre doldu'
      : meta?.isSending && !meta?.codeExpiryLabel
        ? 'Sending verification code'
        : meta?.codeExpiryLabel
          ? `Code expires at ${meta.codeExpiryLabel}`
          : defaultDescription;

    return {
      title: header?.title || fallbackHeader.title,
      description: dynamicDescription,
    };
  }, [data, header?.description, header?.title, meta?.codeExpiryLabel, meta?.isExpired, meta?.isSending]);

  const headerIcon = meta?.isSending && !meta?.hasChallenge ? <Spinner size={24} /> : 'solar:shield-keyhole-bold';

  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: headerIcon,
        title: resolvedHeader.title,
        description: resolvedHeader.description,
        trailing: null,
      });
    }
  }, [setHeader, headerIcon, resolvedHeader.title, resolvedHeader.description]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitVerification();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-0.5" aria-busy={isSending || isSubmitting}>
      <OtpBoxes
        code={code}
        disabled={isSubmitting || isSending || isCodeExpired || !challengeToken}
        hasError={hasCodeError}
        inputRef={codeInputRef}
        isFocused={isCodeFocused}
        setIsFocused={setIsCodeFocused}
        setCode={setCode}
      />

      <div className="grid gap-2">
        <Button
          className="hover:bg-info h-11 w-full flex-auto border border-black/10 bg-black/5 px-6 text-[11px] font-bold tracking-widest text-black/70 uppercase transition hover:text-white"
          disabled={isSubmitting || isSending || !canResendCode}
          onClick={() => void sendCode({ isInitial: false })}
          type="button"
        >
          {isSending ? 'Sending' : canResendCode ? 'Resend' : `Resend in ${resendRemainingSeconds}s`}
        </Button>

        {shouldShowRememberDevice ? (
          <button
            type="button"
            disabled={isSubmitting || isSending}
            aria-pressed={rememberDevice}
            onClick={() => setRememberDevice((prev) => !prev)}
            className={cn(
              'flex h-11 w-full items-center gap-2 border px-3 text-left text-[11px] font-bold tracking-widest uppercase transition',
              rememberDevice
                ? 'border-success/30 bg-success/15 text-success hover:bg-success/20'
                : 'border-black/10 bg-black/5 text-black/70 hover:bg-black/10 hover:text-black',
              (isSubmitting || isSending) && 'cursor-not-allowed opacity-60'
            )}
          >
            <span
              className={cn(
                'center size-4 border transition-colors',
                rememberDevice
                  ? 'border-success/40 bg-success text-white'
                  : 'border-black/20 bg-transparent text-transparent'
              )}
              aria-hidden="true"
            >
              <Icon icon="material-symbols:check-small-rounded" size={14} />
            </span>
            <span>Remember this device for 30 days</span>
          </button>
        ) : null}
      </div>
    </form>
  );
}
