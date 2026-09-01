'use client';

import { motion } from 'motion/react';
import { useEffect } from 'react';

import { AccountProfileSettingsForm } from '@/domains/account/ui/sections/edit/account-profile-settings-form';
import { AccountEditSettings } from '@/domains/account/ui/sections/edit/account-edit-settings';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';
import { useSurfaceHeader } from '@/modules/nav';

const SETTING_META = {
  'avatar-banner': {
    icon: 'solar:gallery-bold',
    title: 'Avatar & Banner',
    description: 'Profile avatar and header banner',
  },
  profile: {
    icon: 'solar:user-circle-bold',
    title: 'Profile info',
    description: 'Name, username, bio and privacy',
  },
  email: {
    icon: 'solar:letter-bold',
    title: 'Email sign-in',
    description: 'Update your sign-in email',
  },
  providers: {
    icon: 'solar:link-bold',
    title: 'Connected providers',
    description: 'Manage OAuth connections',
  },
  sessions: {
    icon: 'solar:monitor-smartphone-bold',
    title: 'Active sessions',
    description: 'View and revoke active sessions',
  },
  passkeys: {
    icon: 'solar:key-bold',
    title: 'Passkeys',
    description: 'Manage hardware passkeys',
  },
  authenticator: {
    icon: 'solar:shield-check-bold',
    title: 'Authenticator app',
    description: 'Two-factor authentication via TOTP',
  },
  delete: {
    icon: 'solar:trash-bin-trash-bold',
    title: 'Delete account',
    description: 'Permanently remove your account',
  },
};

export function createAccountEditSurfaceEntry(settingKey, props = {}, config = {}) {
  const meta =
    SETTING_META[settingKey] || { icon: 'solar:settings-bold', title: 'Settings', description: '' };

  const isWide = settingKey === 'profile' || settingKey === 'avatar-banner';

  return {
    component: AccountEditSurface,
    icon: meta.icon,
    title: meta.title,
    description: meta.description,
    expandHorizontal: isWide,
    width: isWide ? 640 : undefined,
    props: { settingKey, ...props },
    ...config,
  };
}

function ProfileSurface({
  close,
  settingKey,
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
}) {
  const setHeader = useSurfaceHeader();
  const meta = SETTING_META[settingKey] || SETTING_META.profile;

  useEffect(() => {
    setHeader?.({
      icon: meta.icon,
      title: meta.title,
      description: meta.description,
      headerAction: null,
      trailing: null,
    });
  }, [setHeader, meta]);

  async function handleSubmitAndClose(event) {
    await handleAccountSubmit(event);
    close?.();
  }

  const formId = `account-edit-${settingKey}-form`;

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex flex-col gap-2.5"
    >
      <AccountProfileSettingsForm
        avatarPreview={avatarPreview}
        bannerPreview={bannerPreview}
        form={form}
        formRef={formRef}
        formId={formId}
        handleAccountSubmit={handleSubmitAndClose}
        handleChange={handleChange}
        handleClearMedia={handleClearMedia}
        handleMediaUpload={handleMediaUpload}
        handleOpenMediaUpload={handleOpenMediaUpload}
        heroDisplayName={heroDisplayName}
        isAnyMediaUploading={isAnyMediaUploading}
        isSaving={isSaving}
        mediaUploadState={mediaUploadState}
        variant="surface"
        section={settingKey}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Security sub-surface
// ---------------------------------------------------------------------------

function SecuritySurface({ settingKey, close, ...securityProps }) {
  const setHeader = useSurfaceHeader();

  useEffect(() => {
    const meta = SETTING_META[settingKey];
    if (meta) {
      setHeader?.({
        icon: meta.icon,
        title: meta.title,
        description: meta.description,
        headerAction: null,
        trailing: null,
      });
    }
  }, [setHeader, settingKey]);

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex flex-col gap-2.5"
    >
      <AccountEditSettings section={settingKey} variant="surface" close={close} {...securityProps} />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Root surface component — dispatches to the right sub-surface
// ---------------------------------------------------------------------------

export default function AccountEditSurface({ close, settingKey, ...rest }) {
  if (settingKey === 'profile' || settingKey === 'avatar-banner') {
    return <ProfileSurface close={close} settingKey={settingKey} {...rest} />;
  }
  return <SecuritySurface close={close} settingKey={settingKey} {...rest} />;
}
