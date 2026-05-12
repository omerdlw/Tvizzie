import AccountEditGeneralSection from '@/features/account/settings/general-section';
import AccountEditSecuritySection from '@/features/account/settings/security-section';
import { EditGridShell, StatusState } from '@/features/account/settings/components';
import AccountRouteSkeleton from '@/features/account/skeletons';
import Registry from './registry';

export default function AccountEditView(props) {
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
  const profileHandle = profile?.username || heroProfile?.username || null;

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
        <EditGridShell
          heroProfile={heroProfile}
          likesCount={likesCount}
          followerCount={followerCount}
          followingCount={followingCount}
          listsCount={listsCount}
          watchedCount={watchedCount}
          watchlistCount={watchlistCount}
          profileHandle={profileHandle}
        >
          <StatusState
            title="Account data unavailable"
            description="We could not load your editable profile data right now."
          />
        </EditGridShell>
      </>
    );
  }

  return (
    <>
      {editRegistry}
      <EditGridShell
        heroProfile={heroProfile}
        likesCount={likesCount}
        followerCount={followerCount}
        followingCount={followingCount}
        listsCount={listsCount}
        watchedCount={watchedCount}
        watchlistCount={watchlistCount}
        profileHandle={profileHandle}
      >
        {activeTab === 'general' ? (
          <AccountEditGeneralSection
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
          <AccountEditSecuritySection
            canUsePasswordSecurity={canUsePasswordSecurity}
            currentAuthEmail={currentAuthEmail}
            deleteFlow={deleteFlow}
            emailFlow={emailFlow}
            handleCompleteEmailChange={handleCompleteEmailChange}
            handleCompletePasswordChange={handleCompletePasswordChange}
            handleDeleteAccount={handleDeleteAccount}
            handleSetPassword={handleSetPassword}
            isPasswordLinked={isPasswordLinked}
            passwordFlow={passwordFlow}
            setDeleteFlow={setDeleteFlow}
            setEmailFlow={setEmailFlow}
            setPasswordFlow={setPasswordFlow}
          />
        )}
      </EditGridShell>
    </>
  );
}
