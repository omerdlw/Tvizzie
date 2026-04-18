'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ACCOUNT_CLIENT } from '@/config/account.config';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import {
  AUTH_PURPOSE,
  AUTH_ROUTES,
  assertSignUpEmailAvailable,
  buildAuthHref,
  createPendingSignUpPayload,
  finalizeOAuthSignUp,
  finalizeSignUp,
  hasSatisfiedPasswordRequirements,
  isPasswordConfirmationMismatchError,
  isPasswordRequirementError,
  resolveAuthErrorMessage,
  resolvePostAuthRedirect,
  validateAllowedEmailDomain,
} from '@/features/auth';
import AuthVerificationForm from '@/features/auth/auth-verification-form';
import { getOAuthProviderLabel, normalizeOAuthProvider } from '@/core/auth/oauth-providers';
import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';
import { setPendingAccountBootstrap } from '@/core/auth/clients/pending-account.client';
import { useAuth } from '@/core/modules/auth';
import { useNavigationActions } from '@/core/modules/nav/context';
import { useToast } from '@/core/modules/notification/hooks';
import Registry from './registry';
import SignUpView from './view';

const INITIAL_FORM = Object.freeze({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

export default function Client() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();

  const nextParam = searchParams.get('next');
  const routeNotice = searchParams.get('notice');
  const emailPrefill = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    email: emailPrefill,
  }));
  const [currentStep, setCurrentStep] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const activeOAuthProvider = normalizeOAuthProvider(pendingAction);
  const isBusy = pendingAction !== null;
  const isPasswordReady = hasSatisfiedPasswordRequirements(form.password);
  const passwordsMatch = Boolean(form.password) && form.password === form.confirmPassword;

  const postAuthRedirect = useMemo(() => resolvePostAuthRedirect(nextParam), [nextParam]);

  const signInHref = useMemo(
    () =>
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: nextParam,
        identifier: form.email || emailPrefill,
      }),
    [emailPrefill, form.email, nextParam]
  );

  useEffect(() => {
    if (!form.email && emailPrefill) {
      setForm((prev) => ({ ...prev, email: emailPrefill }));
    }
  }, [emailPrefill, form.email]);

  useEffect(() => {
    if (pendingAction === 'creating-account') {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        description: 'Creating your account and starting your session.',
        flow: 'signup-complete',
        isOverlay: true,
        phase: 'start',
        priority: 110,
        statusType: 'SIGNUP',
        themeType: 'SIGNUP',
        title: 'Creating account',
      });
      return;
    }

    if (pendingAction === 'redirecting') {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        description: 'Redirecting to your account.',
        duration: 3000,
        flow: 'signup-complete',
        isOverlay: true,
        phase: 'success',
        priority: 110,
        statusType: 'SIGNUP',
        themeType: 'SIGNUP',
        title: 'Account ready',
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
    if (!auth.isReady || !auth.isAuthenticated || isBusy) {
      return;
    }

    router.replace(postAuthRedirect);
  }, [auth.isAuthenticated, auth.isReady, isBusy, postAuthRedirect, router]);

  useEffect(() => {
    if (!routeNotice) {
      return;
    }

    if (routeNotice === AUTH_ROUTE_NOTICE.GOOGLE_SIGNUP_REQUIRED) {
      toast.warning('No account exists for this Google account. Continue with Sign Up.');
    }

    if (routeNotice === AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED) {
      toast.error('Google sign-up could not be completed. Please try again.');
    }

    if (routeNotice === AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED) {
      toast.error('Social sign-up could not be completed. Please try again.');
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('notice');
    const nextHref = params.toString() ? `/sign-up?${params.toString()}` : AUTH_ROUTES.SIGN_UP;

    router.replace(nextHref);
  }, [routeNotice, router, searchParams, toast]);

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

      router.replace(postAuthRedirect);
    } catch (error) {
      const code = String(error?.code || '').trim();
      const resolvedEmail = String(error?.data?.email || '').trim();

      if (code === 'GOOGLE_PASSWORD_LOGIN_REQUIRED') {
        const nextHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, {
          identifier: resolvedEmail || form.email,
          next: nextParam,
          notice: 'google-password-login-required',
        });
        window.location.assign(nextHref);
        return;
      }

      toast.error(resolveAuthErrorMessage(error, `${providerLabel} sign-up failed`));
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartVerification = async () => {
    let shouldResetPendingAction = true;
    setPendingAction('email');

    try {
      const pendingPayload = await createPendingSignUpPayload(form);

      const verification = await openSurface(AuthVerificationSurface, {
        header: {
          title: 'Sign up verification',
          description: 'Verify your email to create your account',
        },
        data: {
          purpose: AUTH_PURPOSE.SIGN_UP,
          email: pendingPayload.email,
          autoSendOnOpen: true,
          forceNewCodeOnOpen: true,
          formComponent: AuthVerificationForm,
        },
      });

      if (!verification?.success) {
        if (verification?.error && !verification?.cancelled) {
          toast.error(verification.error?.message || 'Verification could not be started', {
            id: 'auth-signup-verification-start-error',
          });
        }
        return;
      }

      setPendingAccountBootstrap({
        displayName: pendingPayload.displayName,
        email: pendingPayload.email,
        username: pendingPayload.username,
      });

      setPendingAction('creating-account');
      const signUpResult = await finalizeSignUp({
        auth,
        displayName: pendingPayload.displayName,
        email: pendingPayload.email,
        password: pendingPayload.password,
        signUpProof: verification.signUpProof,
        username: pendingPayload.username,
      });

      if (signUpResult?.requiresRedirect) {
        shouldResetPendingAction = false;
        return;
      }

      shouldResetPendingAction = false;
      setPendingAction('redirecting');
      router.replace(postAuthRedirect);
    } catch (error) {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: 'signup-complete',
        phase: 'failure',
        statusType: 'SIGNUP',
      });

      if (isPasswordRequirementError(error) || isPasswordConfirmationMismatchError(error)) {
        return;
      }

      toast.error(resolveAuthErrorMessage(error, 'Sign-up could not be completed'), {
        id: 'auth-signup-complete-error',
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
        const email = validateAllowedEmailDomain(form.email);
        await assertSignUpEmailAvailable({
          email,
        });
        setForm((prev) => ({ ...prev, email }));
        setCurrentStep(1);
      } catch (error) {
        toast.error(resolveAuthErrorMessage(error, 'Enter a valid email'), {
          id: 'auth-signup-step-email-error',
        });
      } finally {
        setPendingAction(null);
      }

      return;
    }

    if (currentStep === 1) {
      setPendingAction('step-profile');

      try {
        const username = ACCOUNT_CLIENT.validateUsername(form.username);
        const existingUserId = await ACCOUNT_CLIENT.getAccountIdByUsername(username);

        if (existingUserId) {
          throw new Error('This username is already taken');
        }

        setForm((prev) => ({
          ...prev,
          username,
          displayName: String(prev.displayName || '').trim(),
        }));
        setCurrentStep(2);
      } catch (error) {
        toast.error(resolveAuthErrorMessage(error, 'Check your profile details and try again'), {
          id: 'auth-signup-step-profile-error',
        });
      } finally {
        setPendingAction(null);
      }

      return;
    }

    if (!isPasswordReady) {
      return;
    }

    if (!passwordsMatch) {
      return;
    }

    await handleStartVerification();
  };

  const registry = <Registry authIsReady={auth.isReady} />;

  if (!auth.isReady || (auth.isAuthenticated && !isBusy)) {
    return <>{registry}</>;
  }

  return (
    <>
      {registry}
      <SignUpView
        activeOAuthProvider={activeOAuthProvider}
        currentStep={currentStep}
        form={form}
        handleChange={handleChange}
        handleOAuthSignUp={handleOAuthSignUp}
        handlePreviousStep={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
        handleStepSubmit={handleStepSubmit}
        isBusy={isBusy}
        isPasswordReady={isPasswordReady}
        passwordsMatch={passwordsMatch}
        signInHref={signInHref}
        pendingAction={pendingAction}
      />
    </>
  );
}
