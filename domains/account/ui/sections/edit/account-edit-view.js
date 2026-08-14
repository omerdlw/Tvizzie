'use client';

import { useNavHeight } from '@/modules/nav';
import { ACCOUNT_ROUTE_SHELL_CLASS, PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { AccountEditRegistry as Registry } from '@/app/(account)/registry';
import {
  AccountHeroReveal,
  AccountNavReveal,
  AccountSectionNav,
} from '@/domains/account/ui/layouts/account-layout';
import AccountGridFrame from '@/domains/account/ui/layouts/account-grid-frame';
import AccountHero from '@/domains/account/ui/sections/account-hero';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { Spinner } from '@/ui/feedback/spinner';
import { StatusState } from './account-edit-primitives';
import { AccountGeneralSettingsForm } from './account-general-settings-form';
import { AccountSecuritySettings } from './account-security-settings';
import { AccountMotionProvider } from '@/app/(account)/motion';

export function AccountEditView(props) {
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
    linkedOAuthProviders,
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
    handleUnlinkProvider,
    handleSetPassword,
    setEmailFlow,
    setPasswordFlow,
    setDeleteFlow,
    unlinkingProvider,
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
    <AccountMotionProvider routeKey={`account-edit-${activeTab}`}>
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
                <AccountGeneralSettingsForm
                  avatarPreview={avatarPreview}
                  bannerPreview={bannerPreview}
                  form={form}
                  formRef={formRef}
                  handleAccountSubmit={handleAccountSubmit}
                  handleChange={handleChange}
                  handleClearMedia={handleClearMedia}
                  handleOpenMediaUpload={handleOpenMediaUpload}
                  heroDisplayName={heroDisplayName}
                  isAnyMediaUploading={isAnyMediaUploading}
                  isSaving={isSaving}
                  mediaUploadState={mediaUploadState}
                />
              ) : (
                <AccountSecuritySettings
                  canUsePasswordSecurity={canUsePasswordSecurity}
                  currentAuthEmail={currentAuthEmail}
                  deleteFlow={deleteFlow}
                  emailFlow={emailFlow}
                  handleCompleteEmailChange={handleCompleteEmailChange}
                  handleCompletePasswordChange={handleCompletePasswordChange}
                  handleDeleteAccount={handleDeleteAccount}
                  handleUnlinkProvider={handleUnlinkProvider}
                  handleSetPassword={handleSetPassword}
                  isPasswordLinked={isPasswordLinked}
                  linkedOAuthProviders={linkedOAuthProviders}
                  passwordFlow={passwordFlow}
                  setDeleteFlow={setDeleteFlow}
                  setEmailFlow={setEmailFlow}
                  setPasswordFlow={setPasswordFlow}
                  unlinkingProvider={unlinkingProvider}
                />
              )}
            </main>
          </div>
        </div>
      </PageGradientShell>
    </AccountMotionProvider>
  );
}
