'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUTH_PURPOSE,
  INITIAL_EMAIL_FLOW,
  completeEmailChangeRequest,
  deleteAccountRequest,
  resolveSecurityErrorMessage,
} from '@/domains/account/utils/security';
import { clearAccountFeedback, emitAccountFeedback } from '@/domains/account/utils/feedback';
import { normalizeEmail } from '@/domains/account/utils/validation';
import {
  revokeAuthSessionRequest,
  sendSecurityEventRequest,
  signOutOtherSessionsRequest,
} from '@/domains/auth/client/requests';
import { AuthVerificationSurface } from '@/domains/shell/navigation/surfaces/verification-surface';
import { createMfaSetupSurfaceEntry } from '@/domains/shell/navigation/surfaces/mfa-setup-surface';
import { AUTH_ROUTES, buildAuthHref } from '@/domains/auth/utils/routes';
import { getOAuthProviderLabel, normalizeOAuthProvider } from '@/domains/auth/utils/oauth';

function resolveLinkedProviderIds(session) {
  const providerIds =
    session?.capabilities?.providerIds ||
    session?.user?.metadata?.authCapabilities?.providerIds ||
    session?.user?.metadata?.providerIds ||
    session?.user?.providerIds ||
    [];

  return Array.from(
    new Set(
      (Array.isArray(providerIds) ? providerIds : [])
        .map((provider) =>
          String(provider || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );
}

export async function logCredentialAuditSuccess(event, metadata = {}) {
  try {
    const { logAuditServer } = await import('@/domains/auth/server/actions/audit-log');
    await logAuditServer({ event, metadata });
  } catch {}
}

export async function logCredentialAuditFailure(event, error) {
  try {
    const { logAuditServer } = await import('@/domains/auth/server/actions/audit-log');
    await logAuditServer({ event, metadata: { error: error?.message || 'Action failed' } });
  } catch {}
}

export async function signOutIfRequested(auth, nextAction, { email, router } = {}) {
  if (nextAction !== 'signed_out' || typeof auth?.signOut !== 'function') return;
  await auth.signOut({ reason: 'security-credential-update', redirect: false }).catch(() => {});
  router?.replace?.(buildAuthHref(AUTH_ROUTES.SIGN_IN, { email }));
}

export function redirectToSignInWithEmail(router, email) {
  if (!router || typeof router.push !== 'function') return;
  router.push(buildAuthHref(AUTH_ROUTES.SIGN_IN, { email }));
}

export function validateEmailChangeInput({ currentEmail, newEmail }) {
  if (!newEmail || !newEmail.includes('@')) return 'Valid new email address is required';
  if (currentEmail && newEmail.toLowerCase() === currentEmail.toLowerCase())
    return 'New email must be different from current email';
  return null;
}

export async function openAccountVerificationPrompt({
  description,
  email,
  openModal,
  openSurface,
  purpose,
  title,
  toast,
}) {
  const verificationEmail = normalizeEmail(email);

  try {
    const config = {
      header: { description, title },
      data: { email: verificationEmail, purpose },
    };
    if (typeof openSurface === 'function') return openSurface(AuthVerificationSurface, config);
    if (typeof openModal === 'function')
      return openModal('AUTH_VERIFICATION_MODAL', 'bottom', config);
    return { error: new Error('Verification prompt is unavailable'), success: false };
  } catch (error) {
    toast?.error?.(error?.message || 'Verification prompt is unavailable');
    return { error, errorHandled: true, success: false };
  }
}

export function useAccountCredentialActions({
  auth,
  currentAuthEmail,
  emailFlow,
  openModal,
  openSurface,
  setEmailFlow,
  toast,
}) {
  const router = useRouter();
  const reauthenticateWithEmailOtp = useCallback(async () => {
    if (typeof auth?.reauthenticate !== 'function') {
      throw new Error('Reauthentication is not supported by this auth adapter');
    }
    return auth.reauthenticate({ verification: true });
  }, [auth]);

  const handleUpdateEmail = useCallback(async () => {
    if (emailFlow.isSubmitting) return;

    const newEmail = normalizeEmail(emailFlow.newEmail);

    const validationError = validateEmailChangeInput({
      currentEmail: currentAuthEmail,
      newEmail,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setEmailFlow((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const currentVerification = await openAccountVerificationPrompt({
        description: 'Verify your current email before changing it',
        email: currentAuthEmail,
        openModal,
        openSurface,
        purpose: AUTH_PURPOSE.ACCOUNT_REAUTH,
        title: 'Current email verification',
        toast,
      });
      if (!currentVerification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }
      await reauthenticateWithEmailOtp();

      const verification = await openAccountVerificationPrompt({
        description: 'Verify your new email address to complete change',
        email: newEmail,
        openModal,
        openSurface,
        purpose: AUTH_PURPOSE.EMAIL_CHANGE,
        title: 'New email verification',
        toast,
      });

      if (!verification?.success) {
        setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
        return;
      }

      emitAccountFeedback('email-update', 'start');

      const result = await completeEmailChangeRequest({
        newEmail,
      });
      setEmailFlow(INITIAL_EMAIL_FLOW);
      toast.success('Email update completed successfully');
      await logCredentialAuditSuccess('email_change', { newEmail, userId: auth?.user?.id });

      await signOutIfRequested(auth, result?.nextAction, {
        email: newEmail,
        router,
      });
    } catch (error) {
      setEmailFlow((prev) => ({ ...prev, isSubmitting: false }));
      const errorMessage = resolveSecurityErrorMessage(error, 'Email update failed');
      toast.error(errorMessage);
      await logCredentialAuditFailure('email_change', error);
    } finally {
      clearAccountFeedback('email-update');
    }
  }, [
    auth,
    currentAuthEmail,
    emailFlow,
    openModal,
    openSurface,
    reauthenticateWithEmailOtp,
    router,
    setEmailFlow,
    toast,
  ]);

  const handleCompleteEmailChange = useCallback(() => handleUpdateEmail(), [handleUpdateEmail]);

  return {
    handleCompleteEmailChange,
    handleUpdateEmail,
    reauthenticateWithEmailOtp,
  };
}

export function useAccountDeleteAction({
  auth,
  deleteFlow,
  currentAuthEmail,
  openModal,
  openSurface,
  setDeleteConfirmation,
  setDeleteFlow,
  toast,
}) {
  const router = useRouter();
  const deleteRequestLockRef = useRef(false);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteFlow.isSubmitting || deleteRequestLockRef.current) return;

    const confirmText = String(deleteFlow.confirmText || '').trim();

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
      onCancel: () => {
        setDeleteConfirmation(null);
      },
      onConfirm: async () => {
        if (deleteRequestLockRef.current) return;
        deleteRequestLockRef.current = true;
        setDeleteFlow((prev) => ({ ...prev, isSubmitting: true }));

        try {
          const verification = await openAccountVerificationPrompt({
            description: 'Verify your current email before deletion',
            email: currentAuthEmail,
            openModal,
            openSurface,
            purpose: AUTH_PURPOSE.ACCOUNT_DELETE,
            title: 'Delete account verification',
            toast,
          });

          if (!verification?.success) {
            setDeleteConfirmation(null);
            setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
            deleteRequestLockRef.current = false;
            return;
          }

          emitAccountFeedback('account-delete', 'start');
          const result = await deleteAccountRequest();
          setDeleteConfirmation(null);

          if (result?.deleted || result?.nextAction === 'signed_out') {
            await auth.signOut({ reason: 'delete-account', redirect: false }).catch(() => {});
          }

          toast.success('Account deleted successfully');
          await logCredentialAuditSuccess('account_delete', { userId: auth?.user?.id });
          router.push('/');
        } catch (error) {
          deleteRequestLockRef.current = false;
          setDeleteConfirmation(null);
          setDeleteFlow((prev) => ({ ...prev, isSubmitting: false }));
          const errorMessage = resolveSecurityErrorMessage(error, 'Account deletion failed');
          toast.error(errorMessage);
          await logCredentialAuditFailure('account_delete', error);
        } finally {
          clearAccountFeedback('account-delete');
        }
      },
    });
  }, [
    auth,
    currentAuthEmail,
    deleteFlow,
    openModal,
    openSurface,
    router,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  ]);

  return { handleDeleteAccount };
}

export function useAccountSecurityActions({
  auth,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  openModal,
  openSurface,
  passkeySupported = false,
  passkeys = [],
  setPasskeys,
  setSessions,
  setMfaFactors,
  setPasskeyAction,
  setEmailFlow,
  setDeleteConfirmation,
  setDeleteFlow,
  setLinkedProviderDescriptorsOverride,
  setLinkedProviderIdsOverride,
  toast,
}) {
  const [unlinkingProvider, setUnlinkingProvider] = useState(null);
  const [linkingProvider, setLinkingProvider] = useState(null);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionAction, setSessionAction] = useState(null);
  const [mfaAction, setMfaAction] = useState(null);
  const credentialActions = useAccountCredentialActions({
    auth,
    currentAuthEmail,
    emailFlow,
    openModal,
    openSurface,
    setEmailFlow,
    setLinkedProviderDescriptorsOverride,
    setLinkedProviderIdsOverride,
    toast,
  });

  const deleteAction = useAccountDeleteAction({
    auth,
    currentAuthEmail,
    deleteFlow,
    openModal,
    openSurface,
    setDeleteConfirmation,
    setDeleteFlow,
    toast,
  });

  const refreshPasskeys = useCallback(async () => {
    if (!passkeySupported || typeof auth?.listPasskeys !== 'function') return [];

    try {
      const nextPasskeys = await auth.listPasskeys();
      setPasskeys?.(Array.isArray(nextPasskeys) ? nextPasskeys : []);
      return nextPasskeys;
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Passkeys could not be loaded'));
      return [];
    }
  }, [auth, passkeySupported, setPasskeys, toast]);

  const handleRegisterPasskey = useCallback(async () => {
    if (!passkeySupported) {
      toast.error('Passkeys are not available in this browser', {
        id: 'account-passkey-browser-unsupported',
      });
      return;
    }

    if (typeof auth?.registerPasskey !== 'function') {
      toast.error('Passkey registration is not available in this session', {
        id: 'account-passkey-registration-unavailable',
      });
      return;
    }

    setPasskeyAction?.('adding');
    emitAccountFeedback('passkey-add', 'start');
    try {
      await auth.registerPasskey();
      await refreshPasskeys();
      await sendSecurityEventRequest({ event: 'passkey-added', deviceLabel: 'this device' }).catch(
        () => {},
      );
      toast.success('Passkey added');
      await logCredentialAuditSuccess('passkey-add', { userId: auth?.user?.id });
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Passkey could not be added'));
      await logCredentialAuditFailure('passkey-add', error);
    } finally {
      clearAccountFeedback('passkey-add');
      setPasskeyAction?.(null);
    }
  }, [
    auth,
    passkeySupported,
    refreshPasskeys,
    setPasskeyAction,
    toast,
  ]);

  const handleRenamePasskey = useCallback(
    async ({ passkeyId, friendlyName }) => {
      const nextName = String(friendlyName || '').trim();
      if (!passkeyId || !nextName || typeof auth?.updatePasskey !== 'function') return false;

      setPasskeyAction?.(`renaming:${passkeyId}`);
      emitAccountFeedback('passkey-rename', 'start');
      try {
        await auth.updatePasskey({ passkeyId, friendlyName: nextName });
        await refreshPasskeys();
        toast.success('Passkey renamed');
        return true;
      } catch (error) {
        toast.error(resolveSecurityErrorMessage(error, 'Passkey could not be renamed'));
        await logCredentialAuditFailure('passkey-rename', error);
        return false;
      } finally {
        clearAccountFeedback('passkey-rename');
        setPasskeyAction?.(null);
      }
    },
    [auth, refreshPasskeys, setPasskeyAction, toast],
  );

  const handleDeletePasskey = useCallback(
    (passkey) => {
      const passkeyId = passkey?.id || passkey?.passkeyId;
      if (!passkeyId || typeof auth?.deletePasskey !== 'function') return;

      setDeleteConfirmation({
        cancelText: 'Cancel',
        confirmText: 'Remove passkey',
        description: 'You will need your email or another sign-in method to access this account',
        icon: 'solar:shield-warning-bold',
        isDestructive: true,
        title: 'Remove passkey?',
        onCancel: () => setDeleteConfirmation(null),
        onConfirm: async () => {
          setPasskeyAction?.(`deleting:${passkeyId}`);
          emitAccountFeedback('passkey-remove', 'start');
          try {
            setDeleteConfirmation(null);
            await auth.deletePasskey({ passkeyId });
            await refreshPasskeys();
            await sendSecurityEventRequest({
              event: 'passkey-removed',
              deviceLabel: 'this device',
            }).catch(() => {});
            toast.success('Passkey removed');
            await logCredentialAuditSuccess('passkey-remove', { userId: auth?.user?.id });
          } catch (error) {
            toast.error(resolveSecurityErrorMessage(error, 'Passkey could not be removed'));
            await logCredentialAuditFailure('passkey-remove', error);
          } finally {
            clearAccountFeedback('passkey-remove');
            setPasskeyAction?.(null);
            setDeleteConfirmation(null);
          }
        },
      });
    },
    [
      auth,
      refreshPasskeys,
      setDeleteConfirmation,
      setPasskeyAction,
      toast,
    ],
  );


  const handleUnlinkProvider = useCallback(
    (provider) => {
      const normalizedProvider = normalizeOAuthProvider(provider);
      if (!normalizedProvider || unlinkingProvider) return;

      const providerLabel = getOAuthProviderLabel(normalizedProvider);
      setDeleteConfirmation({
        cancelText: 'Cancel',
        confirmLoadingText: 'Disconnecting',
        confirmText: `Disconnect ${providerLabel}`,
        description: `You will no longer be able to sign in with ${providerLabel}. Your other sign-in methods will remain available`,
        icon: 'solar:shield-warning-bold',
        isDestructive: true,
        title: `Disconnect ${providerLabel}?`,
        onCancel: () => setDeleteConfirmation(null),
        onConfirm: async () => {
          setUnlinkingProvider(normalizedProvider);
          emitAccountFeedback('provider-unlink', 'start', {
            description: `Disconnecting ${providerLabel}`,
            title: `Disconnecting ${providerLabel}`,
          });

          try {
            const updatedSession = await auth.unlinkProvider({ provider: normalizedProvider });
            setLinkedProviderIdsOverride(
              resolveLinkedProviderIds(updatedSession).filter(
                (providerId) => normalizeOAuthProvider(providerId) !== normalizedProvider,
              ),
            );
            setLinkedProviderDescriptorsOverride(null);
            toast.success(`${providerLabel} disconnected`);
            await logCredentialAuditSuccess('unlink-provider', {
              provider: normalizedProvider,
              userId: auth?.user?.id,
            });
          } catch (error) {
            toast.error(
              resolveSecurityErrorMessage(error, `${providerLabel} could not be disconnected`),
            );
            await logCredentialAuditFailure('unlink-provider', error);
            throw error;
          } finally {
            clearAccountFeedback('provider-unlink');
            setUnlinkingProvider(null);
            setDeleteConfirmation(null);
          }
        },
      });
    },
    [
      auth,
      setDeleteConfirmation,
      setLinkedProviderDescriptorsOverride,
      setLinkedProviderIdsOverride,
      toast,
      unlinkingProvider,
    ],
  );

  const handleLinkProvider = useCallback(
    async (provider) => {
      const normalizedProvider = normalizeOAuthProvider(provider);
      if (!normalizedProvider || linkingProvider) return;

      const providerLabel = getOAuthProviderLabel(normalizedProvider);
      if (typeof auth?.linkProvider !== 'function') {
        toast.error('Provider linking is not available in this session');
        return;
      }

      setLinkingProvider(normalizedProvider);
      emitAccountFeedback('provider-link', 'start', {
        description: `Preparing secure ${providerLabel} connection`,
        title: `Connecting ${providerLabel}`,
      });
      try {
        await auth.linkProvider({
          nextPath: '/account',
          provider: normalizedProvider,
        });
      } catch (error) {
        clearAccountFeedback('provider-link');
        toast.error(resolveSecurityErrorMessage(error, `${providerLabel} could not be connected`));
        await logCredentialAuditFailure('link-provider', error);
      } finally {
        setLinkingProvider(null);
      }
    },
    [auth, linkingProvider, toast],
  );

  const handleSignOutOtherSessions = useCallback(async () => {
    if (revokingSessions) return;

    setRevokingSessions(true);
    emitAccountFeedback('session-revoke-others', 'start');
    try {
      await signOutOtherSessionsRequest();
      toast.success('Other sessions signed out');
      await logCredentialAuditSuccess('session-revoke-others', { userId: auth?.user?.id });
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Other sessions could not be signed out'));
      await logCredentialAuditFailure('session-revoke-others', error);
    } finally {
      clearAccountFeedback('session-revoke-others');
      setRevokingSessions(false);
    }
  }, [auth?.user?.id, revokingSessions, toast]);

  const refreshSessions = useCallback(async () => {
    const response = await (
      await import('@/domains/auth/client/requests')
    ).listAuthSessionsRequest();
    setSessions?.(Array.isArray(response?.sessions) ? response.sessions : []);
    return response?.sessions || [];
  }, [setSessions]);

  const handleRevokeSession = useCallback(
    async (targetSession) => {
      const sessionId = targetSession?.id;
      if (!sessionId || targetSession?.isCurrent || sessionAction) return;
      setSessionAction(sessionId);
      emitAccountFeedback('session-revoke', 'start');
      try {
        await revokeAuthSessionRequest({ sessionId });
        await refreshSessions();
        toast.success('Session revoked');
        await logCredentialAuditSuccess('session-revoke', { sessionId, userId: auth?.user?.id });
      } catch (error) {
        toast.error(resolveSecurityErrorMessage(error, 'Session could not be revoked'));
        await logCredentialAuditFailure('session-revoke', error);
      } finally {
        clearAccountFeedback('session-revoke');
        setSessionAction(null);
      }
    },
    [
      auth?.user?.id,
      refreshSessions,
      sessionAction,
      toast,
    ],
  );

  const refreshMfaFactors = useCallback(async () => {
    if (typeof auth?.listMfaFactors !== 'function') return [];
    const nextFactors = await auth.listMfaFactors();
    setMfaFactors?.(Array.isArray(nextFactors) ? nextFactors : []);
    return nextFactors;
  }, [auth, setMfaFactors]);

  const handleEnrollMfa = useCallback(async () => {
    if (mfaAction || typeof auth?.enrollMfa !== 'function') return;

    setMfaAction('adding');
    try {
      const result = await openSurface(
        createMfaSetupSurfaceEntry({
          mode: 'enroll',
          setupMfa: async () => {
            const factors = await auth.listMfaFactors();
            const unfinishedFactors = (Array.isArray(factors) ? factors : []).filter(
              (factor) => factor?.id && factor?.status !== 'verified',
            );

            for (const factor of unfinishedFactors) {
              await auth.unenrollMfa({ factorId: factor.id });
            }

            return auth.enrollMfa();
          },
        }),
      );
      if (result?.success) {
        await refreshMfaFactors();
        await auth.refreshSession?.();
        toast.success('Authenticator enabled');
      }
    } catch (error) {
      toast.error(resolveSecurityErrorMessage(error, 'Authenticator could not be enabled'));
    } finally {
      setMfaAction(null);
    }
  }, [auth, mfaAction, openSurface, refreshMfaFactors, toast]);

  const handleUnenrollMfa = useCallback(
    async (factor) => {
      const factorId = factor?.id;
      if (!factorId || mfaAction || typeof auth?.unenrollMfa !== 'function') return;
      setMfaAction(`removing:${factorId}`);
      try {
        const challenge = await auth.challengeMfa({ factorId });
        const mfaVerification = await openSurface(
          createMfaSetupSurfaceEntry({
            challengeId: challenge?.challengeId,
            factorId,
            mode: 'reauth',
          }),
        );
        if (!mfaVerification?.success) return;
        emitAccountFeedback('mfa-remove', 'start');
        await auth.unenrollMfa({ factorId });
        await refreshMfaFactors();
        toast.success('Authenticator removed');
      } catch (error) {
        toast.error(resolveSecurityErrorMessage(error, 'Authenticator could not be removed'));
      } finally {
        clearAccountFeedback('mfa-remove');
        setMfaAction(null);
      }
    },
    [auth, mfaAction, openSurface, refreshMfaFactors, toast],
  );

  return {
    ...credentialActions,
    ...deleteAction,
    handleUnlinkProvider,
    handleLinkProvider,
    handleSignOutOtherSessions,
    handleRevokeSession,
    handleEnrollMfa,
    handleUnenrollMfa,
    refreshSessions,
    refreshMfaFactors,
    handleRegisterPasskey,
    handleRenamePasskey,
    handleDeletePasskey,
    refreshPasskeys,
    unlinkingProvider,
    linkingProvider,
    revokingSessions,
    sessionAction,
    mfaAction,
  };
}
