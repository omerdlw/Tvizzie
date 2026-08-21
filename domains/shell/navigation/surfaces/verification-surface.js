'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { requestVerificationCode, verifyCodeRequest } from '@/domains/auth/client/requests';
import { PURPOSES } from '@/domains/auth/utils/constants';
import {
  formatVerificationExpiry,
  normalizeEmail,
  resolveVerificationTimestamp,
} from '@/domains/auth/utils/routes';
import { resolveVerificationErrorMessage } from '@/domains/auth/utils/errors';
import { resolveAuthVerificationHeader } from '@/modules/modal/header';
import { useSurfaceHeader } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { Spinner } from '@/ui/feedback/spinner';

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

function OtpBoxes({
  code,
  disabled,
  hasError,
  inputRef,
  isFocused,
  onPasteComplete,
  setIsFocused,
  setCode,
}) {
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

      <div className="grid grid-cols-6 gap-2 overflow-visible">
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = code[index] || '';
          const isActive = isFocused && activeIndex === index;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                'center text-white/70-colors h-14 border border-white/5 text-lg font-semibold hover:text-white',
                hasError &&
                  digit &&
                  'border-error/30 bg-error/15 text-error hover:border-error/20 hover:bg-error/20 border',
                isActive &&
                  !digit &&
                  'border border-white/5 bg-white/5 text-white hover:border-white/10 hover:bg-white/10',
                digit &&
                  !hasError &&
                  'border-success/30 bg-success/15 text-success hover:border-success/20 hover:bg-success/20 border',
              )}
            >
              {digit ? (
                <span key={`digit-${digit}`}>{digit}</span>
              ) : (
                <span key="empty" className="invisible">
                  0
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AuthVerificationSurface({ close, data, header }) {
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
  const initialChallenge = data?.challenge || null;
  const initialChallengeToken = String(
    initialChallenge?.challengeToken || initialChallenge?.challengeKey || '',
  ).trim();
  const forceNewCodeOnOpen = purpose !== PURPOSES.SIGN_IN && data?.forceNewCodeOnOpen === true;
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
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [expiresAt, setExpiresAt] = useState(initialChallenge?.expiresAt || null);
  const [resendAvailableAt, setResendAvailableAt] = useState(
    initialChallenge?.resendAvailableAt || null,
  );
  const [now, setNow] = useState(Date.now());
  const [rememberDevice, setRememberDevice] = useState(Boolean(data?.rememberDevice));
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isStatusError, setIsStatusError] = useState(false);
  const [isCooldownError, setIsCooldownError] = useState(false);

  const resendRemainingMs = Math.max(0, resolveVerificationTimestamp(resendAvailableAt) - now);
  const codeRemainingMs = Math.max(0, resolveVerificationTimestamp(expiresAt) - now);
  const resendRemainingSeconds = Math.max(0, Math.ceil(resendRemainingMs / 1000));
  const canResendCode = resendRemainingMs <= 0;
  const codeExpiryLabel = formatVerificationExpiry(expiresAt);
  const isCodeExpired = Boolean(expiresAt) && codeRemainingMs <= 0;
  const shouldShowRememberDevice =
    purpose === PURPOSES.SIGN_IN && data?.allowRememberDevice !== false;

  const [meta, setMeta] = useState(() => ({
    codeExpiryLabel: null,
    isExpired: false,
    isSending: hasValidVerificationTarget && !initialChallengeToken,
    hasChallenge: Boolean(initialChallengeToken),
  }));

  const sendCode = useCallback(
    async ({ isInitial = false } = {}) => {
      if (isSending || isSubmitting) return;

      if (!hasValidVerificationTarget) {
        setStatusMessage('A valid username or email is required');
        setIsStatusError(true);
        return;
      }

      const currentResendMs = Math.max(
        0,
        resolveVerificationTimestamp(resendAvailableAt) - Date.now(),
      );
      if (!isInitial && currentResendMs > 0) {
        const remainingSec = Math.max(0, Math.ceil(currentResendMs / 1000));
        setStatusMessage(`Please wait ${remainingSec}s before resending`);
        setIsStatusError(true);
        setIsCooldownError(true);
        return;
      }

      setIsSending(true);
      setStatusMessage('');
      setIsStatusError(false);
      setIsCooldownError(false);

      try {
        const challenge = await requestVerificationCode({
          email,
          isInitial,
          identifier,
          forceNew: !isInitial || (isInitial && forceNewCodeOnOpen),
          purpose,
        });

        setCode('');
        setChallengeToken(
          String(challenge?.challengeToken || challenge?.challengeKey || '').trim(),
        );
        setExpiresAt(challenge?.expiresAt || null);
        setResendAvailableAt(challenge?.resendAvailableAt || null);
        setNow(Date.now());
        setHasCodeError(false);
        setIsCooldownError(false);
        lastAutoSubmittedCodeRef.current = '';
        completedRef.current = false;
        activeSubmissionKeyRef.current = '';
      } catch (error) {
        const cooldownAt = error?.data?.resendAvailableAt || null;
        if (cooldownAt) {
          setResendAvailableAt(cooldownAt);
          setNow(Date.now());
          setIsCooldownError(true);
        }
        const msg = resolveVerificationErrorMessage(error, 'Verification code could not be sent');
        setStatusMessage(msg);
        setIsStatusError(true);
      } finally {
        setIsSending(false);
      }
    },
    [
      email,
      forceNewCodeOnOpen,
      hasValidVerificationTarget,
      identifier,
      isSending,
      isSubmitting,
      purpose,
      resendAvailableAt,
    ],
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
    if (!isCooldownError || resendRemainingMs > 0) return;

    setIsCooldownError(false);
    setStatusMessage('');
    setIsStatusError(false);
  }, [isCooldownError, resendRemainingMs]);

  useEffect(() => {
    if (autoSentRef.current) return;
    if (initialChallengeToken) return;
    if (!hasValidVerificationTarget) {
      return;
    }

    autoSentRef.current = true;
    void sendCode({ isInitial: true });
  }, [hasValidVerificationTarget, initialChallengeToken, sendCode]);

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
        const resolvedMessage = resolveVerificationErrorMessage(
          error,
          'Verification could not be completed',
        );
        const shouldIgnoreAlreadyUsedAfterSuccess =
          completedRef.current && resolvedMessage.includes('already used');

        if (shouldIgnoreAlreadyUsedAfterSuccess) {
          return;
        }

        if (resolvedMessage === 'Your login verification session expired. Sign in again') {
          toast.error(resolvedMessage, {
            id: `auth-verification-session-expired-${purpose}`,
          });
          closeVerification(close, {
            success: false,
            cancelled: true,
            error: new Error(resolvedMessage),
          });
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
    [
      challengeToken,
      close,
      code,
      email,
      isCodeExpired,
      isSending,
      isSubmitting,
      purpose,
      rememberDevice,
      toast,
    ],
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
  }, [
    challengeToken,
    code,
    hasCodeError,
    isCodeExpired,
    isSending,
    isSubmitting,
    submitVerification,
  ]);

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
  }, [
    data,
    header?.description,
    header?.title,
    meta?.codeExpiryLabel,
    meta?.isExpired,
    meta?.isSending,
  ]);

  const headerIcon =
    meta?.isSending && !meta?.hasChallenge ? <Spinner size={24} /> : 'solar:shield-keyhole-bold';

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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2.5"
      aria-busy={isSending || isSubmitting}
    >
      <OtpBoxes
        code={code}
        disabled={isSubmitting || isSending || isCodeExpired || !challengeToken}
        hasError={hasCodeError}
        inputRef={codeInputRef}
        isFocused={isCodeFocused}
        setIsFocused={setIsCodeFocused}
        setCode={setCode}
      />

      {statusMessage ? (
        <div
          className={cn(
            'font-semibold-all border px-3.5 py-2.5 text-center text-xs',
            isStatusError
              ? 'bg-error/10 text-error border-error/20'
              : 'bg-success/10 text-success border-success/20',
          )}
        >
          {isCooldownError
            ? `Please wait ${resendRemainingSeconds}s before requesting a new code`
            : statusMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <button
          className="center hover:bg-info h-11 w-full flex-auto cursor-pointer border border-white/5 bg-white/5 px-3 text-xs font-bold tracking-wide text-white/70 uppercase hover:text-black disabled:cursor-not-allowed"
          disabled={isSubmitting || isSending || !canResendCode}
          onClick={() => void sendCode({ isInitial: false })}
          type="button"
        >
          {isSending
            ? 'Sending'
            : canResendCode
              ? 'Resend'
              : `Resend in ${resendRemainingSeconds}s`}
        </button>

        {shouldShowRememberDevice ? (
          <button
            type="button"
            disabled={isSubmitting || isSending}
            aria-pressed={rememberDevice}
            onClick={() => setRememberDevice((prev) => !prev)}
            className={cn(
              'uppercase-colors flex h-11 w-full cursor-pointer items-center gap-2.5 border px-3.5 text-left text-xs',
              rememberDevice
                ? 'border-success/30 bg-success/15 text-success hover:bg-success/20'
                : 'border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
              (isSubmitting || isSending) && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'center size-4 shrink-0 border',
                rememberDevice
                  ? 'border-success/40 bg-success text-black'
                  : 'border-white/5 bg-transparent text-transparent',
              )}
              aria-hidden="true"
            >
              <Icon icon="material-symbols:check-small-rounded" size={14} />
            </span>
            <span className="truncate">Remember this device for 30 days</span>
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default AuthVerificationSurface;
