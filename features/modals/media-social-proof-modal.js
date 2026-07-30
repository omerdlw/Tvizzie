'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { Container } from '@/core/modules/modal';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

// --- HELPERS ---

function buildUserActionMap(socialProof) {
  const userMap = new Map();

  const attachAction = (users = [], action) => {
    users.forEach((user) => {
      if (!user?.id) return;
      const existing = userMap.get(user.id) || { user, actions: new Set() };
      existing.actions.add(action);
      userMap.set(user.id, existing);
    });
  };

  attachAction(socialProof?.likedBy, 'liked');
  attachAction(socialProof?.watchedBy, 'watched');
  attachAction(socialProof?.watchlistedBy, 'watchlisted');

  return Array.from(userMap.values()).map(({ user, actions }) => ({
    user,
    actions: Array.from(actions),
  }));
}

function formatActionSummary(actions = []) {
  if (!actions.length) return 'Engaged';
  if (actions.length === 1) {
    if (actions[0] === 'liked') return 'Liked this';
    if (actions[0] === 'watched') return 'Watched this';
    if (actions[0] === 'watchlisted') return 'Watchlisted this';
  }
  return actions.map((item) => item.toUpperCase()).join(' • ');
}

// --- SUB-COMPONENTS ---

const SocialUserRow = memo(function SocialUserRow({ close, user, actions }) {
  const username = user?.username || 'user';

  return (
    <motion.div
      whileHover={{ scale: 1.008, x: 2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
    >
      <Link
        href={`/account/${username}`}
        onClick={close}
        className="relative grid h-full w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-b border-black/5 p-3 transition-colors duration-200 last:border-none hover:bg-white lg:p-4"
      >
        <div className="center size-10 shrink-0 overflow-hidden rounded-xl border border-black/5">
          <AdaptiveImage
            mode="img"
            src={getUserAvatarUrl(user)}
            alt={user?.displayName || username}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(event) => applyAvatarFallback(event, getUserAvatarFallbackUrl(user))}
            wrapperClassName="size-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">@{username}</span>
          <span className="truncate text-[10px] tracking-widest text-black/50 uppercase">
            {formatActionSummary(actions)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <span
            aria-hidden="true"
            className="center size-7 rounded-lg border border-black/10 text-black/70"
          >
            <Icon icon="solar:alt-arrow-right-linear" size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

export default function MediaSocialProofModal({ close, data }) {
  const userEntries = buildUserActionMap(data?.socialProof);
  if (!userEntries.length) return null;

  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,560px)] rounded-[24px]"
      close={close}
      header={{
        left: (
          <h2 className="text-[11px] font-bold tracking-widest text-black/50 uppercase">
            Friends activity
          </h2>
        ),
        right: data?.title ? (
          <span className="truncate text-xs text-black/50">{data.title}</span>
        ) : null,
      }}
      bodyClassName="p-0"
    >
      <div className="flex flex-col">
        {userEntries.map(({ user, actions }, index) => (
          <SocialUserRow
            key={user.id || user.username || index}
            close={close}
            user={user}
            actions={actions}
          />
        ))}
      </div>
    </Container>
  );
}
