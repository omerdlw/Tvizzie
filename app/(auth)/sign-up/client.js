'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ACCOUNT_CLIENT } from '@/domains/account/client';
import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';
import { assertSignUpEmailAvailable } from '@/domains/auth/client/requests';
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
  validateAllowedEmailDomain,
} from '@/domains/auth/utils';
import {
  createPendingSignUpPayload,
  finalizeOAuthSignUp,
  finalizeSignUp,
} from '@/domains/auth/server/workflows';
import {
  getOAuthProviderLabel,
  normalizeOAuthProvider,
  OAUTH_PROVIDER_KEYS,
} from '@/domains/auth/utils/oauth';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PASSWORD_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
  AuthPageShell,
  AuthVerificationSurface,
  OAuthProviderButton,
  PasswordToggleButton,
} from '@/domains/auth/ui';
import Icon from '@/ui/primitives/icon';
import { Button, Input } from '@/ui/primitives';
import {
  SIGN_UP_TIMELINE,
  signUpDividerVariants,
  signUpFieldVariants,
  signUpFooterVariants,
  signUpHeaderVariants,
  signUpLogoVariants,
  signUpOAuthContainerVariants,
  signUpOAuthItemVariants,
  signUpRequirementContainerVariants,
  signUpRequirementItemVariants,
  signUpStepVariants,
  signUpTitleVariants,
} from '@/app/(auth)/motion';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { useNavigationActions } from '@/modules/nav';
import AuthRegistry from '@/app/(auth)/registry';
import { motion, AnimatePresence } from 'framer-motion';
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
        const email = validateAllowedEmailDomain(form.email);
        await assertSignUpEmailAvailable({
          email,
        });
        setForm((prev) => ({ ...prev, email }));
        setCurrentStep(1);
      } catch (error) {
        if (error?.code === 'OAUTH_ACCOUNT_ALREADY_REGISTERED') {
          const nextHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            identifier: form.email,
            next: nextParam,
            notice: AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED,
            provider: error?.data?.provider,
          });
          window.location.assign(nextHref);
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

  const prevStepRef = useRef(currentStep);
  const direction = currentStep >= prevStepRef.current ? 1 : -1;

  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const passwordRequirements = evaluatePasswordRules(form.password);
  const passwordRequirementsSatisfied = arePasswordRulesSatisfied(form.password);

  const stepTitle =
    currentStep === 0
      ? 'Create account'
      : currentStep === 1
        ? 'Profile details'
        : 'Secure your account';

  const submitLabel =
    currentStep === 0
      ? pendingAction === 'step-email'
        ? 'Checking email'
        : 'Continue'
      : currentStep === 1
        ? pendingAction === 'step-profile'
          ? 'Checking username'
          : 'Continue'
        : pendingAction === 'email'
          ? 'Sending verification'
          : pendingAction === 'creating-account'
            ? 'Creating account'
            : pendingAction === 'redirecting'
              ? 'Redirecting'
              : 'Verify and create';

  return (
    <AuthPageShell>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.form
          key={currentStep}
          custom={direction}
          onSubmit={handleStepSubmit}
          variants={signUpStepVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 sm:px-10"
        >
          <motion.div
            variants={signUpHeaderVariants}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              custom={SIGN_UP_TIMELINE.LOGO_DELAY}
              variants={signUpLogoVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link
                href="/"
                className="mb-6 block rounded-2xl p-1 focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:outline-none"
              >
                <img src="/tvizzie.png" alt="Tvizzie" className="size-16" />
              </Link>
            </motion.div>
            <motion.h1
              custom={SIGN_UP_TIMELINE.TITLE_DELAY}
              variants={signUpTitleVariants}
              className="text-2xl font-semibold sm:text-3xl"
            >
              {stepTitle}
            </motion.h1>
          </motion.div>

          {currentStep === 0 ? (
            <>
              <motion.div variants={signUpFieldVariants} custom={SIGN_UP_TIMELINE.FIELD_START}>
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
              </motion.div>

              <motion.div
                variants={signUpFieldVariants}
                custom={SIGN_UP_TIMELINE.FIELD_START + SIGN_UP_TIMELINE.FIELD_STEP}
              >
                <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                  {submitLabel}
                </Button>
              </motion.div>

              <motion.div
                custom={SIGN_UP_TIMELINE.DIVIDER_DELAY}
                variants={signUpDividerVariants}
                className="relative mx-[-1.5rem] flex items-center py-1.5 sm:mx-[-2.5rem]"
              >
                <div className="pointer-events-none absolute top-1/2 right-full h-px w-screen -translate-y-1/2 bg-black/10" />
                <div className="h-px grow bg-black/10" />
                <span className="px-4 text-sm font-medium text-black/50 select-none">Or</span>
                <div className="h-px grow bg-black/10" />
                <div className="pointer-events-none absolute top-1/2 left-full h-px w-screen -translate-y-1/2 bg-black/10" />
              </motion.div>

              <motion.div
                variants={signUpOAuthContainerVariants}
                className="flex items-center gap-3"
              >
                {OAUTH_PROVIDER_KEYS.map((provider, index) => (
                  <motion.div
                    key={provider}
                    custom={SIGN_UP_TIMELINE.OAUTH_DELAY + index * 0.08}
                    variants={signUpOAuthItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap="tap"
                    className="flex-1"
                  >
                    <OAuthProviderButton
                      provider={provider}
                      mode="sign-up"
                      isBusy={activeOAuthProvider === provider}
                      disabled={Boolean(activeOAuthProvider) || isBusy}
                      onClick={() => handleOAuthSignUp(provider)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          ) : null}

          {currentStep === 1 ? (
            <>
              <motion.div variants={signUpFieldVariants} custom={SIGN_UP_TIMELINE.FIELD_START}>
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
              </motion.div>

              <motion.div
                variants={signUpFieldVariants}
                custom={SIGN_UP_TIMELINE.FIELD_START + SIGN_UP_TIMELINE.FIELD_STEP}
              >
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
              </motion.div>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <motion.div variants={signUpFieldVariants} custom={SIGN_UP_TIMELINE.FIELD_START}>
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
              </motion.div>

              <motion.div
                variants={signUpRequirementContainerVariants}
                custom={SIGN_UP_TIMELINE.REQUIREMENTS_DELAY}
                className="space-y-1.5 overflow-hidden"
              >
                {passwordRequirements.map((requirement, index) => (
                  <motion.div
                    key={requirement.id}
                    variants={signUpRequirementItemVariants}
                    custom={index * 0.055}
                    className={`flex items-center gap-2 text-sm ${requirement.satisfied ? 'text-success' : 'text-error'}`}
                  >
                    <Icon
                      icon={
                        requirement.satisfied
                          ? 'material-symbols:check-rounded'
                          : 'material-symbols:close-rounded'
                      }
                      size={16}
                      className="shrink-0 transition-transform duration-200"
                    />
                    <span>{requirement.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={signUpFieldVariants} custom={SIGN_UP_TIMELINE.CONFIRM_DELAY}>
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
              </motion.div>
            </>
          ) : null}

          {currentStep > 0 ? (
            <motion.div
              variants={signUpFieldVariants}
              custom={SIGN_UP_TIMELINE.ACTION_DELAY}
              className="grid gap-2 sm:grid-cols-2"
            >
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
            </motion.div>
          ) : null}

          <motion.p
            custom={SIGN_UP_TIMELINE.FOOTER_DELAY}
            variants={signUpFooterVariants}
            className="mt-2 text-center text-sm font-medium text-black/50"
          >
            Already have an account?{' '}
            <Link
              href={signInHref}
              className="rounded px-1 text-black hover:underline focus-visible:ring-1 focus-visible:ring-black focus-visible:outline-none"
            >
              Sign In
            </Link>
          </motion.p>
        </motion.form>
      </AnimatePresence>
    </AuthPageShell>
  );
}
