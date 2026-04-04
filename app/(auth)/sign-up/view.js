import { AUTH_BUTTON_CLASSNAMES, AUTH_INPUT_CLASSNAMES, AUTH_PAGE_STYLES } from '@/features/auth';
import AuthPageShell from '@/features/auth/page-shell';
import { Button, Input } from '@/ui/elements';
import { cn } from '@/ui/elements/utils';
import Icon from '@/ui/icon';

const SIGN_UP_STEPS = ['Email', 'Profile', 'Password'];

function AuthField({ children, hint, htmlFor, label }) {
  return (
    <div className={AUTH_PAGE_STYLES.fieldGroup}>
      <label htmlFor={htmlFor} className={AUTH_PAGE_STYLES.fieldLabel}>
        {label}
      </label>
      {children}
      {hint ? <p className={AUTH_PAGE_STYLES.helperText}>{hint}</p> : null}
    </div>
  );
}

function StepRail({ activeIndex }) {
  return (
    <div className={AUTH_PAGE_STYLES.stepper}>
      {SIGN_UP_STEPS.map((step, index) => {
        const isActive = activeIndex === index;

        return (
          <div
            key={step}
            className={cn(
              AUTH_PAGE_STYLES.stepItem,
              isActive ? AUTH_PAGE_STYLES.stepItemActive : AUTH_PAGE_STYLES.stepItemInactive
            )}
          >
            <span className={AUTH_PAGE_STYLES.stepDot}>{index + 1}</span>
            <span className={AUTH_PAGE_STYLES.stepLabel}>{step}</span>
          </div>
        );
      })}
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
  const panelTitle =
    currentStep === 0
      ? 'Start with your email'
      : currentStep === 1
        ? 'Choose your profile details'
        : 'Create your password';
  const panelText =
    currentStep === 0
      ? 'This email is used for verification and account recovery.'
      : currentStep === 1
        ? 'Pick a unique username and the display name people will see.'
        : 'After this step, we send a verification code and finish your account.';

  return (
    <AuthPageShell
      cardEyebrow="Create Account"
      title="Create your account"
      subtitle="A calmer, step-based sign-up flow built for light mode."
      switchCopy="Already have an account?"
      switchHref={signInHref}
      switchLabel="Sign in"
    >
      <form onSubmit={handleStepSubmit} className={AUTH_PAGE_STYLES.form}>
        <StepRail activeIndex={currentStep} />

        <div className={AUTH_PAGE_STYLES.panel}>
          <p className={AUTH_PAGE_STYLES.panelEyebrow}>Step {currentStep + 1}</p>
          <h2 className={AUTH_PAGE_STYLES.panelTitle}>{panelTitle}</h2>
          <p className={AUTH_PAGE_STYLES.panelText}>{panelText}</p>
        </div>

        {currentStep === 0 ? (
          <>
            <div className={AUTH_PAGE_STYLES.buttonStack}>
              <Button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={pendingAction === 'google' || isBusy}
                classNames={{
                  default:
                    'flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#0ea5e9] bg-[#cbd5e1] px-5 text-sm font-medium text-[#0f172a] transition disabled:cursor-not-allowed disabled:opacity-50',
                }}
              >
                <svg className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                {pendingAction === 'google' ? 'Signing up with Google...' : 'Sign up with Google'}
              </Button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="grow border-t border-[#0ea5e9]"></div>
              <span className="shrink-0 px-4 text-xs font-medium tracking-widest text-[#0f172a] uppercase">or</span>
              <div className="grow border-t border-[#0ea5e9]"></div>
            </div>

            <div className={AUTH_PAGE_STYLES.fieldStack}>
              <AuthField htmlFor="sign-up-email" label="Email">
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
            </div>
          </>
        ) : null}

        {currentStep === 1 ? (
          <div className={AUTH_PAGE_STYLES.splitFields}>
            <AuthField
              htmlFor="sign-up-username"
              label="Username"
              hint="This must be unique and will be used in your profile URL."
            >
              <Input
                id="sign-up-username"
                value={form.username}
                onChange={(event) => handleChange('username', event.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                classNames={AUTH_INPUT_CLASSNAMES}
              />
            </AuthField>

            <AuthField
              htmlFor="sign-up-display-name"
              label="Display name"
              hint="Optional. If left empty, your username will be used."
            >
              <Input
                id="sign-up-display-name"
                value={form.displayName}
                onChange={(event) => handleChange('displayName', event.target.value)}
                placeholder="Add a display name"
                autoComplete="name"
                classNames={AUTH_INPUT_CLASSNAMES}
              />
            </AuthField>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className={AUTH_PAGE_STYLES.fieldStack}>
            <div className={AUTH_PAGE_STYLES.splitFields}>
              <AuthField
                htmlFor="sign-up-password"
                label="Password"
                hint="Minimum 8 characters, with uppercase, number and symbol."
              >
                <Input
                  id="sign-up-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  classNames={AUTH_INPUT_CLASSNAMES}
                />
              </AuthField>

              <AuthField htmlFor="sign-up-confirm-password" label="Confirm password">
                <Input
                  id="sign-up-confirm-password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => handleChange('confirmPassword', event.target.value)}
                  placeholder="Confirm the password"
                  autoComplete="new-password"
                  classNames={AUTH_INPUT_CLASSNAMES}
                />
              </AuthField>
            </div>

            <div className={AUTH_PAGE_STYLES.infoBox}>
              <div className={AUTH_PAGE_STYLES.statusRow}>
                <Icon icon="solar:mailbox-linear" size={18} className="shrink-0 text-[#0f172a]" />
                <span>{form.email || 'Your verification email goes here'}</span>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 0 ? (
          <>
            <div className={AUTH_PAGE_STYLES.buttonStack}>
              <Button type="submit" disabled={isBusy} classNames={AUTH_BUTTON_CLASSNAMES.primary}>
                {pendingAction === 'step-email' ? 'Checking email' : 'Continue'}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-[#0f172a]">
              By proceeding, you accept the app-povs{' '}
              <a href="#" className="font-medium text-[#0f172a] underline underline-offset-2">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-[#0f172a] underline underline-offset-2">
                Privacy Policy
              </a>
            </p>
          </>
        ) : (
          <div className={AUTH_PAGE_STYLES.actionGrid}>
            <Button
              type="button"
              onClick={handlePreviousStep}
              disabled={isBusy}
              classNames={AUTH_BUTTON_CLASSNAMES.secondary}
            >
              Back
            </Button>

            <Button type="submit" disabled={isBusy} classNames={AUTH_BUTTON_CLASSNAMES.primary}>
              {currentStep === 1
                ? pendingAction === 'step-profile'
                  ? 'Checking username'
                  : 'Continue'
                : pendingAction === 'email'
                  ? 'Sending verification'
                  : 'Verify and create'}
            </Button>
          </div>
        )}
      </form>
    </AuthPageShell>
  );
}
