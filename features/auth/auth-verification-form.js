'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { requestVerificationCode, verifyCodeRequest } from '@/features/auth/api';
import {
  formatVerificationExpiry,
  normalizeEmail,
  resolveVerificationErrorMessage,
  resolveVerificationTimestamp,
} from '@/features/auth/utils';
import { cn } from '@/core/utils';
import { useToast } from '@/core/modules/notification/hooks';
import { Button } from '@/ui/elements';

const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

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
                'center border-info bg-primary/40 hover:bg-primary/80 h-15 border border-black/10 text-lg font-semibold text-black/70 transition-colors hover:border-black/20 hover:text-black',
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

export default function AuthVerificationForm({
  close,
  data,
  autoFocusCodeInput = false,
  className = 'space-y-3.5 p-2',
  onMetaChange,
}) {
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
  const autoSendOnOpen = data?.autoSendOnOpen !== false;
  const initialChallenge =
    data?.initialChallenge && typeof data.initialChallenge === 'object' ? data.initialChallenge : null;
  const initialChallengeToken = String(initialChallenge?.challengeToken || '').trim();
  const hasValidVerificationEmail =
    purpose === PURPOSES.ACCOUNT_DELETE ||
    purpose === PURPOSES.PASSWORD_CHANGE ||
    purpose === PURPOSES.PASSWORD_SET ||
    purpose === PURPOSES.PROVIDER_LINK ||
    (email && email.includes('@'));

  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [expiresAt, setExpiresAt] = useState(initialChallenge?.expiresAt || null);
  const [resendAvailableAt, setResendAvailableAt] = useState(initialChallenge?.resendAvailableAt || null);
  const [now, setNow] = useState(Date.now());
  const [rememberDevice, setRememberDevice] = useState(Boolean(data?.rememberDevice));

  const resendRemainingMs = Math.max(0, resolveVerificationTimestamp(resendAvailableAt) - now);
  const codeRemainingMs = Math.max(0, resolveVerificationTimestamp(expiresAt) - now);
  const resendRemainingSeconds = Math.max(0, Math.ceil(resendRemainingMs / 1000));
  const canResendCode = resendRemainingMs <= 0;
  const codeExpiryLabel = formatVerificationExpiry(expiresAt);
  const isCodeExpired = Boolean(expiresAt) && codeRemainingMs <= 0;
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [hasCodeError, setHasCodeError] = useState(false);
  const shouldShowRememberDevice = purpose === PURPOSES.SIGN_IN && data?.allowRememberDevice !== false;

  const sendCode = useCallback(
    async ({ isInitial = false } = {}) => {
      if (isSending || isSubmitting) return;

      if (!hasValidVerificationEmail) {
        toast.error('A valid email address is required');
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

        if (!isInitial) {
          toast.success('A new verification code has been sent', {
            id: `auth-verification-resend-${purpose}`,
          });
        }
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
      hasValidVerificationEmail,
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
    if (!autoSendOnOpen || initialChallengeToken || !hasValidVerificationEmail) {
      return;
    }

    autoSentRef.current = true;
    void sendCode({ isInitial: true });
  }, [autoSendOnOpen, hasValidVerificationEmail, initialChallengeToken, sendCode]);

  useEffect(() => {
    if (!autoFocusCodeInput) return;

    const timeoutId = window.setTimeout(() => {
      codeInputRef.current?.focus?.();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoFocusCodeInput]);

  useEffect(() => {
    if (typeof onMetaChange !== 'function') {
      return;
    }

    onMetaChange({
      codeExpiryLabel,
      hasChallenge: Boolean(challengeToken),
      isExpired: isCodeExpired,
      isSending,
    });
  }, [challengeToken, codeExpiryLabel, isCodeExpired, isSending, onMetaChange]);

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
        toast.success('Verification completed successfully');
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitVerification();
  };

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

  return (
    <form onSubmit={handleSubmit} className={className} aria-busy={isSending || isSubmitting}>
      <OtpBoxes
        code={code}
        disabled={isSubmitting || isSending || isCodeExpired}
        hasError={hasCodeError}
        inputRef={codeInputRef}
        isFocused={isCodeFocused}
        setIsFocused={setIsCodeFocused}
        setCode={setCode}
      />

      {shouldShowRememberDevice ? (
        <label className="mx-1 flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            disabled={isSubmitting || isSending}
            className="size-4"
          />
          <span>Remember this device for 30 days</span>
        </label>
      ) : null}
      <div className="grid gap-2">
        <Button
          type="button"
          onClick={() => void sendCode({ isInitial: false })}
          disabled={isSubmitting || isSending || !canResendCode}
          className="hover:bg-info h-11 w-full flex-auto border border-black/10 bg-black/5 px-6 text-[11px] font-bold tracking-widest text-black/70 uppercase transition hover:text-white"
        >
          {isSending ? 'Sending' : canResendCode ? 'Resend' : `Resend in ${resendRemainingSeconds}s`}
        </Button>
      </div>
    </form>
  );
}
