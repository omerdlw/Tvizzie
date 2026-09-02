'use client';

import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { resolveAuthErrorMessage } from '@/domains/auth/utils/errors';
import {
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
} from '@/domains/auth/ui/components/form-primitives';
import { useAuth } from '@/modules/auth';
import { useSurfaceHeader } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { cn } from '@/ui/class-names';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button, Input } from '@/ui/primitives';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

function getMfaDescription(mode) {
  return isMfaVerificationMode(mode)
    ? 'Enter the six-digit code from your authenticator app'
    : 'Scan the QR code or use the setup key';
}

function isMfaVerificationMode(mode) {
  return mode === 'reauth' || mode === 'sign-in' || mode === 'sign-in-primary';
}

function normalizeMfaOtpCode(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

function formatSetupKey(value) {
  return String(value || '').match(/.{1,4}/g)?.join(' ') || '';
}

const MFA_SETUP_TIMEOUT_MS = 15_000;

function resolveMfaSetup(setupMfa) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Authenticator setup timed out. Please try again')),
      MFA_SETUP_TIMEOUT_MS,
    );
  });

  return Promise.race([Promise.resolve().then(setupMfa), timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function createMfaSetupSurfaceEntry(data = {}, config = {}) {
  const verificationMode = isMfaVerificationMode(data?.mode);

  return {
    component: MfaSetupSurface,
    icon: 'solar:shield-check-bold',
    title: verificationMode ? 'Verify authenticator' : 'Set up authenticator',
    description: getMfaDescription(data?.mode),
    descriptionMaxLines: 1,
    props: { data },
    ...config,
  };
}

function OtpBoxes({ code, disabled, inputRef, isFocused, setCode, setIsFocused }) {
  const activeIndex = code.length >= 6 ? 5 : code.length;

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Authenticator code"
        disabled={disabled}
        value={code}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => setCode(normalizeMfaOtpCode(event.target.value))}
        onPaste={(event) => {
          event.preventDefault();
          setCode(normalizeMfaOtpCode(event.clipboardData?.getData('text')));
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
                'center h-14 rounded-[20px] ring-1 ring-inset ring-white/5 text-lg font-semibold text-white/70 transition-all duration-300 ease-in-out hover:text-white',
                isActive &&
                  !digit &&
                  'bg-white/5 text-white hover:bg-white/10 hover:ring-white/10',
                digit && 'bg-success/15 text-success ring-success/30 hover:bg-success/20 hover:ring-success/20',
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

export default function MfaSetupSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const setHeader = useSurfaceHeader();
  const codeInputRef = useRef(null);
  const lastAutoSubmittedCodeRef = useRef('');
  const [setupData, setSetupData] = useState(data || {});
  const [code, setCode] = useState('');
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isPreparing, setIsPreparing] = useState(typeof data?.setupMfa === 'function');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setupKey = String(setupData?.secret || '').trim();
  const verificationMode = isMfaVerificationMode(setupData?.mode);
  const primarySignInMode = setupData?.mode === 'sign-in-primary';

  useEffect(() => {
    if (typeof data?.setupMfa !== 'function') return undefined;

    let isMounted = true;
    setIsPreparing(true);
    void resolveMfaSetup(data.setupMfa)
      .then((enrollment) => {
        if (isMounted) setSetupData({ ...data, ...enrollment, setupMfa: null });
      })
      .catch((error) => {
        if (!isMounted) return;
        isMounted = false;
        toast.error(resolveAuthErrorMessage(error, 'Authenticator setup could not be started'));
        close({ success: false });
      })
      .finally(() => {
        if (isMounted) setIsPreparing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [close, data, toast]);

  useEffect(() => {
    setHeader?.({
      description: isPreparing
        ? 'Preparing authenticator setup'
        : getMfaDescription(setupData?.mode),
      headerAction: null,
      icon: 'solar:shield-check-bold',
      title: verificationMode ? 'Verify authenticator' : 'Set up authenticator',
      trailing: null,
    });
  }, [isPreparing, setHeader, setupData?.mode, verificationMode]);

  const handleCopySetupKey = async () => {
    if (!setupKey || typeof navigator?.clipboard?.writeText !== 'function') {
      toast.error('Setup key could not be copied');
      return;
    }

    try {
      await navigator.clipboard.writeText(setupKey);
      toast.success('Setup key copied');
    } catch {
      toast.error('Setup key could not be copied');
    }
  };

  const handleVerify = useCallback(async () => {
    if (isSubmitting || String(code).trim().length < 6) return;
    setIsSubmitting(true);
    try {
      if (primarySignInMode) {
        const result = await auth.signIn({
          code: String(code).replace(/\D/g, '').slice(0, 6),
          provider: 'mfa-primary',
        });
        toast.success('Authenticator verified');
        close({ success: true, session: result?.session || null });
        return;
      }

      const challenge = setupData?.challengeId
        ? { challengeId: setupData.challengeId }
        : await auth.challengeMfa({ factorId: setupData?.factorId });
      await auth.verifyMfa({
        challengeId: challenge?.challengeId,
        code: String(code).replace(/\D/g, '').slice(0, 6),
        factorId: setupData?.factorId,
      });
      toast.success(verificationMode ? 'Authenticator verified' : 'Authenticator enabled');
      close({ success: true });
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Authenticator code could not be verified'));
      setIsSubmitting(false);
    }
  }, [
    auth,
    close,
    code,
    setupData?.challengeId,
    setupData?.factorId,
    isSubmitting,
    primarySignInMode,
    toast,
    verificationMode,
  ]);

  useEffect(() => {
    const normalizedCode = normalizeMfaOtpCode(code);

    if (!verificationMode || normalizedCode.length !== 6) {
      lastAutoSubmittedCodeRef.current = '';
      return;
    }

    if (isSubmitting || lastAutoSubmittedCodeRef.current === normalizedCode) return;

    lastAutoSubmittedCodeRef.current = normalizedCode;
    void handleVerify();
  }, [code, handleVerify, isSubmitting, verificationMode]);

  const handleUseEmailCode = async () => {
    if (isSubmitting || !data?.email) return;
    setIsSubmitting(true);
    try {
      const result = await auth.signIn({ email: data.email, preferredMethod: 'email' });
      if (!result?.requiresVerification) {
        throw new Error('Email verification could not be started');
      }
      close({
        challenge: result.challenge || null,
        email: result.email || data.email,
        success: false,
        useEmailCode: true,
      });
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Email verification could not be started'));
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex flex-col gap-2.5"
    >
      {isPreparing ? (
        <div className="flex min-h-14 items-center justify-center rounded-[20px] bg-white/5 px-4 text-sm text-white/50 ring-1 ring-inset ring-white/5">
          Preparing authenticator setup
        </div>
      ) : null}
      {!isPreparing && setupData?.qrCode ? (
        <div className="center rounded-[20px] bg-white p-4">
          <AdaptiveImage
            mode="img"
            src={setupData.qrCode}
            alt="Scan this QR code with your authenticator app"
            className="size-52 object-contain"
            wrapperClassName="size-52 bg-transparent"
          />
        </div>
      ) : null}
      {!isPreparing && setupKey ? (
        <Input
          readOnly
          value={formatSetupKey(setupKey)}
          aria-label="Authenticator setup key"
          onClick={() => void handleCopySetupKey()}
          onFocus={(event) => event.target.select()}
          classNames={{
            wrapper: 'w-full',
            input:
              'h-12 w-full cursor-copy rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 font-mono text-sm text-white/70 outline-none focus:ring-white/10',
          }}
        />
      ) : null}
      <OtpBoxes
        code={code}
        disabled={isPreparing || isSubmitting}
        inputRef={codeInputRef}
        isFocused={isCodeFocused}
        setCode={setCode}
        setIsFocused={setIsCodeFocused}
      />
      {!isPreparing && !verificationMode ? (
        <Button
          type="button"
          onClick={() => void handleVerify()}
          disabled={isPreparing || isSubmitting || code.length < 6}
          classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
        >
          {isSubmitting ? 'Verifying' : 'Enable authenticator'}
        </Button>
      ) : null}
      {primarySignInMode ? (
        <Button
          type="button"
          onClick={() => void handleUseEmailCode()}
          disabled={isSubmitting}
          classNames={AUTH_SECONDARY_BUTTON_CLASSNAMES}
        >
          Use email code instead
        </Button>
      ) : null}
    </motion.div>
  );
}
