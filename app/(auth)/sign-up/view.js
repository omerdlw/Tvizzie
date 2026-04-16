import { useState } from 'react';
import Link from 'next/link';

import { OAUTH_PROVIDER_KEYS } from '@/core/auth/oauth-providers';
import OAuthProviderButton from '@/features/auth/oauth-provider-button';
import AuthPageShell from '@/features/auth/page-shell';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

const INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full rounded-[14px] items-center border border-black/10 bg-primary px-4 transition focus-within:border-black/40',
  input: 'w-full text-black placeholder:text-black/50',
});

const PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

const PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 rounded-[14px] w-full items-center justify-center border border-transparent bg-black px-4 font-semibold text-white transition hover:border-black/10 hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60',
});

const SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 rounded-[14px] w-full items-center justify-center border border-black/10 bg-primary px-4 text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
});

function AuthField({ children, className = '', htmlFor, label }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-black/50">
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordToggleButton({ visible, onClick, showLabel = 'Show password', hideLabel = 'Hide password' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? hideLabel : showLabel}
      className="flex h-full items-center justify-center"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}

export default function SignUpView({
  activeOAuthProvider,
  currentStep,
  form,
  handleChange,
  handleOAuthSignUp,
  handlePreviousStep,
  handleStepSubmit,
  isBusy,
  signInHref,
  pendingAction,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const stepTitle =
    currentStep === 0 ? 'Create account' : currentStep === 1 ? 'Profile details' : 'Secure your account';

  const submitLabel =
    currentStep === 0
      ? pendingAction === 'step-email'
        ? 'Checking email...'
        : 'Continue'
      : currentStep === 1
        ? pendingAction === 'step-profile'
          ? 'Checking username...'
          : 'Continue'
        : pendingAction === 'email'
          ? 'Sending verification...'
          : 'Verify and create';

  return (
    <AuthPageShell>
      <form onSubmit={handleStepSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-col items-center text-center">
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
                classNames={INPUT_CLASSNAMES}
              />
            </AuthField>

            <Button type="submit" disabled={isBusy} classNames={PRIMARY_BUTTON_CLASSNAMES}>
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
                classNames={INPUT_CLASSNAMES}
              />
            </AuthField>

            <AuthField htmlFor="sign-up-display-name" label="Display name">
              <Input
                id="sign-up-display-name"
                value={form.displayName}
                onChange={(event) => handleChange('displayName', event.target.value)}
                placeholder="Display name"
                autoComplete="name"
                classNames={INPUT_CLASSNAMES}
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
                classNames={PASSWORD_INPUT_CLASSNAMES}
                rightIcon={
                  <PasswordToggleButton visible={showPassword} onClick={() => setShowPassword((prev) => !prev)} />
                }
              />
            </AuthField>

            <AuthField htmlFor="sign-up-confirm-password" label="Confirm password">
              <Input
                id="sign-up-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                classNames={PASSWORD_INPUT_CLASSNAMES}
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
              classNames={SECONDARY_BUTTON_CLASSNAMES}
            >
              Back
            </Button>

            <Button type="submit" disabled={isBusy} classNames={PRIMARY_BUTTON_CLASSNAMES}>
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
