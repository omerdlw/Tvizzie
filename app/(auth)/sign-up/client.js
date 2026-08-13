'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';
import { setPendingAccountBootstrap } from '@/domains/auth/client';
import {
  AUTH_PURPOSE,
  AUTH_ROUTE_NOTICE,
  AUTH_ROUTES,
  INITIAL_SIGN_UP_FORM,
  arePasswordRulesSatisfied,
  buildAuthHref,
  evaluatePasswordRules,
  hasSatisfiedPasswordRequirements,
  isPasswordConfirmationMismatchError,
  isPasswordRequirementError,
  resolveAuthErrorMessage,
  resolvePostAuthRedirect,
} from '@/domains/auth/utils';
import {
  createPendingSignUpPayload,
  finalizeOAuthSignUp,
  finalizeSignUp,
  getSignUpStepTitle,
  getSignUpSubmitLabel,
  resolveOAuthSignUpFallback,
  resolveSignUpEmailFallback,
  SIGN_UP_FEEDBACK,
  validateSignUpEmail,
  validateSignUpProfile,
} from '@/domains/auth/client/sign-up-workflow.client';
import { getOAuthProviderLabel, normalizeOAuthProvider } from '@/domains/auth/utils/oauth';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PASSWORD_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
  AUTH_PAGE_FORM_CLASS,
  AuthPageShell,
  AuthVerificationSurface,
  OAuthProviderList,
  PasswordToggleButton,
} from '@/domains/auth/ui';
import Icon from '@/ui/primitives/icon';
import { Button, Input } from '@/ui/primitives';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { useNavigationActions } from '@/modules/nav';
import AuthRegistry from '@/app/(auth)/registry';
import { AuthReveal, AuthScene } from '@/app/(auth)/motion';
import Link from 'next/link';

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
    ...INITIAL_SIGN_UP_FORM,
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
    [emailPrefill, form.email, nextParam],
  );

  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    if (emailPrefill && !hasPrefilledRef.current) {
      setForm((prev) => ({ ...prev, email: emailPrefill }));
      hasPrefilledRef.current = true;
    }
  }, [emailPrefill]);

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
      const fallbackHref = resolveOAuthSignUpFallback({
        email: form.email,
        error,
        nextPath: nextParam,
      });

      if (fallbackHref) {
        window.location.assign(fallbackHref);
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
          forceNewCodeOnOpen: true,
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
        const email = await validateSignUpEmail(form.email);
        setForm((prev) => ({ ...prev, email }));
        setCurrentStep(1);
      } catch (error) {
        const fallbackHref = resolveSignUpEmailFallback({
          email: form.email,
          error,
          nextPath: nextParam,
        });

        if (fallbackHref) {
          window.location.assign(fallbackHref);
          return;
        }

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
        const profile = await validateSignUpProfile(form);

        setForm((prev) => ({
          ...prev,
          ...profile,
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

  const registry = (
    <AuthRegistry
      authIsReady={auth.isReady}
      description="Create your account"
      icon="solar:user-plus-bold"
      title="Sign Up"
    />
  );

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

function SignUpView({
  activeOAuthProvider,
  currentStep,
  form,
  handleChange,
  handleOAuthSignUp,
  handlePreviousStep,
  handleStepSubmit,
  isBusy,
  isPasswordReady,
  passwordsMatch,
  signInHref,
  pendingAction,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = evaluatePasswordRules(form.password);
  const passwordRequirementsSatisfied = arePasswordRulesSatisfied(form.password);

  const stepTitle = getSignUpStepTitle(currentStep);
  const submitLabel = getSignUpSubmitLabel(currentStep, pendingAction);

  return (
    <AuthPageShell>
      <AuthScene sceneKey={`sign-up-step-${currentStep}`}>
        <form
          onSubmit={handleStepSubmit}
          className={AUTH_PAGE_FORM_CLASS}
        >
          <div className="flex flex-col items-center text-center">
            <AuthReveal stage="brand">
              <Link
                href="/"
                className="mb-6 block  p-1 focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:outline-none"
              >
                <Image
                  src="/tvizzie.png"
                  alt="Tvizzie"
                  width={64}
                  height={64}
                  className="size-16"
                />
              </Link>
            </AuthReveal>
            <AuthReveal stage="heading">
              <h1 className="text-2xl font-semibold sm:text-3xl">{stepTitle}</h1>
            </AuthReveal>
          </div>

          {currentStep === 0 ? (
            <>
              <AuthReveal itemIndex={0} stage="field">
                <AuthField className="pt-1" htmlFor="sign-up-email" label="Email">
                  <Input
                    id="sign-up-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>
              </AuthReveal>

              <AuthReveal stage="submit">
                <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                  {submitLabel}
                </Button>
              </AuthReveal>

              <div className="relative mx-[-1.5rem] flex items-center py-1.5 sm:mx-[-2.5rem]">
                <div className="pointer-events-none absolute top-1/2 right-full h-px w-screen -translate-y-1/2 bg-black/10" />
                <div className="h-px grow bg-black/10" />
                <AuthReveal stage="divider">
                  <span className="px-4 text-sm font-medium text-black/50 select-none">Or</span>
                </AuthReveal>
                <div className="h-px grow bg-black/10" />
                <div className="pointer-events-none absolute top-1/2 left-full h-px w-screen -translate-y-1/2 bg-black/10" />
              </div>

              <AuthReveal stage="oauth">
                <OAuthProviderList
                  activeProvider={activeOAuthProvider}
                  disabled={isBusy}
                  mode="sign-up"
                  onSelect={handleOAuthSignUp}
                />
              </AuthReveal>
            </>
          ) : null}

          {currentStep === 1 ? (
            <>
              <AuthReveal itemIndex={0} stage="field">
                <AuthField className="pt-1" htmlFor="sign-up-username" label="Username">
                  <Input
                    id="sign-up-username"
                    value={form.username}
                    onChange={(event) => handleChange('username', event.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>
              </AuthReveal>

              <AuthReveal itemIndex={1} stage="field">
                <AuthField htmlFor="sign-up-display-name" label="Display name">
                  <Input
                    id="sign-up-display-name"
                    value={form.displayName}
                    onChange={(event) => handleChange('displayName', event.target.value)}
                    placeholder="Display name"
                    autoComplete="name"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>
              </AuthReveal>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <AuthReveal itemIndex={0} stage="field">
                <AuthField className="pt-1" htmlFor="sign-up-password" label="Password">
                  <Input
                    id="sign-up-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    placeholder="Create password"
                    autoComplete="new-password"
                    classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
                    rightIcon={
                      <PasswordToggleButton
                        visible={showPassword}
                        onClick={() => setShowPassword((prev) => !prev)}
                      />
                    }
                  />
                </AuthField>
              </AuthReveal>

              <AuthReveal className="space-y-1.5 overflow-hidden" stage="requirement">
                {passwordRequirements.map((requirement, index) => (
                  <AuthReveal
                    key={requirement.id}
                    itemIndex={index}
                    stage="requirement"
                    className={`flex items-center gap-2 text-sm ${requirement.satisfied ? 'text-success' : 'text-error'}`}
                  >
                    <Icon
                      icon={
                        requirement.satisfied
                          ? 'material-symbols:check-rounded'
                          : 'material-symbols:close-rounded'
                      }
                      size={16}
                      className="shrink-0-transform "
                    />
                    <span>{requirement.label}</span>
                  </AuthReveal>
                ))}
              </AuthReveal>

              <AuthReveal itemIndex={1} stage="field">
                <AuthField htmlFor="sign-up-confirm-password" label="Confirm password">
                  <Input
                    id="sign-up-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(event) => handleChange('confirmPassword', event.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
                    rightIcon={
                      <PasswordToggleButton
                        visible={showConfirmPassword}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        showLabel="Show password confirmation"
                        hideLabel="Hide password confirmation"
                      />
                    }
                  />
                </AuthField>
              </AuthReveal>
            </>
          ) : null}

          {currentStep > 0 ? (
            <AuthReveal className="grid gap-2 sm:grid-cols-2" stage="submit">
              <Button
                type="button"
                onClick={handlePreviousStep}
                disabled={isBusy}
                classNames={AUTH_SECONDARY_BUTTON_CLASSNAMES}
              >
                Back
              </Button>

              <Button
                type="submit"
                disabled={
                  isBusy ||
                  (currentStep === 2 &&
                    (!isPasswordReady || !passwordRequirementsSatisfied || !passwordsMatch))
                }
                classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
              >
                {submitLabel}
              </Button>
            </AuthReveal>
          ) : null}

          <AuthReveal className="mt-2 text-center text-sm font-medium text-black/50" stage="footer">
            <p>
              Already have an account?{' '}
              <Link
                href={signInHref}
                className="inline-block  px-1 text-black transition-[color,transform] duration-300 ease-out hover:scale-[1.02] hover:underline focus-visible:ring-1 focus-visible:ring-black focus-visible:outline-none"
              >
                Sign In
              </Link>
            </p>
          </AuthReveal>
        </form>
      </AuthScene>
    </AuthPageShell>
  );
}
