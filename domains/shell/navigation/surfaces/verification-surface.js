'use client';

import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { requestVerificationCode, verifyCodeRequest } from '@/domains/auth/client/requests';
import { PURPOSES } from '@/domains/auth/utils/constants';
import {
  formatVerificationExpiry,
  normalizeEmail,
  resolveVerificationTimestamp,
} from '@/domains/auth/utils/routes';
import { resolveVerificationErrorMessage } from '@/domains/auth/utils/errors';
import { resolveAuthVerificationHeader } from '@/modules/modal';
import { NavSurfaceHeaderButton, useSurfaceHeader } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { cn } from '@/ui/class-names';
import { Input } from '@/ui/primitives';
import { Spinner } from '@/ui/feedback/spinner';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

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
      <Input
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
        classNames={{
          wrapper: 'absolute inset-0 z-10',
          input: 'size-full bg-transparent text-transparent [caret-color:transparent] outline-none',
        }}
      />

      <div className="grid grid-cols-6 gap-2.5 overflow-visible">
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = code[index] || '';
          const isActive = isFocused && activeIndex === index;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                'center text-white/70 h-14 rounded-[20px] ring-1 ring-inset ring-white/5 text-lg font-semibold transition-all duration-300 ease-in-out hover:text-white',
                hasError &&
                  digit &&
                  'ring-error/30 bg-error/15 text-error hover:ring-error/20 hover:bg-error/20 ring-1 ring-inset',
                isActive &&
                  !digit &&
                  'ring-1 ring-inset ring-white/5 bg-white/5 text-white hover:ring-white/10 hover:bg-white/10',
                digit &&
                  !hasError &&
                  'ring-success/30 bg-success/15 text-success hover:ring-success/20 hover:bg-success/20 ring-1 ring-inset',
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
  const initialChallenge = data?.challenge || null;
  const initialChallengeToken = String(
    initialChallenge?.challengeToken || initialChallenge?.challengeKey || '',
  ).trim();
  const forceNewCodeOnOpen = purpose !== PURPOSES.SIGN_IN && data?.forceNewCodeOnOpen === true;
  const hasValidVerificationTarget =
    purpose === PURPOSES.ACCOUNT_DELETE || (email && email.includes('@'));

  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [expiresAt, setExpiresAt] = useState(initialChallenge?.expiresAt || null);
  const [resendAvailableAt, setResendAvailableAt] = useState(
    initialChallenge?.resendAvailableAt || null,
  );
  const [now, setNow] = useState(Date.now());
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
          purpose,
        });

        completedRef.current = true;
        closeVerification(close, {
          success: true,
          purpose,
          email,
          session: verificationResult?.session || null,
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
        headerAction: (
          <NavSurfaceHeaderButton
            disabled={isSubmitting || isSending || !canResendCode}
            onClick={() => void sendCode({ isInitial: false })}
          >
            {isSending
              ? 'Sending'
              : canResendCode
                ? 'Resend'
                : `Resend in ${resendRemainingSeconds}s`}
          </NavSurfaceHeaderButton>
        ),
      });
    }
  }, [
    canResendCode,
    headerIcon,
    isSending,
    isSubmitting,
    resendRemainingSeconds,
    resolvedHeader.description,
    resolvedHeader.title,
    sendCode,
    setHeader,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitVerification();
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
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
            'font-semibold-all rounded-[20px] ring-1 ring-inset px-3.5 py-2.5 text-center text-xs',
            isStatusError
              ? 'bg-error/10 text-error ring-error/20'
              : 'bg-success/10 text-success ring-success/20',
          )}
        >
          {isCooldownError
            ? `Please wait ${resendRemainingSeconds}s before requesting a new code`
            : statusMessage}
        </div>
      ) : null}
    </motion.form>
  );
}

export default AuthVerificationSurface;
