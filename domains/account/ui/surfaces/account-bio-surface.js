'use client';

import { motion } from 'framer-motion';
import { getUserAvatarUrl } from '@/domains/account/utils';

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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.24, 1] }}
      className="bg-primary max-h-[min(40dvh,18rem)] w-full overflow-y-auto rounded-2xl px-4 py-2"
    >
      {normalizedDescription ? (
        <div className="py-1">
          <p className="text-justify text-sm leading-relaxed wrap-break-word whitespace-normal text-black/70">
            {normalizedDescription}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
