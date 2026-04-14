import { useState } from 'react';
import Link from 'next/link';

import { OAUTH_PROVIDER_KEYS } from '@/core/auth/oauth-providers';
import OAuthProviderButton from '@/features/auth/oauth-provider-button';
import AuthPageShell from '@/features/auth/page-shell';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

const INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full items-center border border-black/10 bg-primary px-4 transition focus-within:border-black/40',
  input: 'w-full text-black placeholder:text-black/60',
});

const PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

const PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full items-center justify-center border border-transparent bg-black px-4 font-semibold text-white transition hover:border-black/10 hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60',
});

const SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full items-center justify-center border border-black/10 bg-primary px-4 text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
});

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

export default function View({
  activeOAuthProvider,
  handleOAuthSignIn,
  handleRequestPasswordReset,
  handleResetSubmit,
  handleSubmit,
  identifier,
  isPasswordSubmitting,
  isPreparingReset,
  isResetMode,
  isSignInBusy,
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
        <form onSubmit={handleResetSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <div className="text-center">
            <h1 className="text-3xl font-semibold sm:text-4xl">Reset Password</h1>
            <p className="mt-2 text-base text-black/50">{resetFlow.email}</p>
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
              <PasswordToggleButton visible={showResetPassword} onClick={() => setShowResetPassword((prev) => !prev)} />
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
              <PasswordToggleButton
                visible={showResetConfirmPassword}
                onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                showLabel="Show password confirmation"
                hideLabel="Hide password confirmation"
              />
            }
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => setResetFlow(INITIAL_RESET_FLOW)}
              disabled={resetFlow.isSubmitting}
              classNames={SECONDARY_BUTTON_CLASSNAMES}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={resetFlow.isSubmitting || !resetFlow.passwordResetProof}
              classNames={PRIMARY_BUTTON_CLASSNAMES}
            >
              {resetFlow.isSubmitting ? 'Resetting' : 'Reset'}
            </Button>
          </div>
        </form>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">Welcome back!</h1>
        </div>

        <div className="pt-1">
          <label htmlFor="sign-in-identifier" className="text-sm font-medium text-black/50">
            Email
          </label>
          <Input
            id="sign-in-identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            classNames={INPUT_CLASSNAMES}
          />
        </div>

        <div>
          <label htmlFor="sign-in-password" className="text-sm font-medium text-black/50">
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
            rightIcon={<PasswordToggleButton visible={showPassword} onClick={() => setShowPassword((prev) => !prev)} />}
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-sm font-medium">
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              disabled={isSignInBusy}
              className="size-5 border border-black/10 accent-black"
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={handleRequestPasswordReset}
            disabled={isSignInBusy}
            className="text-black/50 transition hover:text-black"
          >
            {isPreparingReset ? 'Checking...' : 'Forgot password?'}
          </button>
        </div>

        <Button type="submit" disabled={isSignInBusy} classNames={PRIMARY_BUTTON_CLASSNAMES}>
          {isPasswordSubmitting ? 'Logging in...' : 'Log In'}
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
              mode="sign-in"
              isBusy={activeOAuthProvider === provider}
              disabled={Boolean(activeOAuthProvider) || isSignInBusy}
              onClick={() => handleOAuthSignIn(provider)}
            />
          ))}
        </div>

        <p className="mt-2 text-center text-sm font-medium text-black/50">
          Don&apos;t have an account?{' '}
          <Link href={signUpHref} className="text-black">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
