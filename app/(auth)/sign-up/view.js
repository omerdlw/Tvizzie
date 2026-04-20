import { useState } from 'react';
import Link from 'next/link';

import { OAUTH_PROVIDER_KEYS } from '@/core/auth/oauth-providers';
import { arePasswordRulesSatisfied, evaluatePasswordRules } from '@/core/auth/password-validation';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PASSWORD_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
  AUTH_SECONDARY_BUTTON_CLASSNAMES,
  AuthField,
  PasswordToggleButton,
} from '@/features/auth/form-primitives';
import OAuthProviderButton from '@/features/auth/oauth-provider-button';
import AuthPageShell from '@/features/auth/page-shell';
import Icon from '@/ui/icon';
import { Button, Input } from '@/ui/elements';

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
  const passwordRequirements = evaluatePasswordRules(form.password);
  const passwordRequirementsSatisfied = arePasswordRulesSatisfied(form.password);

  const stepTitle =
    currentStep === 0 ? 'Create account' : currentStep === 1 ? 'Profile details' : 'Secure your account';

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
      <form onSubmit={handleStepSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-6 block transition-transform hover:scale-[1.02]">
            <img src="/tvizzie.svg" alt="Tvizzie" className="size-16" />
          </Link>
          <h1 className="text-3xl font-semibold sm:text-4xl">{stepTitle}</h1>
        </div>

        {currentStep === 0 ? (
          <>
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

            <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
              {submitLabel}
            </Button>

            <div className="relative flex items-center py-1.5">
              <div className="h-px grow bg-black/10" />
              <span className="px-4 text-sm font-medium text-black/50">Or</span>
              <div className="h-px grow bg-black/10" />
            </div>

            <div className="flex items-center gap-3">
              {OAUTH_PROVIDER_KEYS.map((provider) => (
                <OAuthProviderButton
                  key={provider}
                  provider={provider}
                  mode="sign-up"
                  isBusy={activeOAuthProvider === provider}
                  disabled={Boolean(activeOAuthProvider) || isBusy}
                  onClick={() => handleOAuthSignUp(provider)}
                />
              ))}
            </div>
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
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
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
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
                  <PasswordToggleButton visible={showPassword} onClick={() => setShowPassword((prev) => !prev)} />
                }
              />
            </AuthField>

            <div className="space-y-1.5">
              {passwordRequirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className={`flex items-center gap-2 text-sm ${requirement.satisfied ? 'text-success' : 'text-error'}`}
                >
                  <Icon
                    icon={requirement.satisfied ? 'material-symbols:check-rounded' : 'material-symbols:close-rounded'}
                    size={16}
                    className="shrink-0"
                  />
                  <span>{requirement.label}</span>
                </div>
              ))}
            </div>

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
          </>
        ) : null}

        {currentStep > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
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
                isBusy || (currentStep === 2 && (!isPasswordReady || !passwordRequirementsSatisfied || !passwordsMatch))
              }
              classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}
            >
              {submitLabel}
            </Button>
          </div>
        ) : null}

        <p className="mt-2 text-center text-sm font-medium text-black/50">
          Already have an account?{' '}
          <Link href={signInHref} className="text-black">
            Sign In
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
