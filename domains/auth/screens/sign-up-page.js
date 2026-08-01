import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { OAUTH_PROVIDER_KEYS } from '@/domains/auth/oauth-providers';
import { arePasswordRulesSatisfied, evaluatePasswordRules } from '@/domains/auth/password-validation';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PASSWORD_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
  PasswordToggleButton,
} from '@/domains/auth/form-primitives';
import OAuthProviderButton from '@/domains/auth/oauth-provider-button';
import AuthPageShell from '@/domains/auth/page-shell';
import Icon from '@/ui/primitives/icon';
import { Button, Input } from '@/ui/primitives';
import {
  dividerVariants,
  fieldVariants,
  footerVariants,
  headerContainerVariants,
  logoVariants,
  oauthContainerVariants,
  oauthItemVariants,
  requirementContainerVariants,
  requirementItemVariants,
  stepContentVariants,
  titleVariants,
} from '@/domains/auth/screens/sign-up-animation';

export default function SignUpView({
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
          variants={stepContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 sm:px-10"
        >
          <motion.div variants={headerContainerVariants} className="flex flex-col items-center text-center">
            <motion.div variants={logoVariants} whileHover="hover" whileTap="tap">
              <Link
                href="/"
                className="mb-6 block rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                <img src="/tvizzie.png" alt="Tvizzie" className="size-16" />
              </Link>
            </motion.div>
            <motion.h1 variants={titleVariants} className="text-2xl font-semibold sm:text-3xl">
              {stepTitle}
            </motion.h1>
          </motion.div>

          {currentStep === 0 ? (
            <>
              <motion.div variants={fieldVariants}>
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

              <motion.div variants={fieldVariants}>
                <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                  {submitLabel}
                </Button>
              </motion.div>

              <motion.div
                variants={dividerVariants}
                className="relative flex items-center py-1.5 mx-[-1.5rem] sm:mx-[-2.5rem]"
              >
                <div className="pointer-events-none absolute right-full top-1/2 h-px w-screen -translate-y-1/2 bg-black/10" />
                <div className="h-px grow bg-black/10" />
                <span className="select-none px-4 text-sm font-medium text-black/50">Or</span>
                <div className="h-px grow bg-black/10" />
                <div className="pointer-events-none absolute left-full top-1/2 h-px w-screen -translate-y-1/2 bg-black/10" />
              </motion.div>

              <motion.div variants={oauthContainerVariants} className="flex items-center gap-3">
                {OAUTH_PROVIDER_KEYS.map((provider) => (
                  <motion.div key={provider} variants={oauthItemVariants} whileHover="hover" whileTap="tap" className="flex-1">
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
              <motion.div variants={fieldVariants}>
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

              <motion.div variants={fieldVariants}>
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

              <motion.div variants={fieldVariants}>
                <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                  {submitLabel}
                </Button>
              </motion.div>
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <motion.div variants={fieldVariants}>
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

              <motion.div variants={requirementContainerVariants} className="space-y-1.5 overflow-hidden">
                {passwordRequirements.map((requirement) => (
                  <motion.div
                    key={requirement.id}
                    variants={requirementItemVariants}
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

              <motion.div variants={fieldVariants}>
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
            <motion.div variants={fieldVariants} className="grid gap-2 sm:grid-cols-2">
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

          <motion.p variants={footerVariants} className="mt-2 text-center text-sm font-medium text-black/50">
            Already have an account?{' '}
            <Link
              href={signInHref}
              className="rounded px-1 text-black hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
            >
              Sign In
            </Link>
          </motion.p>
        </motion.form>
      </AnimatePresence>
    </AuthPageShell>
  );
}
