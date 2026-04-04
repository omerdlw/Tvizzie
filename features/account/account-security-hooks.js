'use client';

import {
  AUTH_PURPOSE,
  EMAIL_PATTERN,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  deleteAccountRequest,
  normalizeEmail,
  normalizeProviderDescriptors,
  resolveSecurityErrorMessage,
  validatePassword,
} from './utils';
import { clearAccountFeedback, emitAccountFeedback } from './feedback';
import { AUTH_ROUTES, buildAuthHref, requestVerificationCode } from '@/features/auth';
import { logAuthAuditEvent } from '@/core/auth/clients/audit.client';
import { useAccountClient } from '@/core/modules/account';
import { useAuthSessionReady } from '@/core/modules/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { openAuthVerificationPrompt, showAccountErrorToast } from './account-hook-utils';

export function useAccountCredentialActions({
  auth,
  canUsePasswordSecurity,
  currentAuthEmail,
  emailFlow,
  openModal,
  openSurface,
  passwordFlow,
  setEmailFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  setPasswordFlow,
  toast,
}) {
  const reauthenticateWithPassword = useCallback(
    async (password) => {
      if (typeof auth?.reauthenticate !== 'function') {
        throw new Error('Reauthentication is not supported by this auth adapter');
      }

      return auth.reauthenticate({
        password: String(password || ''),
      });
    },
    [auth]
  );

  const openVerificationModal = useCallback(
    async ({
      autoSendOnOpen = true,
      purpose,
      email,
      initialChallenge = null,
      title = 'Email verification',
      description = 'Code verification',
    }) => {
      return openAuthVerificationPrompt({
        autoSendOnOpen,
        description,
        email,
        initialChallenge,
        openModal,
        openSurface,
        purpose,
        title,
        toast,
      });
    },
    [openModal, openSurface, toast]
  );

  const handleCompleteEmailChange = useCallback(async () => {
    if (emailFlow.isSubmitting) {
      return;
    }
    if (!canUsePasswordSecurity || !auth.user?.id) {
      toast.error('Email/password sign-in must be enabled for this action');
      return;
    }

    const nextEmail = normalizeEmail(emailFlow.newEmail);
    const currentPassword = String(emailFlow.currentPassword || '');

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      toast.error('Please provide a valid email address');
      return;
    }

    if (nextEmail === currentAuthEmail) {
      toast.error('New email must be different from current email');
      return;
    }

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(currentPassword);
      const initialChallenge = await requestVerificationCode({
        email: nextEmail,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
      });

      const verification = await openVerificationModal({
        autoSendOnOpen: false,
        description: 'Verify your new email',
        email: nextEmail,
        initialChallenge,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
        title: 'Email verification',
      });

      if (!verification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('email-change', 'start');

      const result = await completeEmailChangeRequest({
        newEmail: nextEmail,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'email-change',
        });
      }

      if (typeof setLinkedProviderIdsOverride === 'function') {
        setLinkedProviderIdsOverride(null);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(null);
      }

      logAuthAuditEvent({
        email: nextEmail,
        eventType: 'email-change',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user.id,
      });

      emitAccountFeedback('email-change', 'success');
      setEmailFlow(INITIAL_EMAIL_FLOW);
      toast.success('Email updated successfully. Please sign in again');

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: nextEmail,
          })
        );
      }
    } catch (error) {
      setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('email-change');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'email-change',
          message: error?.message || 'Email update failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Email could not be updated'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    emailFlow,
    openVerificationModal,
    reauthenticateWithPassword,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    toast,
  ]);

  const handleCompletePasswordChange = useCallback(async () => {
    if (passwordFlow.isSubmitting) {
      return;
    }
    if (!canUsePasswordSecurity) {
      toast.error('Email/password sign-in must be enabled for this action');
      return;
    }

    const currentPassword = String(passwordFlow.currentPassword || '');
    let newPassword = '';
    const confirmPassword = String(passwordFlow.confirmPassword || '');

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    try {
      newPassword = validatePassword(passwordFlow.newPassword);
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Password does not meet requirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await reauthenticateWithPassword(currentPassword);

      const verification = await openVerificationModal({
        description: 'Verify your current email',
        email: currentAuthEmail,
        purpose: AUTH_PURPOSE.PASSWORD_CHANGE,
        title: 'Password verification',
      });

      if (!verification?.success) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('password-change', 'start');

      const result = await completePasswordChangeRequest({
        currentPassword,
        newPassword,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'password-change',
        });
      }

      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'password-change',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-change', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      toast.success('Password updated successfully. Please sign in again');

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: currentAuthEmail || '',
          })
        );
      }
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-change');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'password-change',
          message: error?.message || 'Password update failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Password could not be updated'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    openVerificationModal,
    passwordFlow,
    reauthenticateWithPassword,
    setPasswordFlow,
    toast,
  ]);

  const handleSetPassword = useCallback(async () => {
    if (passwordFlow.isSubmitting) {
      return;
    }

    if (canUsePasswordSecurity) {
      toast.error('Email/password sign-in is already linked to this account');
      return;
    }

    if (!auth.user?.id) {
      toast.error('Authentication session is required');
      return;
    }

    let newPassword = '';
    const confirmPassword = String(passwordFlow.confirmPassword || '');

    try {
      newPassword = validatePassword(passwordFlow.newPassword);
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Password does not meet requirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setPasswordFlow((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const verification = await openVerificationModal({
        description: 'Verify your current email before adding a password',
        email: currentAuthEmail,
        purpose: AUTH_PURPOSE.PASSWORD_SET,
        title: 'Set password verification',
      });

      if (!verification?.success) {
        setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('password-set', 'start');

      const result = await completePasswordSetRequest({
        newPassword,
      });

      if (result?.nextAction === 'signed_out') {
        await auth.signOut({
          reason: 'password-set',
        });
      }

      if (typeof setLinkedProviderIdsOverride === 'function') {
        setLinkedProviderIdsOverride(null);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(null);
      }

      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'password-set',
        metadata: {
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'success',
        userId: auth.user?.id || null,
      });

      emitAccountFeedback('password-set', 'success');
      setPasswordFlow(INITIAL_PASSWORD_FLOW);
      toast.success('Password added successfully. Please sign in again');

      if (typeof window !== 'undefined') {
        window.location.replace(
          buildAuthHref(AUTH_ROUTES.SIGN_IN, {
            email: currentAuthEmail || '',
          })
        );
      }
    } catch (error) {
      setPasswordFlow((prev) => ({ ...prev, isSubmitting: false }));
      clearAccountFeedback('password-set');
      logAuthAuditEvent({
        email: currentAuthEmail || null,
        eventType: 'failed-attempt',
        metadata: {
          action: 'password-set',
          message: error?.message || 'Password setup failed',
          source: 'app/account/edit',
        },
        provider: 'password',
        status: 'failure',
        userId: auth.user?.id || null,
      });
      toast.error(resolveSecurityErrorMessage(error, 'Password could not be set'));
    }
  }, [
    auth,
    canUsePasswordSecurity,
    currentAuthEmail,
    openVerificationModal,
    passwordFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    setPasswordFlow,
    toast,
  ]);

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleSetPassword,
    reauthenticateWithPassword,
  };
}

export function useAccountDeleteAction({
  auth,
  deleteFlow,
  isPasswordLinked,
  reauthenticateWithPassword,
  currentAuthEmail,
  openModal,
  openSurface,
  setDeleteConfirmation,
  setDeleteFlow,
  toast,
}) {
  const router = useRouter();
  const deleteRequestLockRef = useRef(false);

  const openVerificationModal = useCallback(
    async ({ purpose, email, title, description }) => {
      return openAuthVerificationPrompt({
        description,
        email,
        openModal,
        openSurface,
        purpose,
        title,
        toast,
      });
    },
    [openModal, openSurface, toast]
  );

  const handleDeleteAccount = useCallback(async () => {
    if (deleteFlow.isSubmitting || deleteRequestLockRef.current) {
      return;
    }

    const currentPassword = String(deleteFlow.currentPassword || '');
    const confirmText = String(deleteFlow.confirmText || '').trim();

    if (isPasswordLinked && !currentPassword) {
      toast.error('Current password is required');
      return;
    }

    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion');
      return;
    }

    setDeleteConfirmation({
      cancelText: 'Cancel',
      confirmText: 'Delete Account',
      description: 'This action permanently deletes your account and signs you out',
      icon: 'solar:danger-triangle-bold',
      isDestructive: true,
      onCancel: () => setDeleteConfirmation(null),
      onConfirm: async () => {
        if (deleteRequestLockRef.current) {
          return;
        }

        deleteRequestLockRef.current = true;
        setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }));

        try {
          if (isPasswordLinked) {
            await reauthenticateWithPassword(currentPassword);
          }

          const verification = await openVerificationModal({
            description: 'Verify your current email before deletion',
            email: currentAuthEmail,
            purpose: AUTH_PURPOSE.ACCOUNT_DELETE,
            title: 'Delete account verification',
          });

          if (!verification?.success) {
            setDeleteConfirmation(null);
            setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
            return;
          }

          emitAccountFeedback('account-delete', 'start');

          const result = await deleteAccountRequest({
            currentPassword: isPasswordLinked ? currentPassword : '',
          });

          setDeleteConfirmation(null);

          if (result?.nextAction === 'signed_out') {
            await auth.signOut({
              reason: 'delete-account',
            });
          }

          emitAccountFeedback('account-delete', 'success');
          toast.success('Account deleted');
          router.replace('/');
        } catch (error) {
          clearAccountFeedback('account-delete');
          setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
          toast.error(resolveSecurityErrorMessage(error, 'Account could not be deleted'));
          throw error;
        } finally {
          deleteRequestLockRef.current = false;
        }
      },
      title: 'Delete Account?',
    });
  }, [
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openVerificationModal,
    reauthenticateWithPassword,
    router,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  ]);

  return { handleDeleteAccount };
}

export function useAccountGoogleLinking({
  auth,
  isSaving,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  supportsGoogleLinking,
  toast,
}) {
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const updateLinkedProvidersFromSession = useCallback(
    (session) => {
      const providerIds =
        session?.metadata?.providerIds ||
        session?.user?.metadata?.providerIds ||
        auth?.user?.metadata?.providerIds ||
        [];
      const providerDescriptors = normalizeProviderDescriptors(
        session?.metadata?.providerDescriptors ||
          session?.user?.metadata?.providerDescriptors ||
          auth?.user?.metadata?.providerDescriptors ||
          []
      );

      if (Array.isArray(providerIds)) {
        setLinkedProviderIdsOverride(providerIds);
      }

      if (typeof setLinkedProviderDescriptorsOverride === 'function') {
        setLinkedProviderDescriptorsOverride(providerDescriptors);
      }
    },
    [
      auth?.user?.metadata?.providerDescriptors,
      auth?.user?.metadata?.providerIds,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
    ]
  );

  const handleLinkGoogle = useCallback(async () => {
    if (isLinkingGoogle || isSaving || !supportsGoogleLinking) {
      return;
    }

    setIsLinkingGoogle(true);
    try {
      emitAccountFeedback('google-link', 'start');
      const session = await auth.linkProvider({
        googleAuthIntent: 'link',
        provider: 'google',
      });
      updateLinkedProvidersFromSession(session);
      emitAccountFeedback('google-link', 'success');
      toast.success('Google account linked successfully');
    } catch (error) {
      clearAccountFeedback('google-link');
      try {
        if (typeof auth.refreshSession === 'function') {
          const refreshedSession = await auth.refreshSession();
          updateLinkedProvidersFromSession(refreshedSession);
        } else {
          setLinkedProviderIdsOverride(null);
        }
      } catch {
        if (typeof setLinkedProviderDescriptorsOverride === 'function') {
          setLinkedProviderDescriptorsOverride(null);
        }
        setLinkedProviderIdsOverride(null);
      }
      toast.error(resolveSecurityErrorMessage(error, 'Google account could not be linked'));
    } finally {
      setIsLinkingGoogle(false);
    }
  }, [
    auth,
    isLinkingGoogle,
    isSaving,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    supportsGoogleLinking,
    toast,
    updateLinkedProvidersFromSession,
  ]);

  return {
    handleLinkGoogle,
    isLinkingGoogle,
  };
}

export function useAccountSecurityActions({
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
  supportsGoogleLinking,
  toast,
}) {
  const { handleCompleteEmailChange, handleCompletePasswordChange, handleSetPassword, reauthenticateWithPassword } =
    useAccountCredentialActions({
      auth,
      canUsePasswordSecurity,
      currentAuthEmail,
      emailFlow,
      openModal,
      openSurface,
      passwordFlow,
      setEmailFlow,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
      setPasswordFlow,
      toast,
    });

  const { handleDeleteAccount } = useAccountDeleteAction({
    auth,
    currentAuthEmail,
    deleteFlow,
    isPasswordLinked,
    openModal,
    openSurface,
    reauthenticateWithPassword,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  });

  const { handleLinkGoogle, isLinkingGoogle } = useAccountGoogleLinking({
    auth,
    isSaving,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    supportsGoogleLinking,
    toast,
  });

  return {
    handleCompleteEmailChange,
    handleCompletePasswordChange,
    handleDeleteAccount,
    handleLinkGoogle,
    handleSetPassword,
    isLinkingGoogle,
  };
}

function normalizeEditableCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeEditableAccountCounts(snapshot = null) {
  const counts = snapshot?.counts && typeof snapshot.counts === 'object' ? snapshot.counts : {};

  return {
    followers: normalizeEditableCount(counts.followers),
    following: normalizeEditableCount(counts.following),
    likes: normalizeEditableCount(counts.likes),
    lists: normalizeEditableCount(counts.lists),
    watchlist: normalizeEditableCount(counts.watchlist),
  };
}

export function useAccountEditData({ auth, initialSnapshot = null, toast }) {
  const accountClient = useAccountClient();
  const isAuthSessionReady = useAuthSessionReady(auth.isAuthenticated ? auth.user?.id || null : null);
  const initialProfile = initialSnapshot?.profile || null;
  const initialCounts = normalizeEditableAccountCounts(initialSnapshot);
  const [profile, setProfile] = useState(initialProfile);
  const [likesCount, setLikesCount] = useState(initialCounts.likes);
  const [watchedCount, setWatchedCount] = useState(Number(initialProfile?.watchedCount || 0));
  const [watchlistCount, setWatchlistCount] = useState(initialCounts.watchlist);
  const [listsCount, setListsCount] = useState(initialCounts.lists);
  const [followerCount, setFollowerCount] = useState(initialCounts.followers);
  const [followingCount, setFollowingCount] = useState(initialCounts.following);
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const [form, setForm] = useState({
    avatarUrl: initialProfile?.avatarUrl || '',
    bannerUrl: initialProfile?.bannerUrl || '',
    description: initialProfile?.description || '',
    displayName: initialProfile?.displayName || '',
    isPrivate: initialProfile?.isPrivate === true,
    username: initialProfile?.username || '',
  });
  const [linkedProviderDescriptorsOverride, setLinkedProviderDescriptorsOverride] = useState(null);
  const [linkedProviderIdsOverride, setLinkedProviderIdsOverride] = useState(null);

  const applySnapshot = useCallback((snapshot) => {
    const nextProfile = snapshot?.profile || null;
    const nextCounts = normalizeEditableAccountCounts(snapshot);

    setProfile(nextProfile);
    setLikesCount(nextCounts.likes);
    setWatchedCount(Number(nextProfile?.watchedCount || 0));
    setWatchlistCount(nextCounts.watchlist);
    setListsCount(nextCounts.lists);
    setFollowerCount(nextCounts.followers);
    setFollowingCount(nextCounts.following);
    setForm({
      avatarUrl: nextProfile?.avatarUrl || '',
      bannerUrl: nextProfile?.bannerUrl || '',
      description: nextProfile?.description || '',
      displayName: nextProfile?.displayName || '',
      isPrivate: nextProfile?.isPrivate === true,
      username: nextProfile?.username || '',
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!auth.isReady) {
      return undefined;
    }

    if (auth.isAuthenticated && auth.user?.id && !isAuthSessionReady) {
      setIsLoading(!initialProfile);
      return undefined;
    }

    if (!auth.isAuthenticated || !auth.user?.id) {
      setProfile(null);
      setLikesCount(0);
      setWatchedCount(0);
      setWatchlistCount(0);
      setListsCount(0);
      setFollowerCount(0);
      setFollowingCount(0);
      setIsLoading(false);
      setLinkedProviderDescriptorsOverride(null);
      setLinkedProviderIdsOverride(null);
      return undefined;
    }

    const canUseInitialSnapshot = initialSnapshot?.profile?.id && initialSnapshot.profile.id === auth.user.id;

    if (canUseInitialSnapshot) {
      applySnapshot(initialSnapshot);
      return undefined;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);

      try {
        const nextProfile = await accountClient.getAccount(auth.user.id);

        if (ignore) {
          return;
        }

        setProfile(nextProfile);
        setWatchedCount(Number(nextProfile?.watchedCount || 0));
        setForm((prev) => ({
          ...prev,
          avatarUrl: nextProfile?.avatarUrl || '',
          bannerUrl: nextProfile?.bannerUrl || '',
          description: nextProfile?.description || '',
          displayName: nextProfile?.displayName || '',
          isPrivate: nextProfile?.isPrivate === true,
          username: nextProfile?.username || '',
        }));
      } catch (error) {
        if (!ignore) {
          setProfile(null);
          setWatchedCount(0);
          showAccountErrorToast(toast, error, 'Profile could not be loaded');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [
    accountClient,
    applySnapshot,
    auth.isAuthenticated,
    auth.isReady,
    auth.user?.id,
    initialProfile,
    initialSnapshot,
    isAuthSessionReady,
    toast,
  ]);

  useEffect(() => {
    setLinkedProviderIdsOverride(null);
  }, [auth.user?.id]);

  return {
    followerCount,
    followingCount,
    form,
    isLoading,
    likesCount,
    linkedProviderDescriptorsOverride,
    linkedProviderIdsOverride,
    listsCount,
    profile,
    setForm,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    watchedCount,
    watchlistCount,
  };
}
