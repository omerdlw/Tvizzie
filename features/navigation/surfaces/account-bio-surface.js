'use client';

import { useEffect } from 'react';
import { getUserAvatarUrl } from '@/core/utils';
import { useSurfaceHeader } from '@/core/modules/nav/surfaces/surface-shell';

function formatFollowCount(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

export default function AccountBioSurface({
  close = null,
  description = '',
  followerCount = 0,
  followingCount = 0,
  onClose = null,
  profile = null,
  username = 'About',
}) {
  const normalizedDescription = String(description || '').trim();
  const avatarUrl = getUserAvatarUrl(profile);
  const followSummary = `${formatFollowCount(followingCount)} Following · ${formatFollowCount(followerCount)} Followers`;

  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: avatarUrl,
        title: username,
        description: followSummary,
        trailing: null,
      });
    }
  }, [setHeader, avatarUrl, username, followSummary]);

  return (
    <div className="max-h-[min(40dvh,18rem)] w-full overflow-y-auto">
      {normalizedDescription ? (
        <div className="p-3 pt-0">
          <p className="text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-black/70">
            {normalizedDescription}
          </p>
        </div>
      ) : null}
    </div>
  );
}
