import { useState } from 'react';
import Link from 'next/link';

import AuthPageShell from '@/features/auth/page-shell';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

const INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-13 w-full items-center rounded-[16px] border border-black/10 focus-within:border-black/40 bg-primary px-4 transition',
  rightIcon: 'flex h-full items-center justify-center',
});

const PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center w-full rounded-[16px] bg-black h-13 px-4 text-white hover:text-black font-semibold transition hover:bg-primary border border-transparent hover:border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
});

const SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center w-full rounded-[16px] h-13 px-4 text-black/70 hover:text-black font-semibold transition border border-transparent hover:border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
});

const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex w-full items-center gap-3 justify-center rounded-[16px] bg-primary h-13 px-4 text-black hover:bg-white transition border border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
});

function AuthMark() {
  return (
    <div className="relative h-10 w-8">
      <span className="absolute top-0 left-0 h-5 w-4 rounded-tr-[10px] rounded-bl-[10px] bg-[var(--color-black)]" />
      <span className="absolute right-0 bottom-0 h-5 w-4 rounded-tl-[10px] rounded-br-[10px] bg-[var(--color-black)]" />
    </div>
  );
}

function AuthField({ children, htmlFor, label }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-black/35">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SignUpView({
  currentStep,
  form,
  handleChange,
  handleGoogleSignUp,
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
      <form onSubmit={handleStepSubmit} className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
        <div className="flex flex-col items-center text-center">
          <AuthMark />
          <h1 className="mt-5 text-[3rem] leading-[0.95] font-semibold text-[var(--color-black)] sm:text-[3.4rem]">
            {stepTitle}
          </h1>
          <p className="mt-2 text-[1rem] leading-6 text-black/55">Step {currentStep + 1} of 3</p>
        </div>

        {currentStep === 0 ? (
          <>
            <Button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={pendingAction === 'google' || isBusy}
              classNames={PROVIDER_BUTTON_CLASSNAMES}
            >
              <svg className="size-6 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {pendingAction === 'google' ? 'Opening Google...' : 'Sign Up with Google'}
            </Button>

            <div className="relative flex items-center py-2">
              <div className="h-px grow bg-black/12" />
              <span className="px-4 text-[0.9rem] font-medium text-black/35">Or</span>
              <div className="h-px grow bg-black/12" />
            </div>

            <AuthField htmlFor="sign-up-email" label="Email">
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
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
            <AuthField htmlFor="sign-up-username" label="Username">
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
            <AuthField htmlFor="sign-up-password" label="Password">
              <Input
                id="sign-up-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
                classNames={INPUT_CLASSNAMES}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex h-full items-center justify-center"
                  >
                    <Icon icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
                  </button>
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
                classNames={INPUT_CLASSNAMES}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    className="flex h-full items-center justify-center"
                  >
                    <Icon icon={showConfirmPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
                  </button>
                }
              />
            </AuthField>
          </>
        ) : null}

        <div className={currentStep === 0 ? 'mt-2' : 'mt-2 grid gap-3 sm:grid-cols-2'}>
          {currentStep > 0 ? (
            <Button
              type="button"
              onClick={handlePreviousStep}
              disabled={isBusy}
              classNames={SECONDARY_BUTTON_CLASSNAMES}
            >
              Back
            </Button>
          ) : null}

          <Button type="submit" disabled={isBusy} classNames={PRIMARY_BUTTON_CLASSNAMES}>
            {submitLabel}
          </Button>
        </div>

        <p className="pt-2 text-center text-[0.9rem] font-medium text-black/45">
          Already have an account?{' '}
          <Link href={signInHref} className="text-[var(--color-black)]">
            Sign In
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
