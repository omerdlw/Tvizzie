'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  AUTH_ROUTES,
  buildAuthHref,
  getCurrentPathWithSearch,
} from '@/domains/auth/utils/routes';
import {
  normalizeOAuthProvider,
} from '@/domains/auth/utils/oauth';
import {
  uploadAccountMediaFile,
} from '@/domains/account/client/profile.client';
import {
  useAccountEditData,
} from '@/domains/account/hooks/account-edit-data.hooks';
import {
  useAccountSecurityActions,
} from '@/domains/account/hooks/security.hooks';
import {
  ACCOUNT_MEDIA_UPLOAD_CONFIG,
} from '@/domains/account/utils/constants';
import {
  INITIAL_DELETE_FLOW,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
} from '@/domains/account/utils/security';
import {
  clearAccountFeedback,
  emitAccountFeedback,
} from '@/domains/account/utils/feedback';
import {
  getAvatarFallback,
} from '@/domains/account/utils/avatar';
import {
  logDataError,
  normalizeEmail,
  normalizeOptionalText,
} from '@/domains/account/utils/validation';
import { useAccount } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useNavigationActions } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { createFileUploadSurfaceEntry } from '@/domains/shell/navigation/surfaces/file-upload-surface';

export function useAccountEditPageState({ initialSnapshot = null }) {
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
    auth?.capabilities?.providerIds ||
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
    );

  const canUsePasswordSecurity = isPasswordLinked;
  const linkedOAuthProviders = Array.from(
    new Set(linkedProviderIds.map(normalizeOAuthProvider).filter(Boolean)),
  );

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

      // 0ms Instant Client-Side Image Preview
      let localBlobUrl = null;
      try {
        localBlobUrl = URL.createObjectURL(file);
        setForm((prev) => ({
          ...prev,
          [field]: localBlobUrl,
        }));
      } catch {}

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
      router.push(
        nextProfile?.username ? `/account/${encodeURIComponent(nextProfile.username)}` : '/account',
      );
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
    handleUnlinkProvider,
    handleSetPassword,
    unlinkingProvider,
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

  return {
    activeTab,
    auth,
    avatarPreview,
    bannerPreview,
    canUsePasswordSecurity,
    currentAuthEmail,
    deleteConfirmation,
    deleteFlow,
    emailFlow,
    followerCount,
    followingCount,
    form,
    formRef,
    handleAccountSubmit,
    handleCancel,
    handleChange,
    handleClearMedia,
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleUnlinkProvider,
    handleOpenMediaUpload,
    handleSave,
    handleSetPassword,
    handleSignIn,
    heroDisplayName,
    heroProfile,
    isAnyMediaUploading,
    isGeneralAccountDirty,
    isLoading,
    isPasswordLinked,
    isSaving,
    likesCount,
    listsCount,
    linkedOAuthProviders,
    mediaUploadFileName: activeMediaUpload?.fileName || '',
    mediaUploadState,
    passwordFlow,
    profile,
    setActiveTab,
    setDeleteFlow,
    setEmailFlow,
    setPasswordFlow,
    unlinkingProvider,
    watchedCount,
    watchlistCount,
  };
}
