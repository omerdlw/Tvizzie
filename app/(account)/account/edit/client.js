'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth';
import { useAccountEditData, useAccountSecurityActions } from '@/features/account/hooks';
import { clearAccountFeedback, emitAccountFeedback } from '@/features/account/feedback';
import {
  INITIAL_DELETE_FLOW,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  getAvatarFallback,
  normalizeEmail,
  normalizeOptionalText,
  normalizeProviderIds,
} from '@/features/account/utils';
import { logDataError } from '@/core/utils/errors';
import { useAccount } from '@/core/modules/account';
import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useNavigationActions } from '@/core/modules/nav/context';
import { useToast } from '@/core/modules/notification/hooks';

import AccountEditView from './view';

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

  const {
    followerCount,
    followingCount,
    form,
    isLoading,
    likesCount,
    linkedProviderIdsOverride,
    listsCount,
    profile,
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

      emitAccountFeedback('account-update', 'success');
      toast.success('Account updated');
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
      canUsePasswordSecurity={canUsePasswordSecurity}
      isPasswordLinked={isPasswordLinked}
      formRef={formRef}
      handleChange={handleChange}
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
