import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { OAUTH_PROVIDER_KEYS } from '@/domains/auth/oauth-providers';
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
import { Button, Input } from '@/ui/primitives';
import {
  dividerVariants,
  fieldVariants,
  footerVariants,
  headerContainerVariants,
  logoVariants,
  oauthContainerVariants,
  oauthItemVariants,
  pageContainerVariants,
  titleVariants,
} from '@/domains/auth/ui/auth-animation';

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

  return (
    <AuthPageShell>
      <AnimatePresence mode="wait">
        {isResetMode ? (
          <motion.form
            key="reset-mode-form"
            onSubmit={handleResetSubmit}
            className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 sm:px-10"
            variants={pageContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={headerContainerVariants} className="text-center">
              <motion.h1 variants={titleVariants} className="text-3xl font-semibold sm:text-4xl">
                Reset Password
              </motion.h1>
              <motion.p variants={titleVariants} className="mt-2 text-base text-black/50">
                {resetFlow.email}
              </motion.p>
            </motion.div>

            <motion.div variants={fieldVariants}>
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
            </motion.div>

            <motion.div variants={fieldVariants}>
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
            </motion.div>

            <motion.div variants={fieldVariants} className="grid gap-2 sm:grid-cols-2">
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
            </motion.div>
          </motion.form>
        ) : (
          <motion.form
            key="sign-in-form"
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 sm:px-10"
            variants={pageContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
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
                Welcome back
              </motion.h1>
            </motion.div>

            <motion.div variants={fieldVariants}>
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
            </motion.div>

            <motion.div variants={fieldVariants}>
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
            </motion.div>

            <motion.div variants={fieldVariants}>
              <Button type="submit" disabled={isSignInBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
                {isPasswordSubmitting ? 'Logging in' : 'Log In'}
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
                    mode="sign-in"
                    isBusy={activeOAuthProvider === provider}
                    disabled={Boolean(activeOAuthProvider) || isSignInBusy}
                    onClick={() => handleOAuthSignIn(provider)}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.p variants={footerVariants} className="mt-2 text-center text-sm font-medium text-black/50">
              Don&apos;t have an account?{' '}
              <Link
                href={signUpHref}
                className="rounded px-1 text-black hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
              >
                Sign Up
              </Link>
            </motion.p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  );
}
