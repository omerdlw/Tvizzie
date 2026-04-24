'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';
import { INITIAL_DELETE_FLOW, INITIAL_EMAIL_FLOW, INITIAL_PASSWORD_FLOW } from '@/features/account/security';
import { useAccountSecurityActions } from '@/features/account/hooks/security-actions';
import { useAccountEditData } from '@/features/account/hooks/edit-data';
import {
  clearAccountFeedback,
  emitAccountFeedback,
  getAvatarFallback,
  normalizeEmail,
  normalizeOptionalText,
  normalizeProviderIds,
} from '@/features/account/utils';
import { logDataError } from '@/core/utils';
import { uploadAccountMediaFile } from '@/core/services/account/account.service';
import { useAccount } from '@/core/modules/account';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useNavigationActions } from '@/core/modules/nav/context';
import FileUploadSurface from '@/core/modules/nav/surfaces/file-upload-surface';
import { useToast } from '@/core/modules/notification/hooks';

import AccountEditView from './view';

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

  const providerIdsFromAuth = auth?.user?.metadata?.providerIds;
  const normalizedProviderIds = normalizeProviderIds(providerIdsFromAuth);
  const linkedProviderIds = Array.isArray(linkedProviderIdsOverride)
    ? linkedProviderIdsOverride
    : normalizedProviderIds;

  const isPasswordLinked = auth?.capabilities?.passwordEnabled === true || linkedProviderIds.includes('password');
  const canUsePasswordSecurity =
    isPasswordLinked && typeof auth?.reauthenticate === 'function' && typeof auth?.updateProfile === 'function';

  const avatarPreview = useMemo(() => {
    const url = form.avatarUrl?.trim();
    if (url) return url;
    return getAvatarFallback(profile);
  }, [form.avatarUrl, profile]);

  const bannerPreview = useMemo(() => {
    return normalizeOptionalText(form.bannerUrl) || profile?.bannerUrl || '';
  }, [form.bannerUrl, profile?.bannerUrl]);

  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);
  const currentAuthEmail = normalizeEmail(profile?.email || auth?.user?.email || '');
  const heroProfile = useMemo(
    () => ({
      ...profile,
      avatarUrl: normalizeOptionalText(form.avatarUrl),
      bannerUrl: normalizeOptionalText(form.bannerUrl),
      description: normalizeOptionalText(form.description),
      displayName: normalizeOptionalText(form.displayName),
      username: normalizeOptionalText(form.username),
      isPrivate: Boolean(form.isPrivate),
    }),
    [form, profile]
  );
  const heroDisplayName = heroProfile?.displayName || heroProfile?.username || 'Account';
  const isGeneralAccountDirty = useMemo(() => {
    if (!profile) {
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

      const normalizedTarget = String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
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
    [setForm, toast]
  );

  const handleClearMedia = useCallback(
    (target) => {
      const normalizedTarget = String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';

      setForm((prev) => ({
        ...prev,
        [field]: '',
      }));
    },
    [setForm]
  );

  const handleSignIn = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
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

      const normalizedTarget = String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
      const selection = await openSurface(FileUploadSurface, {
        data: {
          ...ACCOUNT_MEDIA_UPLOAD_CONFIG[normalizedTarget],
          target: normalizedTarget,
        },
      });

      if (!selection?.success || !selection?.file) {
        return;
      }

      await handleMediaUpload(normalizedTarget, selection.file);
    },
    [handleMediaUpload, isAnyMediaUploading, isSaving, openSurface]
  );

  useEffect(() => {
    if (!auth.isReady || isLoading || auth.isAuthenticated) {
      return;
    }

    router.replace(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
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

  const { handleCompleteEmailChange, handleCompletePasswordChange, handleDeleteAccount, handleSetPassword } =
    useAccountSecurityActions({
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
