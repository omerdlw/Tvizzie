import { useState } from 'react';
import Link from 'next/link';

import { OAUTH_PROVIDER_KEYS } from '@/core/auth/oauth-providers';
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
import { Button, Input } from '@/ui/elements';

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
            classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
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

          <div className="grid gap-2 sm:grid-cols-2">
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
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-6 block transition-transform hover:scale-[1.02]">
            <img src="/tvizzie.png" alt="Tvizzie" className="size-16" />
          </Link>
          <h1 className="text-3xl font-semibold sm:text-4xl">Welcome back</h1>
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
            placeholder="•••••••"
            autoComplete="current-password"
            classNames={AUTH_PASSWORD_INPUT_CLASSNAMES}
            rightIcon={<PasswordToggleButton visible={showPassword} onClick={() => setShowPassword((prev) => !prev)} />}
          />
        </AuthField>

        <div className="flex items-center justify-end pt-1 text-sm font-medium">
          <button
            type="button"
            onClick={handleRequestPasswordReset}
            disabled={isSignInBusy}
            className="text-black/50 transition hover:text-black"
          >
            {isPreparingReset ? 'Checking' : 'Forgot password?'}
          </button>
        </div>

        <Button type="submit" disabled={isSignInBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
          {isPasswordSubmitting ? 'Logging in' : 'Log In'}
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
