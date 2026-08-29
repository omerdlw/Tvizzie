'use client';

import AdaptiveImage from '@/ui/components/adaptive-image';
import { useNavigationActions } from '@/modules/nav';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import ProfileLayout from '@/domains/account/ui/layouts/account-layout';
import { createAccountBioSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-bio-surface';
import { createAccountEditSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-edit-surface';
import { AccountEditSkeleton, AccountSkeletonLayout } from '@/domains/account/ui/skeletons';
import { StatusState } from './account-edit-primitives';

export function AccountEditView(props) {
  const { openSurface } = useNavigationActions();
  const {
    currentAuthEmail,
    auth,
    isLoading,
    profile,
    isSaving,
    form,
    emailFlow,
    deleteFlow,
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
    isAnyMediaUploading,
    mediaUploadState,
    availableOAuthProviders,
    linkedOAuthProviders,
    handleDeletePasskey,
    handleLinkProvider,
    handleRegisterPasskey,
    handleRenamePasskey,
    handleSignOutOtherSessions,
    handleRevokeSession,
    handleEnrollMfa,
    handleUnenrollMfa,
    passkeyAction,
    passkeySupported,
    passkeys,
    passkeysLoading,
    linkingProvider,
    revokingSessions,
    sessionAction,
    sessions,
    sessionsLoading,
    mfaFactors,
    mfaLoading,
    mfaAction,
    formRef,
    handleChange,
    handleClearMedia,
    handleMediaUpload,
    handleOpenMediaUpload,
    handleAccountSubmit,
    handleCompleteEmailChange,
    handleDeleteAccount,
    handleUnlinkProvider,
    setEmailFlow,
    setDeleteFlow,
    setActiveTab,
    unlinkingProvider,
  } = props;

  if (!auth.isReady || isLoading) {
    return (
      <AccountSkeletonLayout activeTab="overview">
        <AccountEditSkeleton />
      </AccountSkeletonLayout>
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <AccountSkeletonLayout activeTab="overview">
        <AccountEditSkeleton />
      </AccountSkeletonLayout>
    );
  }
  if (!profile) {
    return (
      <>
        <main className="px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <StatusState
              title="Account data unavailable"
              description="We could not load your editable profile data right now."
            />
          </div>
        </main>
      </>
    );
  }

  const handleReadMore = () => {
    openSurface(
      createAccountBioSurfaceEntry({
        description: heroProfile?.description || '',
        followerCount,
        followingCount,
        profile: heroProfile,
        username: heroProfile?.username || profile?.username || 'About',
      }),
    );
  };

  // Common security props forwarded into every security surface
  const sharedSecurityProps = {
    currentAuthEmail,
    availableOAuthProviders,
    deleteFlow,
    emailFlow,
    handleCompleteEmailChange,
    handleDeleteAccount,
    handleDeletePasskey,
    handleLinkProvider,
    handleRegisterPasskey,
    handleRenamePasskey,
    handleSignOutOtherSessions,
    handleRevokeSession,
    handleEnrollMfa,
    handleUnenrollMfa,
    handleUnlinkProvider,
    linkedOAuthProviders,
    passkeyAction,
    passkeySupported,
    passkeys,
    passkeysLoading,
    linkingProvider,
    revokingSessions,
    sessionAction,
    sessions,
    sessionsLoading,
    mfaFactors,
    mfaLoading,
    mfaAction,
    setDeleteFlow,
    setEmailFlow,
    unlinkingProvider,
  };

  const sharedProfileProps = {
    avatarPreview,
    bannerPreview,
    form,
    formRef,
    handleAccountSubmit,
    handleChange,
    handleClearMedia,
    handleMediaUpload,
    handleOpenMediaUpload,
    heroDisplayName,
    isAnyMediaUploading,
    isSaving,
    mediaUploadState,
  };

  const handleSettingSelect = (setting) => {
    setActiveTab(setting.tab);
    const surfaceProps =
      setting.key === 'profile' || setting.key === 'avatar-banner'
        ? sharedProfileProps
        : sharedSecurityProps;
    openSurface(createAccountEditSurfaceEntry(setting.key, surfaceProps));
  };

  const settings = [
    {
      key: 'avatar-banner',
      title: 'Avatar & Banner',
      description: 'Profile avatar and header banner',
      icon: 'solar:gallery-bold',
      tab: 'general',
    },
    {
      key: 'profile',
      title: 'Profile info',
      description: 'Name, username, bio and privacy',
      icon: 'solar:user-circle-bold',
      tab: 'general',
    },
    {
      key: 'email',
      title: 'Email sign-in',
      description: currentAuthEmail || 'Update your sign-in email',
      icon: 'solar:letter-bold',
      tab: 'security',
    },
    {
      key: 'providers',
      title: 'Connected providers',
      description: `${linkedOAuthProviders.length} connected`,
      icon: 'solar:link-bold',
      tab: 'security',
    },
    {
      key: 'sessions',
      title: 'Active sessions',
      description: sessionsLoading ? 'Loading sessions' : `${sessions.length} active`,
      icon: 'solar:monitor-smartphone-bold',
      tab: 'security',
    },
    ...(passkeySupported
      ? [
          {
            key: 'passkeys',
            title: 'Passkeys',
            description: passkeysLoading ? 'Loading passkeys' : `${passkeys.length} connected`,
            icon: 'solar:key-bold',
            tab: 'security',
          },
        ]
      : []),
    {
      key: 'authenticator',
      title: 'Authenticator app',
      description: mfaLoading
        ? 'Loading authenticator status'
        : mfaFactors.filter((factor) => factor?.status === 'verified').length
          ? 'Enabled'
          : 'Not enabled',
      icon: 'solar:shield-check-bold',
      tab: 'security',
    },
    {
      key: 'delete',
      title: 'Delete account',
      description: 'Permanently remove your account',
      icon: 'solar:trash-bin-trash-bold',
      tab: 'security',
      tone: 'danger',
    },
  ];

  return (
    <ProfileLayout
      activeSection="overview"
      followerCount={followerCount}
      followingCount={followingCount}
      likesCount={likesCount}
      listsCount={listsCount}
      profile={heroProfile || profile}
      username={profile?.username || heroProfile?.username || null}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
      onReadMore={handleReadMore}
    >
      <div className="mx-auto w-full">
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {settings
              .filter((s) => s.tone !== 'danger')
              .map((setting) => (
                <Button
                  key={setting.key}
                  type="button"
                  onClick={() => handleSettingSelect(setting)}
                  className="flex w-full items-center gap-2.5 rounded-[20px] bg-white/5 p-2.5 text-left ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/10"
                >
                  <span className="center size-10 shrink-0 rounded-[10px] text-white/70">
                    <Icon icon={setting.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{setting.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/40">
                      {setting.description}
                    </span>
                  </span>
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    size={18}
                    className="shrink-0 text-white/40"
                  />
                </Button>
              ))}
            {settings
              .filter((s) => s.tone === 'danger')
              .map((setting) => (
                <Button
                  key={setting.key}
                  type="button"
                  onClick={() => handleSettingSelect(setting)}
                  className="flex w-full items-center gap-3.5 rounded-[20px] bg-error/5 p-2.5 text-left ring-1 ring-inset ring-error/5 transition-colors hover:bg-error/10"
                >
                  <span className="center size-10 shrink-0 text-error">
                    <Icon icon={setting.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{setting.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/40">
                      {setting.description}
                    </span>
                  </span>
                  <Icon icon="solar:alt-arrow-right-linear" size={18} className="shrink-0 text-error/40" />
                </Button>
              ))}
          </div>

          {/* Danger zone — full width */}

        </div>
      </div>
    </ProfileLayout>
  );
}
