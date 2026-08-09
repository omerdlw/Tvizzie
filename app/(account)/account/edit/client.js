'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { useAccountEditData, useAccountSecurityActions } from '@/domains/account/hooks';
import {
  INITIAL_DELETE_FLOW,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  clearAccountFeedback,
  emitAccountFeedback,
  getAvatarFallback,
  logDataError,
  normalizeEmail,
  normalizeOptionalText,
  normalizeProviderIds,
} from '@/domains/account/utils';
import {
  ACCOUNT_ROUTE_SHELL_CLASS,
  ACCOUNT_SECTION_SHELL_CLASS,
  DESTRUCTIVE_ACTION_TONE_CLASS,
  PAGE_SHELL_MAX_WIDTH_CLASS,
} from '@/shared/constants';
import { uploadAccountMediaFile } from '@/domains/account/client';
import { useAccount } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useNavigationActions } from '@/modules/nav';
import { createFileUploadSurfaceEntry } from '@/ui/feedback/file-upload-surface';
import { useToast } from '@/modules/notification';
// AccountEditView is defined in this route client.
import { useNavHeight } from '@/modules/nav';
import {
  AccountHeroReveal,
  AccountNavReveal,
  AccountSectionNav,
  AccountSectionReveal,
} from '@/domains/account/ui/layouts/account-layout';
import AccountGridFrame from '@/domains/account/ui/layouts/account-grid-frame';
import { AccountSectionHeading } from '@/domains/account/ui/sections/account-section';
import AccountHero from '@/domains/account/ui/sections/account-hero';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { Spinner } from '@/ui/feedback/spinner';
import Icon from '@/ui/primitives/icon';
import { AccountEditRegistry as Registry } from '@/app/(account)/registry';
import { cn } from '@/core/shared/utils';
const ACCOUNT_MEDIA_UPLOAD_CONFIG = Object.freeze({
  avatar: {
    buttonLabel: 'Choose avatar',
    description: 'Drop your avatar image here or pick it from your device',
    hint: 'PNG, JPG, WEBP, AVIF or GIF',
    title: 'Upload avatar',
  },
  banner: {
    buttonLabel: 'Choose logo',
    description: 'Drop your logo image here or pick it from your device',
    hint: 'PNG, JPG, WEBP, AVIF or GIF',
    title: 'Upload logo',
  },
});

export default function Client({ initialSnapshot = null }) {
  const { updateCurrentAccount } = useAccount();
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModal();
  const { openSurface } = useNavigationActions();

  const formRef = useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [emailFlow, setEmailFlow] = useState(INITIAL_EMAIL_FLOW);
  const [passwordFlow, setPasswordFlow] = useState(INITIAL_PASSWORD_FLOW);
  const [deleteFlow, setDeleteFlow] = useState(INITIAL_DELETE_FLOW);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [mediaUploadState, setMediaUploadState] = useState({
    avatar: null,
    banner: null,
  });

  const {
    followerCount,
    followingCount,
    form,
    isLoading,
    likesCount,
    linkedProviderIdsOverride,
    listsCount,
    profile,
    applyProfile,
    setForm,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount,
    watchlistCount,
  } = useAccountEditData({
    auth,
    initialSnapshot,
    toast,
  });

  const userIdentities = Array.isArray(auth?.user?.identities)
    ? auth.user.identities
    : Array.isArray(auth?.user?.metadata?.identities)
      ? auth.user.metadata.identities
      : [];

  const providerIdsFromAuth =
    auth?.user?.metadata?.providerIds ||
    auth?.user?.providerIds ||
    userIdentities.map((i) => i?.provider || i?.identity_provider) ||
    [];

  const normalizedProviderIds = (Array.isArray(providerIdsFromAuth) ? providerIdsFromAuth : []).map(
    (p) =>
      String(p || '')
        .trim()
        .toLowerCase(),
  );

  const linkedProviderIds = Array.isArray(linkedProviderIdsOverride)
    ? linkedProviderIdsOverride
    : normalizedProviderIds;

  const isPasswordLinked =
    auth?.capabilities?.passwordEnabled === true ||
    linkedProviderIds.includes('password') ||
    linkedProviderIds.includes('email') ||
    userIdentities.some((i) =>
      ['email', 'password'].includes(String(i?.provider || i?.identity_provider).toLowerCase()),
    ) ||
    Boolean(auth?.user?.email || profile?.email);

  const canUsePasswordSecurity = isPasswordLinked;

  const avatarPreview = useMemo(() => {
    const url = form?.avatarUrl?.trim();
    if (url) return url;
    return getAvatarFallback(profile);
  }, [form?.avatarUrl, profile]);

  const bannerPreview = useMemo(() => {
    return normalizeOptionalText(form?.bannerUrl) || profile?.bannerUrl || '';
  }, [form?.bannerUrl, profile?.bannerUrl]);

  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const currentAuthEmail = normalizeEmail(profile?.email || auth?.user?.email || '');
  const heroProfile = useMemo(
    () => ({
      ...profile,
      avatarUrl: normalizeOptionalText(form?.avatarUrl),
      bannerUrl: normalizeOptionalText(form?.bannerUrl),
      description: normalizeOptionalText(form?.description),
      displayName: normalizeOptionalText(form?.displayName),
      username: normalizeOptionalText(form?.username),
      isPrivate: Boolean(form?.isPrivate),
    }),
    [form, profile],
  );
  const heroDisplayName = heroProfile?.displayName || heroProfile?.username || 'Account';
  const isGeneralAccountDirty = useMemo(() => {
    if (!profile || !form) {
      return false;
    }

    return (
      normalizeOptionalText(form.displayName) !== normalizeOptionalText(profile.displayName) ||
      normalizeOptionalText(form.username) !== normalizeOptionalText(profile.username) ||
      normalizeOptionalText(form.description) !== normalizeOptionalText(profile.description) ||
      Boolean(form.isPrivate) !== Boolean(profile.isPrivate) ||
      normalizeOptionalText(form.avatarUrl) !== normalizeOptionalText(profile.avatarUrl) ||
      normalizeOptionalText(form.bannerUrl) !== normalizeOptionalText(profile.bannerUrl)
    );
  }, [form, profile]);
  const activeMediaUpload = useMemo(() => {
    return mediaUploadState.avatar || mediaUploadState.banner || null;
  }, [mediaUploadState.avatar, mediaUploadState.banner]);
  const isAnyMediaUploading = Boolean(activeMediaUpload);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMediaUpload = useCallback(
    async (target, file) => {
      if (!file) {
        return;
      }

      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      const label = normalizedTarget === 'avatar' ? 'Avatar' : 'Logo';

      setMediaUploadState((prev) => ({
        ...prev,
        [normalizedTarget]: {
          fileName: file?.name || `${label}.image`,
        },
      }));

      try {
        const result = await uploadAccountMediaFile({
          file,
          target: normalizedTarget,
        });

        setForm((prev) => ({
          ...prev,
          [field]: result.url,
        }));
      } catch (error) {
        toast.error(error?.message || `${label} could not be uploaded`);
      } finally {
        setMediaUploadState((prev) => ({
          ...prev,
          [normalizedTarget]: null,
        }));
      }
    },
    [setForm, toast],
  );

  const handleClearMedia = useCallback(
    (target) => {
      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';

      setForm((prev) => ({
        ...prev,
        [field]: '',
      }));
    },
    [setForm],
  );

  const handleSignIn = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      }),
    );
  }, [currentPath, router]);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit?.();
  }, []);

  const handleCancel = useCallback(() => {
    if (!profile || isSaving || isAnyMediaUploading) {
      return;
    }

    setForm({
      avatarUrl: profile.avatarUrl || '',
      bannerUrl: profile.bannerUrl || '',
      description: profile.description || '',
      displayName: profile.displayName || '',
      isPrivate: profile.isPrivate === true,
      username: profile.username || '',
    });
  }, [isAnyMediaUploading, isSaving, profile, setForm]);

  const handleOpenMediaUpload = useCallback(
    async (target) => {
      if (isSaving || isAnyMediaUploading) {
        return;
      }

      const normalizedTarget =
        String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const selection = await openSurface(
        createFileUploadSurfaceEntry({
          ...ACCOUNT_MEDIA_UPLOAD_CONFIG[normalizedTarget],
          target: normalizedTarget,
        }),
      );

      if (!selection?.success || !selection?.file) {
        return;
      }

      await handleMediaUpload(normalizedTarget, selection.file);
    },
    [handleMediaUpload, isAnyMediaUploading, isSaving, openSurface],
  );

  useEffect(() => {
    if (!auth.isReady || isLoading || auth.isAuthenticated) {
      return;
    }

    router.replace(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      }),
    );
  }, [auth.isAuthenticated, auth.isReady, currentPath, isLoading, router]);

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    if (isAnyMediaUploading) {
      toast.error('Please wait for uploads to finish');
      return;
    }

    if (!auth.user?.id || !profile || isSaving) return;

    setIsSaving(true);

    try {
      emitAccountFeedback('account-update', 'start');

      const nextProfile = await updateCurrentAccount({
        avatarUrl: form.avatarUrl,
        bannerUrl: form.bannerUrl,
        description: form.description,
        displayName: form.displayName,
        isPrivate: form.isPrivate,
        username: form.username,
      });

      if (auth?.updateProfile) {
        try {
          await auth.updateProfile({
            displayName: nextProfile.displayName,
            photoURL: nextProfile.avatarUrl || null,
          });
        } catch (syncError) {
          logDataError('[Account Edit] Auth sync error:', syncError);
        }
      }

      applyProfile(nextProfile);
      emitAccountFeedback('account-update', 'success');
      router.push('/account');
    } catch (error) {
      clearAccountFeedback('account-update');
      toast.error(error?.message || 'Account could not be updated');
    } finally {
      setIsSaving(false);
    }
  };

  const {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleSetPassword,
  } = useAccountSecurityActions({
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    deleteFlow,
    emailFlow,
    isPasswordLinked,
    isSaving,
    openModal,
    openSurface,
    passwordFlow,
    setDeleteConfirmation,
    setDeleteFlow,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    setPasswordFlow,
    supportsGoogleLinking: false,
    toast,
  });

  return (
    <AccountEditView
      auth={auth}
      currentAuthEmail={currentAuthEmail}
      isLoading={isLoading}
      profile={profile}
      activeTab={activeTab}
      isSaving={isSaving}
      form={form}
      emailFlow={emailFlow}
      passwordFlow={passwordFlow}
      deleteFlow={deleteFlow}
      deleteConfirmation={deleteConfirmation}
      heroProfile={heroProfile}
      likesCount={likesCount}
      followerCount={followerCount}
      followingCount={followingCount}
      listsCount={listsCount}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
      avatarPreview={avatarPreview}
      bannerPreview={bannerPreview}
      heroDisplayName={heroDisplayName}
      isGeneralAccountDirty={isGeneralAccountDirty}
      isAnyMediaUploading={isAnyMediaUploading}
      mediaUploadFileName={activeMediaUpload?.fileName || ''}
      mediaUploadState={mediaUploadState}
      canUsePasswordSecurity={canUsePasswordSecurity}
      isPasswordLinked={isPasswordLinked}
      formRef={formRef}
      handleChange={handleChange}
      handleClearMedia={handleClearMedia}
      handleOpenMediaUpload={handleOpenMediaUpload}
      handleCancel={handleCancel}
      handleSignIn={handleSignIn}
      handleSave={handleSave}
      setActiveTab={setActiveTab}
      handleAccountSubmit={handleAccountSubmit}
      handleCompleteEmailChange={handleCompleteEmailChange}
      handleCompletePasswordChange={handleCompletePasswordChange}
      handleDeleteAccount={handleDeleteAccount}
      handleSetPassword={handleSetPassword}
      setEmailFlow={setEmailFlow}
      setPasswordFlow={setPasswordFlow}
      setDeleteFlow={setDeleteFlow}
    />
  );
}

const INPUT_BASE_CLASSES =
  'h-11 w-full border border-black/15 bg-primary px-3 text-sm text-black outline-none placeholder:text-black/50 focus:border-black rounded-xl';
const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y py-3`;
const BUTTON_BASE_CLASSES =
  'border border-black/15 bg-white px-3 py-2 text-black hover:bg-black/5 disabled:opacity-50 rounded-xl';
const BUTTON_FRAME_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2 px-4 text-[11px] font-bold tracking-widest uppercase disabled:cursor-not-allowed rounded-xl';
function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? DESTRUCTIVE_ACTION_TONE_CLASS : BUTTON_BASE_CLASSES,
        className,
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
        <div
          className={cn(
            `${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col border-t border-black/10`,
            className,
          )}
        >
          <AccountSectionHeading title={title} summaryLabel={summaryLabel} />
          <div className="p-6">
            {description ? <p className="text-sm leading-6 text-black/70">{description}</p> : null}
            <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}
function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold tracking-wide text-black/70 uppercase">
        {label}
      </span>
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
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-black/10 bg-black/5',
            previewClassName,
          )}
        >
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
function AccountEditView(props) {
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }
  if (!profile) {
    return (
      <>
        {editRegistry}
        <PageGradientShell>
          <main
            className="relative min-h-screen overflow-hidden"
            style={{
              paddingBottom: `calc(${resolvedNavHeight}px + 1rem)`,
            }}
          >
            <div
              className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 p-4`}
            >
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
      <PageGradientShell className="overflow-hidden">
        <AccountGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
          style={{
            paddingBottom: `calc(${resolvedNavHeight}px + 1rem)`,
          }}
        >
          <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
            <AccountSectionNav
              activeKey="overview"
              username={profile?.username || heroProfile?.username || null}
            />
          </AccountNavReveal>

          <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
            <AccountHeroReveal className="w-full">
              <AccountHero
                profile={heroProfile}
                likesCount={likesCount}
                followerCount={followerCount}
                followingCount={followingCount}
                listsCount={listsCount}
                watchedCount={watchedCount}
                watchlistCount={watchlistCount}
              />
            </AccountHeroReveal>

            <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">
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
                            'h-full w-5 bg-black',
                            form.isPrivate ? 'bg-info translate-x-5' : 'translate-x-0',
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
                        Email/password sign-in is not linked yet. Complete the set password flow
                        below to continue.
                      </div>
                    </SectionCard>
                  ) : null}

                  {canUsePasswordSecurity ? (
                    <SectionCard
                      title="Change Email"
                      summaryLabel={
                        currentAuthEmail && (
                          <span className="text-[10px] font-medium tracking-normal text-black/50 lowercase">
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
            </main>
          </div>
        </div>
      </PageGradientShell>
    </>
  );
}
