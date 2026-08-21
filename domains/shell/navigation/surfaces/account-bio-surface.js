'use client';

import { getUserAvatarUrl } from '@/domains/account/utils/avatar';

function formatFollowCount(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );
}

export function createAccountBioSurfaceEntry(data = {}, config = {}) {
  const profile = data.profile || null;
  const username = data.username || profile?.username || 'About';
  const avatarUrl = getUserAvatarUrl(profile);
  const followSummary = `${formatFollowCount(data.followingCount)} Following · ${formatFollowCount(data.followerCount)} Followers`;

  return {
    component: AccountBioSurface,
    icon: avatarUrl,
    title: username,
    description: followSummary,
    props: {
      description: data.description || '',
      followerCount: data.followerCount || 0,
      followingCount: data.followingCount || 0,
      profile,
      username,
    },
    ...config,
  };
}

export default function AccountBioSurface({ description = '' }) {
  const normalizedDescription = String(description || '').trim();

  return (
    <div className="max-h-[min(40dvh,18rem)] w-full overflow-y-auto bg-white/5 px-4 py-2">
      {normalizedDescription ? (
        <div className="py-1">
          <p className="text-left text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70">
            {normalizedDescription}
          </p>
        </div>
      ) : null}
    </div>
  );
}
