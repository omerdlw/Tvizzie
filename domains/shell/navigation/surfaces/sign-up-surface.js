'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AUTH_PURPOSE, INITIAL_SIGN_UP_FORM } from '@/domains/auth/utils/constants';
import {
  AUTH_ROUTE_NOTICE,
  getCurrentPathWithSearch,
  resolvePostAuthRedirect,
  resolveSignInNoticeToast,
} from '@/domains/auth/utils/routes';
import { resolveAuthErrorMessage } from '@/domains/auth/utils/errors';
import {
  createPendingSignUpPayload,
  finalizeOAuthSignUp,
  finalizeSignUp,
  getSignUpStepTitle,
  getSignUpSubmitLabel,
  validateSignUpEmail,
  validateSignUpProfile,
  SIGN_UP_FEEDBACK,
} from '@/domains/auth/client/sign-up';
import { getOAuthProviderLabel, normalizeOAuthProvider } from '@/domains/auth/utils/oauth';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
} from '@/domains/auth/ui/components/form-primitives';
import { OAuthProviderList } from '@/domains/auth/ui/components/form-primitives';
import { Button, Input } from '@/ui/primitives';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { NavSurfaceHeaderButton, useNavigationActions, useSurfaceHeader } from '@/modules/nav';
import { NAV_FADE_TRANSITION, slideFadeVariants } from '@/modules/nav';
import { EVENT_TYPES, globalEvents } from '@/shared';
import AuthVerificationSurface from './verification-surface';
import { createSignInSurfaceEntry } from './sign-in-surface';

export function createSignUpSurfaceEntry(data = {}, config = {}) {
  return {
    component: SignUpSurface,
    icon: 'solar:user-plus-bold',
    title: 'Sign Up',
    description: 'Choose how you want to sign up',
    props: { data },
    ...config,
  };
}

export default function SignUpSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();
  const setHeader = useSurfaceHeader();

  const [form, setForm] = useState(() => ({
    ...INITIAL_SIGN_UP_FORM,
    email: String(data?.email || '').trim(),
  }));
  const [currentStep, setCurrentStep] = useState(-1);
  const [pendingAction, setPendingAction] = useState(null);

  const activeOAuthProvider = normalizeOAuthProvider(pendingAction);
  const isBusy = pendingAction !== null;
  const showSignedInNotice = auth.isReady && auth.isAuthenticated && !isBusy;

  const postAuthRedirect = useMemo(
    () => resolvePostAuthRedirect(data?.next ?? getCurrentPathWithSearch(pathname, searchParams)),
    [data?.next, pathname, searchParams],
  );

  const openSignInFallback = useCallback(
    async ({ identifier, notice, provider }) => {
      const noticeToast = resolveSignInNoticeToast(notice, provider);

      if (noticeToast?.type === 'warning') {
        toast.warning(noticeToast.message);
      }

      await openSurface(createSignInSurfaceEntry({ identifier, next: postAuthRedirect }));
    },
    [openSurface, postAuthRedirect, toast],
  );

  useEffect(() => {
    const feedback = SIGN_UP_FEEDBACK[pendingAction];

    if (feedback) {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        ...feedback,
        flow: 'signup-complete',
        isOverlay: true,
        priority: 110,
        statusType: 'SIGNUP',
        themeType: 'SIGNUP',
      });
      return;
    }

    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
      flow: 'signup-complete',
      phase: 'clear',
      statusType: 'SIGNUP',
    });
  }, [pendingAction]);

  useEffect(() => {
    if (!setHeader) return;

    setHeader({
      icon: 'solar:user-plus-bold',
      title:
        isBusy && pendingAction === 'creating-account'
          ? 'Creating account'
          : currentStep < 0
            ? 'Sign Up'
            : getSignUpStepTitle(currentStep),
      trailing: null,
    });
  }, [
    currentStep,
    form.email,
    isBusy,
    openSignInFallback,
    pendingAction,
    setHeader,
    showSignedInNotice,
  ]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOAuthSignUp = async (provider) => {
    if (isBusy) {
      return;
    }

    const providerLabel = getOAuthProviderLabel(provider);
    setPendingAction(provider);

    try {
      const signUpResult = await finalizeOAuthSignUp({
        auth,
        nextPath: postAuthRedirect,
        provider,
      });

      if (signUpResult?.requiresRedirect) {
        return;
      }

      close({ success: true });
      window.location.replace(postAuthRedirect);
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, `${providerLabel} sign-up failed`));
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartVerification = async (formOverride = form) => {
    let shouldResetPendingAction = true;
    setPendingAction('email');

    try {
      const pendingPayload = await createPendingSignUpPayload(formOverride);
      const email = await validateSignUpEmail(pendingPayload.email);

      setForm((prev) => ({ ...prev, email }));

      const verification = await openSurface(AuthVerificationSurface, {
        header: {
          title: 'Sign up verification',
          description: 'Verify your email to create your account',
        },
        data: {
          purpose: AUTH_PURPOSE.SIGN_UP,
          email,
          forceNewCodeOnOpen: true,
        },
      });

      if (!verification?.success) {
        if (verification?.error && !verification?.cancelled) {
          toast.error(verification.error?.message || 'Verification could not be started', {
            id: 'auth-signup-surface-verification-start-error',
          });
        }
        return;
      }

      setPendingAction('creating-account');
      await finalizeSignUp({
        auth,
        displayName: pendingPayload.displayName,
        email: pendingPayload.email,
        signUpProof: verification.signUpProof,
        username: pendingPayload.username,
      });

      shouldResetPendingAction = false;
      close({ success: true });

      window.location.replace(postAuthRedirect);
    } catch (error) {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: 'signup-complete',
        phase: 'failure',
        statusType: 'SIGNUP',
      });

      toast.error(resolveAuthErrorMessage(error, 'Sign-up could not be completed'), {
        id: 'auth-signup-surface-complete-error',
      });
    } finally {
      if (shouldResetPendingAction) {
        setPendingAction(null);
      }
    }
  };

  const handleStepSubmit = async (event) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    if (currentStep === 0) {
      setPendingAction('step-email');

      try {
        const email = await validateSignUpEmail(form.email);
        setForm((prev) => ({ ...prev, email }));
        setCurrentStep(1);
      } catch (error) {
        if (String(error?.code || '').trim() === 'OAUTH_ACCOUNT_ALREADY_REGISTERED') {
          await openSignInFallback({
            identifier: form.email,
            notice: AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED,
            provider: error?.data?.provider,
          });
          return;
        }

        toast.error(resolveAuthErrorMessage(error, 'Enter a valid email'), {
          id: 'auth-signup-surface-step-email-error',
        });
      } finally {
        setPendingAction(null);
      }

      return;
    }

    if (currentStep === 1) {
      setPendingAction('step-profile');

      try {
        const profile = await validateSignUpProfile(form);
        const nextForm = { ...form, ...profile };

        setForm(nextForm);
        await handleStartVerification(nextForm);
      } catch (error) {
        toast.error(resolveAuthErrorMessage(error, 'Check your profile details and try again'), {
          id: 'auth-signup-surface-step-profile-error',
        });
      } finally {
        setPendingAction(null);
      }

      return;
    }

    await handleStartVerification();
  };

  const submitLabel = getSignUpSubmitLabel(currentStep, pendingAction);

  const handleMethodSelect = (provider) => {
    if (provider === 'email') {
      setCurrentStep(0);
      return;
    }

    return handleOAuthSignUp(provider);
  };

  return (
    <form onSubmit={handleStepSubmit} className="flex flex-col gap-2.5" aria-busy={isBusy}>
      {currentStep < 0 ? (
        <OAuthProviderList
          activeProvider={activeOAuthProvider}
          disabled={isBusy || showSignedInNotice}
          includeEmail
          mode="sign-up"
          onSelect={handleMethodSelect}
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`step-${currentStep}`}
            variants={slideFadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_FADE_TRANSITION}
            className="flex flex-col gap-2.5"
          >
            {currentStep === 0 ? (
              <>
                <Input
                  id="surface-sign-up-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  classNames={AUTH_INPUT_CLASSNAMES}
                />

                <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                  {submitLabel}
                </Button>
              </>
            ) : null}

            {currentStep === 1 ? (
              <>
                <AuthField htmlFor="surface-sign-up-username" label="Username">
                  <Input
                    id="surface-sign-up-username"
                    value={form.username}
                    onChange={(event) => handleChange('username', event.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>

                <AuthField htmlFor="surface-sign-up-display-name" label="Display name">
                  <Input
                    id="surface-sign-up-display-name"
                    value={form.displayName}
                    onChange={(event) => handleChange('displayName', event.target.value)}
                    placeholder="Display name"
                    autoComplete="name"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    disabled={isBusy}
                    classNames={AUTH_SECONDARY_BUTTON_CLASSNAMES}
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    disabled={isBusy}
                    classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
                  >
                    {submitLabel}
                  </Button>
                </div>
              </>
            ) : null}

          </motion.div>
        </AnimatePresence>
      )}
    </form>
  );
}
