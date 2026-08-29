'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getCurrentPathWithSearch } from '@/domains/auth/utils/routes';
import { OAUTH_PROVIDER_KEYS, normalizeOAuthProvider } from '@/domains/auth/utils/oauth';
import { useAccountEditData } from '@/domains/account/hooks/account-edit-data';
import { useAccountMediaState } from '@/domains/account/hooks/account-media-state';
import { useAccountSecurityData } from '@/domains/account/hooks/account-security-data';
import { useAccountSecurityActions } from '@/domains/account/hooks/security';
import { INITIAL_DELETE_FLOW, INITIAL_EMAIL_FLOW } from '@/domains/account/utils/security';
import { clearAccountFeedback, emitAccountFeedback } from '@/domains/account/utils/feedback';
import { getAvatarFallback } from '@/domains/account/utils/avatar';
import {
  logDataError,
  normalizeEmail,
  normalizeOptionalText,
} from '@/domains/account/utils/validation';
import { useAccount } from '@/modules/account';
import { useAuth } from '@/modules/auth';
import { usePasskeySupport } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useNavigationActions } from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';

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
  const hasPromptedSignInRef = useRef(false);
  const [activeTab, setActiveTab] = useState('general');
  const [activeSetting, setActiveSetting] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [emailFlow, setEmailFlow] = useState(INITIAL_EMAIL_FLOW);
  const [deleteFlow, setDeleteFlow] = useState(INITIAL_DELETE_FLOW);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [passkeyAction, setPasskeyAction] = useState(null);

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
  const passkeySupported = usePasskeySupport();
  const {
    mfaFactors,
    mfaLoading,
    passkeys,
    passkeysLoading,
    sessions,
    sessionsLoading,
    setMfaFactors,
    setPasskeys,
    setSessions,
  } = useAccountSecurityData({ activeTab, auth, passkeySupported, toast });
  const {
    handleClearMedia,
    handleMediaUpload,
    handleOpenMediaUpload,
    isAnyMediaUploading,
    mediaUploadFileName,
    mediaUploadState,
  } = useAccountMediaState({
    isSaving,
    openSurface,
    setForm,
    toast,
  });
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
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignIn = useCallback(() => {
    void openSurface(createSignInSurfaceEntry({ next: currentPath }));
  }, [currentPath, openSurface]);

  const handleAccountSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.();
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
    },
    [
      applyProfile,
      auth,
      form.avatarUrl,
      form.bannerUrl,
      form.description,
      form.displayName,
      form.isPrivate,
      form.username,
      isAnyMediaUploading,
      isSaving,
      profile,
      router,
      toast,
    ],
  );

  const handleSave = useCallback(() => {
    void handleAccountSubmit();
  }, [handleAccountSubmit]);

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

  useEffect(() => {
    if (!auth.isReady || isLoading || auth.isAuthenticated) {
      return;
    }

    if (hasPromptedSignInRef.current) {
      return;
    }

    hasPromptedSignInRef.current = true;
    void openSurface(createSignInSurfaceEntry({ next: currentPath }));
  }, [auth.isAuthenticated, auth.isReady, currentPath, isLoading, openSurface]);

  const {
    handleCompleteEmailChange,
    handleDeleteAccount,
    handleDeletePasskey,
    handleRegisterPasskey,
    handleRenamePasskey,
    handleLinkProvider,
    handleSignOutOtherSessions,
    handleRevokeSession,
    handleEnrollMfa,
    handleUnenrollMfa,
    handleUnlinkProvider,
    linkingProvider,
    mfaAction,
    revokingSessions,
    sessionAction,
    unlinkingProvider,
  } = useAccountSecurityActions({
    auth,
    currentAuthEmail,
    deleteFlow,
    emailFlow,
    isSaving,
    openModal,
    openSurface,
    passkeySupported,
    setPasskeys,
    passkeys,
    setSessions,
    setMfaFactors,
    setPasskeyAction,
    setDeleteConfirmation,
    setDeleteFlow,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    toast,
  });

  return {
    activeSetting,
    activeTab,
    auth,
    avatarPreview,
    bannerPreview,
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
    handleDeleteAccount,
    handleDeletePasskey,
    handleRegisterPasskey,
    handleRenamePasskey,
    handleLinkProvider,
    handleSignOutOtherSessions,
    handleRevokeSession,
    handleEnrollMfa,
    handleUnenrollMfa,
    handleUnlinkProvider,
    handleMediaUpload,
    handleOpenMediaUpload,
    handleSave,
    handleSignIn,
    heroDisplayName,
    heroProfile,
    isAnyMediaUploading,
    isGeneralAccountDirty,
    isLoading,
    isSaving,
    likesCount,
    listsCount,
    linkedOAuthProviders,
    availableOAuthProviders: OAUTH_PROVIDER_KEYS.filter(
      (provider) => !linkedOAuthProviders.includes(provider),
    ),
    linkingProvider,
    mfaAction,
    passkeyAction,
    passkeySupported,
    passkeys,
    passkeysLoading,
    sessions,
    sessionsLoading,
    mfaFactors,
    mfaLoading,
    revokingSessions,
    sessionAction,
    mediaUploadFileName,
    mediaUploadState,
    profile,
    setActiveTab,
    setActiveSetting,
    setDeleteFlow,
    setEmailFlow,
    setPasskeyAction,
    unlinkingProvider,
    watchedCount,
    watchlistCount,
  };
}
