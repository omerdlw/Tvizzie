import { cn } from '@/core/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import AccountHero from '@/features/account/profile/hero';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import Icon from '@/ui/icon';
import Registry from './registry';

const INPUT_BASE_CLASSES =
  'w-full px-3 py-2.5 text-sm border border-[#0284c7] bg-[#dbeafe] text-black/70 outline-none transition-colors disabled:cursor-not-allowed';
const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y`;
const BUTTON_BASE_CLASSES = 'border border-[#0284c7] bg-[#dbeafe] text-black/70 px-3 py-2.5';
const BUTTON_FRAME_CLASSES =
  'inline-flex h-11 items-center justify-center gap-2 px-4 text-[11px] font-bold tracking-widest uppercase transition-colors  disabled:cursor-not-allowed ';

function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? 'border border-[#dc2626] bg-[#fecaca] text-[#7f1d1d]' : BUTTON_BASE_CLASSES,
        className
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </button>
  );
}

function StatusState({ title, description }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl border border-[#0284c7] p-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest text-[#0f172a] uppercase">Account Editor</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#0f172a]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#0f172a]">{description}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children, className, contentClassName }) {
  return (
    <section className={className}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-black/70">{description}</p> : null}
      </div>
      <div className={cn('mt-5 flex flex-col gap-3', contentClassName)}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold tracking-wide text-black/70 uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-black/70">{hint}</span> : null}
    </label>
  );
}

export default function AccountEditView(props) {
  const {
    auth,
    isLoading,
    profile,
    activeTab,
    isSaving,
    form,
    emailFlow,
    passwordFlow,
    deleteFlow,
    deleteConfirmation,
    heroProfile,
    likesCount,
    followerCount,
    followingCount,
    listsCount,
    watchedCount,
    watchlistCount,
    avatarPreview,
    bannerPreview,
    heroDisplayName,
    isGeneralAccountDirty,
    canUsePasswordSecurity,
    isPasswordLinked,
    formRef,
    handleChange,
    handleSignIn,
    handleSave,
    setActiveTab,
    handleAccountSubmit,
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleSetPassword,
    setEmailFlow,
    setPasswordFlow,
    setDeleteFlow,
  } = props;

  const editRegistry = (
    <Registry
      activeTab={activeTab}
      authIsAuthenticated={auth?.isAuthenticated}
      avatarPreview={avatarPreview}
      deleteConfirmation={deleteConfirmation}
      handleSignIn={handleSignIn}
      handleSave={handleSave}
      isGeneralAccountDirty={isGeneralAccountDirty}
      isLoading={!auth?.isReady || isLoading}
      isSaving={isSaving}
      setActiveTab={setActiveTab}
    />
  );

  if (!auth.isReady || isLoading) {
    return (
      <>
        {editRegistry}
        <AccountRouteSkeleton variant="edit" />
      </>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        {editRegistry}
        <AccountRouteSkeleton variant="edit" />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        {editRegistry}
        <main className="relative min-h-screen overflow-hidden text-[#0f172a]">
          <div className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 p-4`}>
            <StatusState
              title="Account data unavailable"
              description="We could not load your editable profile data right now."
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {editRegistry}
      <main className="relative min-h-screen overflow-hidden text-[#0f172a]">
        <AccountHero
          profile={heroProfile}
          likesCount={likesCount}
          followerCount={followerCount}
          followingCount={followingCount}
          listsCount={listsCount}
          watchedCount={watchedCount}
          watchlistCount={watchlistCount}
        />

        <div className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 p-4`}>
          {activeTab === 'general' ? (
            <form ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col gap-6">
              <div className="grid gap-3 xl:grid-cols-2">
                <SectionCard title="General Info" description="Update how your account appears across Tvizzie.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Display Name">
                      <input
                        value={form.displayName}
                        onChange={(event) => handleChange('displayName', event.target.value)}
                        placeholder="Your name"
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>

                    <Field label="Username" hint="Used in your public profile URL.">
                      <input
                        value={form.username}
                        onChange={(event) => handleChange('username', event.target.value)}
                        placeholder="username"
                        spellCheck={false}
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>
                  </div>

                  <Field label="Bio" hint="Short and readable profile summary.">
                    <textarea
                      value={form.description}
                      onChange={(event) => handleChange('description', event.target.value)}
                      placeholder="Write something about yourself"
                      rows={6}
                      className={TEXTAREA_BASE_CLASSES}
                    />
                  </Field>
                </SectionCard>

                <SectionCard
                  title="Avatar & Banner"
                  description="Public media URLs for profile surfaces."
                  className="h-full"
                >
                  <Field label="Avatar URL">
                    <input
                      value={form.avatarUrl}
                      onChange={(event) => handleChange('avatarUrl', event.target.value)}
                      placeholder="https://"
                      spellCheck={false}
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>

                  <Field label="Banner URL">
                    <input
                      value={form.bannerUrl}
                      onChange={(event) => handleChange('bannerUrl', event.target.value)}
                      placeholder="https://"
                      spellCheck={false}
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#0f172a] uppercase">Avatar</p>
                      <div className={cn('overflow-hidden border border-[#0ea5e9]', 'aspect-square')}>
                        <img
                          src={avatarPreview}
                          alt={`${heroDisplayName} avatar preview`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#0f172a] uppercase">Banner</p>
                      <div className={cn('overflow-hidden border border-[#0ea5e9]', 'aspect-[16/7]')}>
                        {bannerPreview ? (
                          <img
                            src={bannerPreview}
                            alt={`${heroDisplayName} banner preview`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[#dbeafe]" />
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Privacy"
                description="Control whether your profile data is public or follower-only."
                className="w-full"
              >
                <button
                  type="button"
                  onClick={() => handleChange('isPrivate', !form.isPrivate)}
                  className="flex w-full items-center justify-between gap-3 border border-[#0ea5e9] p-4 text-left"
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold tracking-wide text-black/70 uppercase">
                      {form.isPrivate ? 'Private profile' : 'Public profile'}
                    </span>
                    <span className="text-xs leading-5 text-black/70">
                      {form.isPrivate
                        ? 'Only approved followers can inspect your collections.'
                        : 'Anyone can inspect your collections and profile activity.'}
                    </span>
                  </div>

                  <span className="flex h-6 w-11 border border-[#38bdf8] p-0.5" aria-hidden="true">
                    <span
                      className={cn(
                        'h-full w-5 transition-transform',
                        form.isPrivate ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </span>
                </button>
              </SectionCard>
            </form>
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              {!canUsePasswordSecurity ? (
                <SectionCard
                  title="Enable Password Sign-In"
                  description="Set a password to unlock email updates and sensitive account operations."
                >
                  <div className="border border-[#0ea5e9] p-4 text-sm leading-6 text-[#0f172a]">
                    Email/password sign-in is not linked yet. Complete the set password flow below to continue.
                  </div>
                </SectionCard>
              ) : null}

              {canUsePasswordSecurity ? (
                <SectionCard
                  title="Change Email"
                  description="Confirm your current password, then verify your new email."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Current Password">
                      <input
                        type="password"
                        value={emailFlow.currentPassword}
                        onChange={(event) =>
                          setEmailFlow((prev) => ({
                            ...prev,
                            currentPassword: event.target.value,
                          }))
                        }
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>

                    <Field label="New Email">
                      <input
                        type="email"
                        value={emailFlow.newEmail}
                        onChange={(event) =>
                          setEmailFlow((prev) => ({
                            ...prev,
                            newEmail: event.target.value,
                          }))
                        }
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>
                  </div>

                  <ActionButton
                    type="button"
                    onClick={handleCompleteEmailChange}
                    disabled={emailFlow.isSubmitting}
                    className="w-full sm:w-fit"
                  >
                    {emailFlow.isSubmitting ? 'Verifying' : 'Verify and Update'}
                  </ActionButton>
                </SectionCard>
              ) : null}

              <SectionCard
                title={isPasswordLinked ? 'Change Password' : 'Set Password'}
                description={
                  isPasswordLinked
                    ? 'Confirm your current password and verify your current email.'
                    : 'Verify your current email, then add email/password sign-in to this account.'
                }
              >
                {isPasswordLinked ? (
                  <Field label="Current Password">
                    <input
                      type="password"
                      value={passwordFlow.currentPassword}
                      onChange={(event) =>
                        setPasswordFlow((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="New Password">
                    <input
                      type="password"
                      value={passwordFlow.newPassword}
                      onChange={(event) =>
                        setPasswordFlow((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                        }))
                      }
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>

                  <Field label="Confirm Password">
                    <input
                      type="password"
                      value={passwordFlow.confirmPassword}
                      onChange={(event) =>
                        setPasswordFlow((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>
                </div>

                <ActionButton
                  type="button"
                  onClick={isPasswordLinked ? handleCompletePasswordChange : handleSetPassword}
                  disabled={passwordFlow.isSubmitting}
                  className="w-full sm:w-fit"
                >
                  {passwordFlow.isSubmitting
                    ? isPasswordLinked
                      ? 'Verifying'
                      : 'Setting'
                    : isPasswordLinked
                      ? 'Verify and Update'
                      : 'Verify and Set Password'}
                </ActionButton>
              </SectionCard>

              <SectionCard
                title="Delete Account"
                description={
                  isPasswordLinked
                    ? 'Deleting your account is permanent. Type DELETE and confirm with your current password.'
                    : 'Deleting your account is permanent. Type DELETE, then verify your current email to continue.'
                }
              >
                <Field label="Type DELETE to Confirm">
                  <input
                    value={deleteFlow.confirmText}
                    onChange={(event) =>
                      setDeleteFlow((prev) => ({
                        ...prev,
                        confirmText: event.target.value,
                      }))
                    }
                    placeholder="DELETE"
                    className={INPUT_BASE_CLASSES}
                  />
                </Field>

                {isPasswordLinked ? (
                  <Field label="Current Password">
                    <input
                      type="password"
                      value={deleteFlow.currentPassword}
                      onChange={(event) =>
                        setDeleteFlow((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      className={INPUT_BASE_CLASSES}
                    />
                  </Field>
                ) : null}

                <ActionButton
                  type="button"
                  tone="danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteFlow.isSubmitting}
                  className="w-full"
                >
                  {deleteFlow.isSubmitting ? 'Deleting' : 'Delete Account'}
                </ActionButton>
              </SectionCard>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
