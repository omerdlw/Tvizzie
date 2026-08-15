'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { assertPasswordAccountStatus, completePasswordReset } from '@/domains/auth/client/requests';
import { signInWithPassword } from '@/domains/auth/client/sign-in-workflow.client';
import {
  AUTH_PURPOSE,
  AUTH_ROUTES,
  INITIAL_RESET_FLOW,
  buildAuthHref,
  consumeAuthRouteNoticeCookie,
  isEmailIdentifier,
  resolveAuthErrorMessage,
  resolvePostAuthRedirect,
  resolveSignInNoticeToast,
  validatePassword,
} from '@/domains/auth/utils';
import { getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PASSWORD_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
  AUTH_PAGE_FORM_CLASS,
  AuthPageShell,
  AuthVerificationSurface,
  ForgotPasswordAction,
  OAuthProviderList,
  PasswordToggleButton,
} from '@/domains/auth/ui';
import { Button, Input } from '@/ui/primitives';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { useNavigationActions } from '@/modules/nav';
import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';
import AuthRegistry from '@/app/(auth)/registry';
import Link from 'next/link';

export default function Client() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();

  const nextParam = searchParams.get('next');
  const routeNotice = searchParams.get('notice');
  const routeProvider = searchParams.get('provider');
  const identifierPrefill = useMemo(
    () => searchParams.get('identifier') || searchParams.get('email') || '',
    [searchParams],
  );

  const [identifier, setIdentifier] = useState(identifierPrefill);
  const [password, setPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [activeOAuthProvider, setActiveOAuthProvider] = useState(null);
  const [isPreparingReset, setIsPreparingReset] = useState(false);
  const [resetFlow, setResetFlow] = useState(INITIAL_RESET_FLOW);
  const isSubmitting = isPasswordSubmitting || Boolean(activeOAuthProvider);
  const isSignInBusy = isSubmitting || isPreparingReset;
  const isResetMode = resetFlow.active;

  const postAuthRedirect = useMemo(() => resolvePostAuthRedirect(nextParam), [nextParam]);

  const signUpHref = useMemo(
    () =>
      buildAuthHref(AUTH_ROUTES.SIGN_UP, {
        next: nextParam,
        email: isEmailIdentifier(identifier) ? identifier : '',
      }),
    [identifier, nextParam],
  );

  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    if (identifierPrefill && !hasPrefilledRef.current) {
      setIdentifier(identifierPrefill);
      hasPrefilledRef.current = true;
    }
  }, [identifierPrefill]);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated) {
      return;
    }

    router.replace(postAuthRedirect);
  }, [auth.isAuthenticated, auth.isReady, postAuthRedirect, router]);

  useEffect(() => {
    const cookieNotice = consumeAuthRouteNoticeCookie();
    const activeNotice = routeNotice || cookieNotice;

    if (!activeNotice) {
      return;
    }

    const noticeToast = resolveSignInNoticeToast(activeNotice, routeProvider);

    if (noticeToast?.type === 'warning') {
      toast.warning(noticeToast.message);
    }

    if (noticeToast?.type === 'error') {
      toast.error(noticeToast.message);
    }

    if (!routeNotice) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('notice');
    params.delete('provider');
    const nextHref = params.toString() ? `/sign-in?${params.toString()}` : AUTH_ROUTES.SIGN_IN;

    router.replace(nextHref);
  }, [routeNotice, routeProvider, router, searchParams, toast]);

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

    let redirectUrl = postAuthRedirect;

    if (postAuthRedirect === '/account') {
      try {
        const response = await fetch('/api/account/profile', {
          cache: 'no-store',
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);
        const username = String(payload?.profile?.username || '').trim();

        if (response.ok && username) {
          redirectUrl = `/account/${encodeURIComponent(username)}`;
        }
      } catch {}
    }

    window.location.replace(redirectUrl);
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
        allowRememberDevice: true,
        challenge: signInResult.challenge || null,
        email: signInResult.email || '',
        identifier,
        purpose: AUTH_PURPOSE.SIGN_IN,
      },
    });

    return finalizeVerifiedSignIn(verification);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSignInBusy || resetFlow.active) {
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const signInResult = await signInWithPassword({ auth, identifier, password });

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

      router.replace(postAuthRedirect);
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Sign-in failed'));
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    if (isSignInBusy || resetFlow.active) {
      return;
    }

    const providerLabel = getOAuthProviderLabel(provider);
    setActiveOAuthProvider(provider);
    let isRedirectingToProvider = false;
    try {
      const signInResult = await auth.signIn({
        oauthIntent: 'sign-in',
        next: postAuthRedirect,
        provider,
      });

      if (signInResult?.requiresRedirect) {
        isRedirectingToProvider = true;
        return;
      }

      if (signInResult?.requiresVerification) {
        const didCompleteVerification = await handleLoginVerification(signInResult);

        if (!didCompleteVerification) {
          return;
        }

        return;
      }

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

      toast.error(resolveAuthErrorMessage(error, `${providerLabel} sign-in failed`));
    } finally {
      if (!isRedirectingToProvider) {
        setActiveOAuthProvider(null);
      }
    }
  };

  const handleRequestPasswordReset = async () => {
    if (isSignInBusy || resetFlow.isSubmitting) {
      return;
    }

    const trimmedIdentifier = String(identifier || '').trim();
    if (!trimmedIdentifier) {
      toast.error('Enter your email or username to reset your password');
      return;
    }

    setIsPreparingReset(true);

    try {
      const { email } = await assertPasswordAccountStatus({
        identifier: trimmedIdentifier,
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
          identifier,
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

      setIdentifier(resetFlow.email);
      setPassword('');
      setResetFlow(INITIAL_RESET_FLOW);
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Password reset could not be completed'));
    } finally {
      setResetFlow((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const forgotPasswordAction = useMemo(() => {
    if (isResetMode) {
      return null;
    }
    return (
      <ForgotPasswordAction
        onClick={handleRequestPasswordReset}
        disabled={isSignInBusy}
        isPreparingReset={isPreparingReset}
      />
    );
  }, [isResetMode, handleRequestPasswordReset, isSignInBusy, isPreparingReset]);

  const registry = (
    <AuthRegistry
      action={forgotPasswordAction}
      authIsReady={auth.isReady}
      description={isResetMode ? 'Reset your password' : 'Access your account'}
      icon="solar:user-circle-bold"
      title="Sign In"
    />
  );

  if (
    !auth.isReady ||
    (auth.isAuthenticated && !isSubmitting && !isPreparingReset && !resetFlow.isSubmitting)
  ) {
    return <>{registry}</>;
  }

  return (
    <>
      {registry}
      <View
        activeOAuthProvider={activeOAuthProvider}
        handleOAuthSignIn={handleOAuthSignIn}
        handleResetSubmit={handleResetSubmit}
        handleSubmit={handleSubmit}
        identifier={identifier}
        isPasswordSubmitting={isPasswordSubmitting}
        isResetMode={isResetMode}
        isSignInBusy={isSignInBusy}
        password={password}
        resetFlow={resetFlow}
        setIdentifier={setIdentifier}
        setPassword={setPassword}
        setResetFlow={setResetFlow}
        signUpHref={signUpHref}
        INITIAL_RESET_FLOW={INITIAL_RESET_FLOW}
      />
    </>
  );
}

function View({
  activeOAuthProvider,
  handleOAuthSignIn,
  handleResetSubmit,
  handleSubmit,
  identifier,
  isPasswordSubmitting,
  isResetMode,
  isSignInBusy,
  password,
  resetFlow,
  setIdentifier,
  setPassword,
  setResetFlow,
  signUpHref,
  INITIAL_RESET_FLOW,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  return (
    <AuthPageShell>
      {isResetMode ? (
        <form onSubmit={handleResetSubmit} className={AUTH_PAGE_FORM_CLASS}>
          <div className="text-center">
            <h1 className="text-3xl font-semibold sm:text-4xl">Reset Password</h1>
            <p className="mt-2 text-base text-white/50">{resetFlow.email}</p>
          </div>

          <Input
            id="reset-password"
            type={showResetPassword ? 'text' : 'password'}
            value={resetFlow.newPassword}
            onChange={(event) =>
              setResetFlow((prev) => ({
                ...prev,
                newPassword: event.target.value,
              }))
            }
            placeholder="New password"
            autoComplete="new-password"
            classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
            rightIcon={
              <PasswordToggleButton
                visible={showResetPassword}
                onClick={() => setShowResetPassword((prev) => !prev)}
              />
            }
          />

          <Input
            id="reset-password-confirmation"
            type={showResetConfirmPassword ? 'text' : 'password'}
            value={resetFlow.confirmPassword}
            onChange={(event) =>
              setResetFlow((prev) => ({
                ...prev,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Confirm password"
            autoComplete="new-password"
            classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
            rightIcon={
              <PasswordToggleButton
                visible={showResetConfirmPassword}
                onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                showLabel="Show password confirmation"
                hideLabel="Hide password confirmation"
              />
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => setResetFlow(INITIAL_RESET_FLOW)}
              disabled={resetFlow.isSubmitting}
              classNames={AUTH_SECONDARY_BUTTON_CLASSNAMES}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={resetFlow.isSubmitting || !resetFlow.passwordResetProof}
              classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
            >
              {resetFlow.isSubmitting ? 'Resetting' : 'Reset'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className={AUTH_PAGE_FORM_CLASS}>
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="mb-6 block p-1 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
            >
              <Image
                src="/tvizzie.png"
                alt="Tvizzie"
                width={64}
                height={64}
                className="size-16"
              />
            </Link>
            <h1 className="text-2xl font-semibold sm:text-3xl">Welcome back</h1>
          </div>

          <AuthField className="pt-1" htmlFor="sign-in-identifier" label="Username or Email">
            <Input
              id="sign-in-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your username or email"
              autoComplete="username"
              classNames={AUTH_INPUT_CLASSNAMES}
            />
          </AuthField>

          <AuthField htmlFor="sign-in-password" label="Password">
            <Input
              id="sign-in-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
              rightIcon={
                <PasswordToggleButton
                  visible={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              }
            />
          </AuthField>

          <Button
            type="submit"
            disabled={isSignInBusy}
            classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
          >
            {isPasswordSubmitting ? 'Logging in' : 'Log In'}
          </Button>

          <div className="relative mx-[-1.5rem] flex items-center py-1.5 sm:mx-[-2.5rem]">
            <div className="pointer-events-none absolute top-1/2 right-full h-px w-screen -translate-y-1/2 bg-white/10" />
            <div className="h-px grow bg-white/10" />
            <span className="px-4 text-sm font-medium text-white/50 select-none">Or</span>
            <div className="h-px grow bg-white/10" />
            <div className="pointer-events-none absolute top-1/2 left-full h-px w-screen -translate-y-1/2 bg-white/10" />
          </div>

          <OAuthProviderList
            activeProvider={activeOAuthProvider}
            disabled={isSignInBusy}
            mode="sign-in"
            onSelect={handleOAuthSignIn}
          />

          <div className="mt-2 text-center text-sm font-medium text-white/50">
            <p>
              Don&apos;t have an account?{' '}
              <Link
                href={signUpHref}
                className="inline-block px-1 text-white transition-all duration-300 ease-in-out hover:underline focus-visible:ring-1 focus-visible:ring-white focus-visible:outline-none"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthPageShell>
  );
}
