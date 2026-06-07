'use client';

import { useEffect } from 'react';
import { getUserAvatarUrl } from '@/core/utils';
import { useSurfaceHeader } from '@/features/navigation/surfaces/surface-shell';

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
    <div className="bg-primary max-h-[min(40dvh,18rem)] w-full overflow-y-auto rounded-[14px] px-4 py-2">
      {normalizedDescription ? (
        <div className="py-1">
          <p className="text-justify text-sm leading-relaxed text-black/70">{normalizedDescription}</p>
        </div>
      ) : null}
    </div>
  );
}
