import {
  AUTH_BUTTON_CLASSNAMES,
  AUTH_INPUT_CLASSNAMES,
  AUTH_PAGE_STYLES,
} from '@/features/auth'
import AuthPageShell from '@/features/auth/page-shell'
import { Button, Input } from '@/ui/elements'
import { cn } from '@/ui/elements/utils'
import Icon from '@/ui/icon'

const SIGN_IN_STEPS = ['Account', 'Password']

function AuthField({ children, hint, htmlFor, label }) {
  return (
    <div className={AUTH_PAGE_STYLES.fieldGroup}>
      <label htmlFor={htmlFor} className={AUTH_PAGE_STYLES.fieldLabel}>
        {label}
      </label>
      {children}
      {hint ? <p className={AUTH_PAGE_STYLES.helperText}>{hint}</p> : null}
    </div>
  )
}

function StepRail({ activeIndex }) {
  return (
    <div className={AUTH_PAGE_STYLES.stepper}>
      {SIGN_IN_STEPS.map((step, index) => {
        const isActive = activeIndex === index

        return (
          <div
            key={step}
            className={cn(
              AUTH_PAGE_STYLES.stepItem,
              isActive
                ? AUTH_PAGE_STYLES.stepItemActive
                : AUTH_PAGE_STYLES.stepItemInactive
            )}
          >
            <span className={AUTH_PAGE_STYLES.stepDot}>{index + 1}</span>
            <span className={AUTH_PAGE_STYLES.stepLabel}>{step}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function View({
  currentStep,
  handleContinueToPassword,
  handleGoBackToIdentifier,
  handleRequestPasswordReset,
  handleResetSubmit,
  handleSubmit,
  identifier,
  isIdentifierChecking,
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
  const activeStepIndex = currentStep === 'password' ? 1 : 0

  return (
    <AuthPageShell
      cardEyebrow={isResetMode ? 'Reset Password' : 'Sign In'}
      title={isResetMode ? 'Set a new password' : 'Welcome back'}
      subtitle={
        isResetMode
          ? 'Choose a fresh password for the verified account.'
          : 'A lighter sign-in flow that only shows the current step.'
      }
      switchCopy={!isResetMode ? 'No account yet?' : null}
      switchHref={!isResetMode ? signUpHref : null}
      switchLabel={!isResetMode ? 'Create account' : null}
    >
      {!isResetMode ? (
        <form
          onSubmit={
            currentStep === 'identifier'
              ? handleContinueToPassword
              : handleSubmit
          }
          className={AUTH_PAGE_STYLES.form}
        >
          <StepRail activeIndex={activeStepIndex} />
          {currentStep === 'identifier' ? (
            <>
              <div className={AUTH_PAGE_STYLES.buttonStack}>
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSubmitting || isSignInBusy}
                  classNames={{ default: 'flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50' }}
                >
                  <svg className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {isGoogleSubmitting ? 'Signing in with Google...' : 'Sign in with Google'}
                </Button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-white/10"></div>
                <span className="shrink-0 px-4 text-xs font-medium text-white/40 uppercase tracking-widest">or</span>
                <div className="grow border-t border-white/10"></div>
              </div>

              <div className={AUTH_PAGE_STYLES.fieldStack}>
                <AuthField
                  htmlFor="sign-in-identifier"
                  label="Username or email"
                >
                  <Input
                    id="sign-in-identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="username"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>
              </div>
            </>
          ) : (
            <>
              <div className={AUTH_PAGE_STYLES.infoBox}>
                <div className={AUTH_PAGE_STYLES.statusRow}>
                  <Icon
                    icon="solar:user-circle-linear"
                    size={18}
                    className="shrink-0 text-white/50"
                  />
                  <span>{identifier}</span>
                </div>
              </div>

              <div className={AUTH_PAGE_STYLES.fieldStack}>
                <AuthField htmlFor="sign-in-password" label="Password">
                  <Input
                    id="sign-in-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    classNames={AUTH_INPUT_CLASSNAMES}
                  />
                </AuthField>
              </div>

              <div className={AUTH_PAGE_STYLES.checkboxRow}>
                <label className={AUTH_PAGE_STYLES.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(event) =>
                      setRememberDevice(event.target.checked)
                    }
                    disabled={isSignInBusy}
                    className={AUTH_PAGE_STYLES.checkbox}
                  />
                  <span className={AUTH_PAGE_STYLES.checkboxText}>
                    <span className="sm:hidden">Remember for 30 days</span>
                    <span className="hidden sm:inline">
                      Remember this device for 30 days
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleRequestPasswordReset}
                  disabled={isSignInBusy}
                  className={AUTH_PAGE_STYLES.ghostAction}
                >
                  {isPreparingReset ? 'Checking account' : 'Forgot password'}
                </button>
              </div>
            </>
          )}

          {currentStep === 'identifier' ? (
            <>
              <div className={AUTH_PAGE_STYLES.buttonStack}>
                <Button
                  type="submit"
                  disabled={isSignInBusy}
                  classNames={AUTH_BUTTON_CLASSNAMES.primary}
                >
                  {isIdentifierChecking ? 'Continuing' : 'Continue'}
                </Button>
              </div>

              <p className="mt-4 text-center text-xs leading-relaxed text-white/40">
                By proceeding, you accept the app-povs{' '}
                <a href="#" className="font-medium text-white/60 hover:text-white underline underline-offset-2">Terms</a> and{' '}
                <a href="#" className="font-medium text-white/60 hover:text-white underline underline-offset-2">Privacy Policy</a>
              </p>
            </>
          ) : (
            <div className={AUTH_PAGE_STYLES.actionGrid}>
              <Button
                type="button"
                onClick={handleGoBackToIdentifier}
                disabled={isSignInBusy}
                classNames={AUTH_BUTTON_CLASSNAMES.secondary}
              >
                Back
              </Button>

              <Button
                type="submit"
                disabled={isSignInBusy}
                classNames={AUTH_BUTTON_CLASSNAMES.primary}
              >
                {isPasswordSubmitting ? 'Signing in' : 'Sign in'}
              </Button>
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={handleResetSubmit} className={AUTH_PAGE_STYLES.form}>
          <div className={AUTH_PAGE_STYLES.panel}>
            <p className={AUTH_PAGE_STYLES.panelEyebrow}>Verified account</p>
            <h2 className={AUTH_PAGE_STYLES.panelTitle}>Create a new password</h2>
            <p className={AUTH_PAGE_STYLES.panelText}>
              Set a strong password to complete recovery for this account.
            </p>
          </div>

          <div className={AUTH_PAGE_STYLES.infoBox}>
            <div className={AUTH_PAGE_STYLES.statusRow}>
              <Icon
                icon="solar:mailbox-linear"
                size={18}
                className="shrink-0 text-white/50"
              />
              <span>{resetFlow.email}</span>
            </div>
          </div>

          <div className={AUTH_PAGE_STYLES.fieldStack}>
            <AuthField htmlFor="reset-password" label="New password">
              <Input
                id="reset-password"
                type="password"
                value={resetFlow.newPassword}
                onChange={(event) =>
                  setResetFlow((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }))
                }
                placeholder="Choose a new password"
                autoComplete="new-password"
                classNames={AUTH_INPUT_CLASSNAMES}
              />
            </AuthField>

            <AuthField
              htmlFor="reset-password-confirmation"
              label="Confirm password"
            >
              <Input
                id="reset-password-confirmation"
                type="password"
                value={resetFlow.confirmPassword}
                onChange={(event) =>
                  setResetFlow((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Confirm the new password"
                autoComplete="new-password"
                classNames={AUTH_INPUT_CLASSNAMES}
              />
            </AuthField>
          </div>

          <div className={AUTH_PAGE_STYLES.actionGrid}>
            <Button
              type="submit"
              disabled={resetFlow.isSubmitting || !resetFlow.passwordResetProof}
              classNames={AUTH_BUTTON_CLASSNAMES.primary}
            >
              {resetFlow.isSubmitting ? 'Resetting' : 'Reset password'}
            </Button>

            <Button
              type="button"
              onClick={() => setResetFlow(INITIAL_RESET_FLOW)}
              disabled={resetFlow.isSubmitting}
              classNames={AUTH_BUTTON_CLASSNAMES.secondary}
            >
              Back to sign in
            </Button>
          </div>
        </form>
      )}
    </AuthPageShell>
  )
}
