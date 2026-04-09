import { useState } from 'react';
import Link from 'next/link';

import AuthPageShell from '@/features/auth/page-shell';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

const EMAIL_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-13 w-full items-center rounded-[16px] border border-black/10 focus-within:border-black/40 bg-primary px-4 transition',
  input: 'w-full text-black placeholder-black/60',
});

const PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-13 w-full items-center rounded-[16px] border border-black/10 focus-within:border-black/40 bg-primary px-4 transition',
  input: 'w-full text-black placeholder-black/60',
  rightIcon: 'flex h-full items-center justify-center',
});

const PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex w-full items-center justify-center rounded-[16px] bg-black h-13 px-4 text-white hover:text-black font-semibold transition hover:bg-primary border border-transparent hover:border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
});

const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex w-full items-center gap-3 justify-center rounded-[16px] bg-primary h-13 px-4 text-black hover:bg-white transition border border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
});

export default function View({
  handleRequestPasswordReset,
  handleResetSubmit,
  handleSubmit,
  identifier,
  isPasswordSubmitting,
  isPreparingReset,
  isResetMode,
  isSignInBusy,
  isGoogleSubmitting,
  handleGoogleSignIn,
  password,
  rememberDevice,
  resetFlow,
  setIdentifier,
  setPassword,
  setRememberDevice,
  setResetFlow,
  signUpHref,
  INITIAL_RESET_FLOW,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  if (isResetMode) {
    return (
      <AuthPageShell>
        <form onSubmit={handleResetSubmit} className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
          <div className="text-center">
            <h1 className="text-[2.8rem] leading-[0.95] font-semibold text-[var(--color-black)] sm:text-[3.2rem]">
              Reset password
            </h1>
            <p className="mt-2 text-[1rem] leading-6 text-black/55">{resetFlow.email}</p>
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
            classNames={PASSWORD_INPUT_CLASSNAMES}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowResetPassword((prev) => !prev)}
                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                className="flex h-full items-center justify-center"
              >
                <Icon icon={showResetPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
              </button>
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
            classNames={PASSWORD_INPUT_CLASSNAMES}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                aria-label={showResetConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                className="flex h-full items-center justify-center"
              >
                <Icon icon={showResetConfirmPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
              </button>
            }
          />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button
              type="submit"
              disabled={resetFlow.isSubmitting || !resetFlow.passwordResetProof}
              classNames={PRIMARY_BUTTON_CLASSNAMES}
            >
              {resetFlow.isSubmitting ? 'Resetting' : 'Reset'}
            </Button>
            <Button
              type="button"
              onClick={() => setResetFlow(INITIAL_RESET_FLOW)}
              disabled={resetFlow.isSubmitting}
              classNames={PROVIDER_BUTTON_CLASSNAMES}
            >
              Back
            </Button>
          </div>
        </form>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
        <div className="flex flex-col items-center text-center">
          <h1 className="mt-5 text-[3rem] leading-[0.95] font-semibold text-[var(--color-black)] sm:text-[3.4rem]">
            Welcome back!
          </h1>
          <p className="mt-2 text-[1rem] leading-6 text-black/55">
            Your work, your team, your flow - all in one place.
          </p>
        </div>

        <div className="pt-1">
          <label htmlFor="sign-in-identifier" className="text-[0.8rem] font-medium text-black/35">
            Email
          </label>
          <Input
            id="sign-in-identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            classNames={EMAIL_INPUT_CLASSNAMES}
          />
        </div>

        <div>
          <label htmlFor="sign-in-password" className="text-[0.8rem] font-medium text-black/35">
            Password
          </label>
          <Input
            id="sign-in-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="•••••••"
            autoComplete="current-password"
            classNames={PASSWORD_INPUT_CLASSNAMES}
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
        </div>

        <div className="flex items-center justify-between pt-1 text-[0.88rem] font-medium text-black/95">
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              disabled={isSignInBusy}
              className="size-5 rounded-[5px] border border-black/25 accent-black"
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={handleRequestPasswordReset}
            disabled={isSignInBusy}
            className="transition hover:text-black/65"
          >
            {isPreparingReset ? 'Checking...' : 'Forgot password?'}
          </button>
        </div>

        <Button type="submit" disabled={isSignInBusy} classNames={PRIMARY_BUTTON_CLASSNAMES}>
          {isPasswordSubmitting ? 'Logging in...' : 'Log In'}
        </Button>

        <div className="relative flex items-center py-1.5">
          <div className="h-px grow bg-black/12" />
          <span className="px-4 text-[0.9rem] font-medium text-black/35">Or</span>
          <div className="h-px grow bg-black/12" />
        </div>

        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleSubmitting || isSignInBusy}
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
          {isGoogleSubmitting ? 'Opening Google...' : 'Sign In with Google'}
        </Button>

        <p className="pt-2 text-center text-[0.9rem] font-medium text-black/45">
          Don&apos;t have an account?{' '}
          <Link href={signUpHref} className="text-[var(--color-black)]">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
