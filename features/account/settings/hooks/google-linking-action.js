'use client';

import { clearAccountFeedback, emitAccountFeedback } from '../account-feedback';
import { normalizeProviderDescriptors } from '../normalizers';
import { resolveSecurityErrorMessage } from '../security';
import { useCallback, useState } from 'react';

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
