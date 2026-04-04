'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  AUTH_PURPOSE,
  AUTH_ROUTES,
  assertPasswordAccountStatus,
  buildAuthHref,
  completePasswordReset,
  createError,
  isEmailIdentifier,
  resolveAuthErrorMessage,
  resolvePostAuthRedirect,
  resolveSignInEmail,
  validatePassword,
} from '@/features/auth';
import AuthVerificationForm from '@/features/auth/auth-verification-form';
import { consumeAuthRouteNoticeCookie } from '@/core/auth/clients/auth-route-notice.client';
import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import AuthVerificationSurface from '@/core/modules/nav/surfaces/auth-verification-surface';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { useAuth } from '@/core/modules/auth';
import { useNavigationActions } from '@/core/modules/nav/context';
import { useToast } from '@/core/modules/notification/hooks';
import Registry from './registry';
import View from './view';

const INITIAL_RESET_FLOW = Object.freeze({
  active: false,
  email: '',
  passwordResetProof: '',
  newPassword: '',
  confirmPassword: '',
  isSubmitting: false,
});

export default function Client() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();

  const nextParam = searchParams.get('next');
  const routeNotice = searchParams.get('notice');
  const identifierPrefill = useMemo(
    () => searchParams.get('identifier') || searchParams.get('email') || '',
    [searchParams]
  );

  const [identifier, setIdentifier] = useState(identifierPrefill);
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isPreparingReset, setIsPreparingReset] = useState(false);
  const [isIdentifierChecking, setIsIdentifierChecking] = useState(false);
  const [currentStep, setCurrentStep] = useState('identifier');
  const [resetFlow, setResetFlow] = useState(INITIAL_RESET_FLOW);
  const isSubmitting = isPasswordSubmitting || isGoogleSubmitting;
  const isSignInBusy = isSubmitting || isPreparingReset || isIdentifierChecking;
  const isResetMode = resetFlow.active;

  const postAuthRedirect = useMemo(() => resolvePostAuthRedirect(nextParam), [nextParam]);

  const signUpHref = useMemo(
    () =>
      buildAuthHref(AUTH_ROUTES.SIGN_UP, {
        next: nextParam,
        email: isEmailIdentifier(identifier) ? identifier : '',
      }),
    [identifier, nextParam]
  );

  useEffect(() => {
    if (!identifier && identifierPrefill) {
      setIdentifier(identifierPrefill);
    }
  }, [identifier, identifierPrefill]);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated) {
      return;
    }

    router.replace(postAuthRedirect);
  }, [auth.isAuthenticated, auth.isReady, postAuthRedirect, router]);

  useEffect(() => {
    const cookieNotice = routeNotice ? consumeAuthRouteNoticeCookie() : '';
    const activeNotice = routeNotice || cookieNotice;

    if (!activeNotice) {
      return;
    }

    if (activeNotice === AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED) {
      toast.warning('This email is already used by another account. Sign in with your password once to link Google.');
    }

    if (activeNotice === AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED) {
      toast.error('Google sign-in could not be completed. Please try again.');
    }

    if (activeNotice === AUTH_ROUTE_NOTICE.GOOGLE_PROVIDER_COLLISION) {
      toast.error('This Google account is already linked to another account');
    }

    if (!routeNotice) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('notice');
    const nextHref = params.toString() ? `/sign-in?${params.toString()}` : AUTH_ROUTES.SIGN_IN;

    router.replace(nextHref);
  }, [routeNotice, router, searchParams, toast]);

  const finalizeVerifiedSignIn = async (verificationResult) => {
    if (!verificationResult?.success) {
      return false;
    }

    if (verificationResult?.session?.user) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
        session: verificationResult.session,
        source: 'login-verification',
        user: verificationResult.session.user,
      });
    }

    toast.success('Signed in successfully');
    window.location.replace(postAuthRedirect);
    return true;
  };

  const handleLoginVerification = async (signInResult) => {
    if (!signInResult?.requiresVerification) {
      return false;
    }

    const verification = await openSurface(AuthVerificationSurface, {
      header: {
        title: 'Login verification',
        description: 'Verify your email to finish signing in',
      },
      data: {
        allowRememberDevice: false,
        autoSendOnOpen: true,
        email: signInResult.email || '',
        forceNewCodeOnOpen: true,
        formComponent: AuthVerificationForm,
        purpose: AUTH_PURPOSE.SIGN_IN,
        rememberDevice,
      },
    });

    return finalizeVerifiedSignIn(verification);
  };

  const handleContinueToPassword = async (event) => {
    event.preventDefault();

    if (isSignInBusy || resetFlow.active) {
      return;
    }

    setIsIdentifierChecking(true);

    try {
      await resolveSignInEmail(identifier);
      setCurrentStep('password');
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Could not continue'));
    } finally {
      setIsIdentifierChecking(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSignInBusy || resetFlow.active) {
      return;
    }

    let passwordAccountEligible = false;
    setIsPasswordSubmitting(true);
    try {
      const rawPassword = String(password || '');
      const trimmedPassword = rawPassword.trim();

      if (!trimmedPassword) {
        throw new Error('Password is required');
      }

      const { email } = await resolveSignInEmail(identifier);
      await assertPasswordAccountStatus({
        email,
        intent: 'sign-in',
      });
      passwordAccountEligible = true;
      let signInResult = null;

      try {
        signInResult = await auth.signIn({
          email,
          password: rawPassword,
        });
      } catch (error) {
        const errorCode = String(error?.code || '')
          .trim()
          .toLowerCase();
        const errorMessage = String(error?.message || '')
          .trim()
          .toLowerCase();
        const isInvalidCredentials =
          errorCode === 'invalid_credentials' ||
          errorCode === 'invalid_login_credentials' ||
          errorCode === 'auth/invalid-credential' ||
          errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('invalid_credentials') ||
          errorMessage.includes('auth/invalid-credential');

        if (isInvalidCredentials && rawPassword !== trimmedPassword && trimmedPassword) {
          signInResult = await auth.signIn({
            email,
            password: trimmedPassword,
          });
        } else {
          throw error;
        }
      }

      if (signInResult?.requiresRedirect) {
        return;
      }

      if (signInResult?.requiresVerification) {
        const didCompleteVerification = await handleLoginVerification(signInResult);

        if (!didCompleteVerification) {
          return;
        }

        return;
      }

      toast.success('Signed in successfully');
      router.replace(postAuthRedirect);
    } catch (error) {
      const code = String(error?.code || '').trim();
      const message = String(error?.message || '').trim();
      const resolvedError =
        passwordAccountEligible &&
        (code === 'auth/invalid-credential' ||
          code === 'invalid_credentials' ||
          code === 'invalid_login_credentials' ||
          message.includes('auth/invalid-credential') ||
          message.toLowerCase().includes('invalid login credentials') ||
          message.toLowerCase().includes('invalid_credentials'))
          ? createError('auth/wrong-password')
          : error;

      toast.error(resolveAuthErrorMessage(resolvedError, 'Sign-in failed'));
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSignInBusy || resetFlow.active) {
      return;
    }

    setIsGoogleSubmitting(true);
    try {
      const signInResult = await auth.signIn({
        googleAuthIntent: 'sign-in',
        next: postAuthRedirect,
        provider: 'google',
      });

      if (signInResult?.requiresRedirect) {
        return;
      }

      if (signInResult?.requiresVerification) {
        const didCompleteVerification = await handleLoginVerification(signInResult);

        if (!didCompleteVerification) {
          return;
        }

        return;
      }

      toast.success('Signed in successfully');
      router.replace(postAuthRedirect);
    } catch (error) {
      const code = String(error?.code || '').trim();
      const resolvedEmail = String(error?.data?.email || '').trim();

      if (code === 'GOOGLE_SIGNUP_REQUIRED') {
        const nextHref = buildAuthHref(AUTH_ROUTES.SIGN_UP, {
          email: resolvedEmail,
          next: nextParam,
          notice: 'google-signup-required',
        });
        window.location.assign(nextHref);
        return;
      }

      if (code === 'GOOGLE_PASSWORD_LOGIN_REQUIRED' && resolvedEmail) {
        setIdentifier(resolvedEmail);
      }

      toast.error(resolveAuthErrorMessage(error, 'Google sign-in failed'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (isSignInBusy || resetFlow.isSubmitting) {
      return;
    }

    setIsPreparingReset(true);

    try {
      const { email } = await resolveSignInEmail(identifier);
      await assertPasswordAccountStatus({
        email,
        intent: 'password-reset',
      });

      const verification = await openSurface(AuthVerificationSurface, {
        header: {
          title: 'Reset password verification',
          description: 'Verify your email before setting a new password',
        },
        data: {
          purpose: AUTH_PURPOSE.PASSWORD_RESET,
          email,
          autoSendOnOpen: true,
          formComponent: AuthVerificationForm,
        },
      });

      if (!verification?.success || !verification?.passwordResetProof) {
        setResetFlow(INITIAL_RESET_FLOW);
        return;
      }

      setResetFlow({
        ...INITIAL_RESET_FLOW,
        active: true,
        email,
        passwordResetProof: verification.passwordResetProof,
      });
    } catch (error) {
      setResetFlow(INITIAL_RESET_FLOW);
      toast.error(resolveAuthErrorMessage(error, 'Password reset request failed'));
    } finally {
      setIsPreparingReset(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();

    if (resetFlow.isSubmitting) {
      return;
    }

    if (!resetFlow.passwordResetProof || !resetFlow.email) {
      toast.error('Password reset verification was not completed');
      setResetFlow(INITIAL_RESET_FLOW);
      return;
    }

    setResetFlow((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const normalizedPassword = validatePassword(resetFlow.newPassword);

      if (normalizedPassword !== String(resetFlow.confirmPassword || '')) {
        throw new Error('Password confirmation does not match');
      }

      await completePasswordReset({
        email: resetFlow.email,
        newPassword: normalizedPassword,
        passwordResetProof: resetFlow.passwordResetProof,
      });

      toast.success('Password reset completed successfully');
      setIdentifier(resetFlow.email);
      setPassword('');
      setResetFlow(INITIAL_RESET_FLOW);
    } catch (error) {
      setResetFlow(INITIAL_RESET_FLOW);
      toast.error(resolveAuthErrorMessage(error, 'Password reset could not be completed'));
    } finally {
      setResetFlow((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const registry = (
    <Registry
      authIsReady={auth.isReady}
      isGoogleSubmitting={isGoogleSubmitting}
      isResetMode={isResetMode}
      onGoogleSignIn={handleGoogleSignIn}
    />
  );

  if (!auth.isReady || (auth.isAuthenticated && !isSubmitting && !isPreparingReset && !resetFlow.isSubmitting)) {
    return <>{registry}</>;
  }

  return (
    <>
      {registry}
      <View
        currentStep={currentStep}
        handleContinueToPassword={handleContinueToPassword}
        handleGoBackToIdentifier={() => setCurrentStep('identifier')}
        handleRequestPasswordReset={handleRequestPasswordReset}
        handleResetSubmit={handleResetSubmit}
        handleSubmit={handleSubmit}
        identifier={identifier}
        isIdentifierChecking={isIdentifierChecking}
        isPasswordSubmitting={isPasswordSubmitting}
        isPreparingReset={isPreparingReset}
        isResetMode={isResetMode}
        isSignInBusy={isSignInBusy}
        isGoogleSubmitting={isGoogleSubmitting}
        handleGoogleSignIn={handleGoogleSignIn}
        password={password}
        rememberDevice={rememberDevice}
        resetFlow={resetFlow}
        setIdentifier={setIdentifier}
        setPassword={setPassword}
        setRememberDevice={setRememberDevice}
        setResetFlow={setResetFlow}
        signUpHref={signUpHref}
        INITIAL_RESET_FLOW={INITIAL_RESET_FLOW}
      />
    </>
  );
}
