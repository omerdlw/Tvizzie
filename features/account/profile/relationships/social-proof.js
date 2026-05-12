'use client';

import { logDataError } from '@/core/utils';
import { getAccountSocialProof } from '@/core/services/media';
import { useEffect, useState } from 'react';

export function useAccountSocialProof({
  authUserId,
  canViewPrivateContent,
  isOwner,
  isSocialFollowsEnabled,
  resolvedUserId,
}) {
  const [profileSocialProof, setProfileSocialProof] = useState(null);

  useEffect(() => {
    let ignore = false;

    if (!isSocialFollowsEnabled || !authUserId || !resolvedUserId || isOwner || !canViewPrivateContent) {
      setProfileSocialProof(null);
      return undefined;
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) {
          setProfileSocialProof(proof);
        }
      })
      .catch((error) => {
        if (!ignore) {
          logDataError('[Profile] Social proof could not be loaded:', error);
          setProfileSocialProof(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authUserId, canViewPrivateContent, isOwner, isSocialFollowsEnabled, resolvedUserId]);

  return { profileSocialProof };
}
