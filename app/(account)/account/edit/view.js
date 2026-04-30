import { cn } from '@/core/utils';
import { DESTRUCTIVE_ACTION_TONE_CLASS, PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { useNavHeight } from '@/core/modules/nav/hooks';
import { AccountNavReveal, AccountSectionNav, AccountSectionReveal } from '@/features/account/shared/layout';
import { AccountSectionHeading } from '@/features/account/shared/section-wrapper';
import { ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import AccountHero from '@/features/account/shared/hero';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import Icon from '@/ui/icon';
import Registry from './registry';

const INPUT_BASE_CLASSES =
  'h-11 w-full border border-black/15 bg-primary px-3 text-sm text-black outline-none transition-colors placeholder:text-black/50 focus:border-black';
const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y py-3`;
const BUTTON_BASE_CLASSES =
  ' border border-black/15 bg-white px-3 py-2 text-black transition-colors hover:bg-black/5 disabled:opacity-60';
const BUTTON_FRAME_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2 px-4 text-[11px] font-bold tracking-widest uppercase transition-colors disabled:cursor-not-allowed';

function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? DESTRUCTIVE_ACTION_TONE_CLASS : BUTTON_BASE_CLASSES,
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
      <div className="w-full max-w-xl border border-black/15 bg-white p-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest uppercase">Account Editor</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-black/70">{description}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children, className, contentClassName, summaryLabel }) {
  return (
    <section className="relative bg-transparent">
      <AccountSectionReveal>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col gap-6`, className)}>
          <AccountSectionHeading title={title} summaryLabel={summaryLabel} />
          {description ? <p className="text-sm leading-6 text-black/70">{description}</p> : null}
          <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
        </div>
      </AccountSectionReveal>
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

function MediaField({
  fieldLabel,
  value,
  placeholder = 'https://',
  preview,
  previewAlt,
  previewClassName,
  isUploading,
  isDisabled,
  onChange,
  onClear,
  onOpenUpload,
}) {
  const shouldDisableActions = isDisabled || isUploading;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <Field label={fieldLabel}>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            type="button"
            onClick={onOpenUpload}
            disabled={shouldDisableActions}
            icon={isUploading ? 'solar:refresh-bold' : 'solar:upload-bold'}
          >
            {isUploading ? 'Uploading' : 'Upload Media'}
          </ActionButton>

          <ActionButton type="button" onClick={onClear} disabled={!value || shouldDisableActions}>
            Clear
          </ActionButton>
        </div>
      </div>

      <div>
        <div className={cn('overflow-hidden border border-black/10 bg-black/5', previewClassName)}>
          {preview ? (
            <AdaptiveImage
              mode="img"
              src={preview}
              alt={previewAlt}
              decoding="async"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/5 text-black/70">
              <Icon icon="solar:gallery-bold" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountEditView(props) {
  const { navHeight } = useNavHeight();
  const {
    currentAuthEmail,
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
    isAnyMediaUploading,
    mediaUploadFileName,
    mediaUploadState,
    canUsePasswordSecurity,
    isPasswordLinked,
    formRef,
    handleChange,
    handleClearMedia,
    handleOpenMediaUpload,
    handleCancel,
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
  const resolvedNavHeight = Math.max(0, Math.round(navHeight || 0));

  const editRegistry = (
    <Registry
      activeTab={activeTab}
      authIsAuthenticated={auth?.isAuthenticated}
      avatarPreview={avatarPreview}
      deleteConfirmation={deleteConfirmation}
      handleCancel={handleCancel}
      handleSignIn={handleSignIn}
      handleSave={handleSave}
      isGeneralAccountDirty={isGeneralAccountDirty}
      isLoading={!auth?.isReady || isLoading}
      isMediaUploading={isAnyMediaUploading}
      mediaUploadFileName={mediaUploadFileName}
      isSaving={isSaving}
      setActiveTab={setActiveTab}
    />
  );

  if (!auth.isReady || isLoading) {
    return <AccountRouteSkeleton variant="edit" />;
  }

  if (!auth.isAuthenticated) {
    return <AccountRouteSkeleton variant="edit" />;
  }

  if (!profile) {
    return (
      <>
        {editRegistry}
        <PageGradientShell>
          <main
            className="relative min-h-screen overflow-hidden"
            style={{ paddingBottom: `calc(${resolvedNavHeight}px + 1rem)` }}
          >
            <div className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 p-4`}>
              <StatusState
                title="Account data unavailable"
                description="We could not load your editable profile data right now."
              />
            </div>
          </main>
        </PageGradientShell>
      </>
    );
  }

  return (
    <>
      {editRegistry}
      <PageGradientShell>
        <main
          className="relative min-h-screen overflow-hidden"
          style={{ paddingBottom: `calc(${resolvedNavHeight}px + 1rem)` }}
        >
          <div className="relative">
            <AccountHero
              profile={heroProfile}
              likesCount={likesCount}
              followerCount={followerCount}
              followingCount={followingCount}
              listsCount={listsCount}
              watchedCount={watchedCount}
              watchlistCount={watchlistCount}
            />
            <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
              <AccountSectionNav activeKey="overview" username={profile?.username || heroProfile?.username || null} />
            </AccountNavReveal>
          </div>

          <div className="relative">
            {activeTab === 'general' ? (
              <form ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col">
                <SectionCard title="Identity">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Display Name">
                      <input
                        value={form.displayName}
                        onChange={(event) => handleChange('displayName', event.target.value)}
                        placeholder="Your name"
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>

                    <Field label="Username">
                      <input
                        value={form.username}
                        onChange={(event) => handleChange('username', event.target.value)}
                        placeholder="username"
                        spellCheck={false}
                        className={INPUT_BASE_CLASSES}
                      />
                    </Field>
                  </div>

                  <Field label="Bio">
                    <textarea
                      value={form.description}
                      onChange={(event) => handleChange('description', event.target.value)}
                      placeholder="Write something about yourself"
                      rows={6}
                      className={TEXTAREA_BASE_CLASSES}
                    />
                  </Field>
                </SectionCard>

                <SectionCard title="Avatar & Logo">
                  <MediaField
                    fieldLabel="Avatar URL"
                    value={form.avatarUrl}
                    preview={avatarPreview}
                    previewAlt={`${heroDisplayName} avatar preview`}
                    previewClassName="aspect-square"
                    isUploading={Boolean(mediaUploadState?.avatar)}
                    isDisabled={isSaving || isAnyMediaUploading}
                    onChange={(value) => handleChange('avatarUrl', value)}
                    onClear={() => handleClearMedia('avatar')}
                    onOpenUpload={() => handleOpenMediaUpload('avatar')}
                  />

                  <div className="h-px w-full bg-black/10" />

                  <MediaField
                    fieldLabel="Logo URL"
                    value={form.bannerUrl}
                    preview={bannerPreview}
                    previewAlt={`${heroDisplayName} logo preview`}
                    previewClassName="aspect-[16/7]"
                    isUploading={Boolean(mediaUploadState?.banner)}
                    isDisabled={isSaving || isAnyMediaUploading}
                    onChange={(value) => handleChange('bannerUrl', value)}
                    onClear={() => handleClearMedia('logo')}
                    onOpenUpload={() => handleOpenMediaUpload('banner')}
                  />
                </SectionCard>

                <SectionCard title="Privacy">
                  <button
                    type="button"
                    onClick={() => handleChange('isPrivate', !form.isPrivate)}
                    className="flex w-full items-center justify-between gap-3 text-left"
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

                    <span
                      className="flex h-6 w-11 border border-black/15 bg-white p-px"
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          'h-full w-5 bg-black transition-transform',
                          form.isPrivate ? 'bg-info translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </span>
                  </button>
                </SectionCard>
              </form>
            ) : (
              <div className="flex flex-col">
                {!canUsePasswordSecurity ? (
                  <SectionCard title="Enable Password Sign-In">
                    <div className="bg-black/5 p-3 text-sm leading-6 text-black/50">
                      Email/password sign-in is not linked yet. Complete the set password flow below to continue.
                    </div>
                  </SectionCard>
                ) : null}

                {canUsePasswordSecurity ? (
                  <SectionCard
                    title="Change Email"
                    summaryLabel={
                      currentAuthEmail && (
                        <span className="text-[10px] font-medium tracking-normal text-black/40 lowercase">
                          {currentAuthEmail}
                        </span>
                      )
                    }
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

                <SectionCard title={isPasswordLinked ? 'Change Password' : 'Set Password'}>
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

                <SectionCard title="Delete Account">
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
      </PageGradientShell>
    </>
  );
}
