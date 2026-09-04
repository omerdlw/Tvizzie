'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/client';
import { Container } from '@/modules/modal';
import { MODAL_LIST_ITEM_VARIANTS, MODAL_LIST_VARIANTS } from '@/modules/modal';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';

function buildUserActionMap(socialProof) {
  const userMap = new Map();

  const attachAction = (users = [], action) => {
    if (!Array.isArray(users)) return;
    users.forEach((user) => {
      const u = typeof user === 'object' ? user : null;
      if (!u || (!u.id && !u.username)) return;
      const key = u.id || u.username;
      const existing = userMap.get(key) || { user: u, actions: new Set() };
      existing.actions.add(action);
      userMap.set(key, existing);
    });
  };

  attachAction(
    socialProof?.likedBy || socialProof?.likes?.users || socialProof?.likes?.previewUsers,
    'liked',
  );
  attachAction(
    socialProof?.watchedBy || socialProof?.watched?.users || socialProof?.watched?.previewUsers,
    'watched',
  );
  attachAction(
    socialProof?.watchlistedBy ||
      socialProof?.watchlist?.users ||
      socialProof?.watchlist?.previewUsers,
    'watchlisted',
  );
  attachAction(socialProof?.reviews?.users || socialProof?.reviews?.previewUsers, 'reviewed');
  attachAction(socialProof?.lists?.users || socialProof?.lists?.previewUsers, 'added to list');

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
    if (actions[0] === 'reviewed') return 'Reviewed this';
    if (actions[0] === 'added to list') return 'Added to list';
  }
  return actions.map((item) => item.toUpperCase()).join(' • ');
}

const SocialUserRow = memo(function SocialUserRow({ close, user, actions, index }) {
  const username = user?.username || 'user';

  return (
    <motion.div
      variants={MODAL_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <Link
        href={`/account/${username}`}
        onClick={close}
        className="relative grid h-full w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-white/5 p-3 transition-all duration-300 ease-in-out hover:bg-black lg:p-4"
      >
        <div className="center size-10 shrink-0 overflow-hidden rounded-[14px] bg-white/5 ring-1 ring-white/5 ring-inset">
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
          <span className="truncate text-xs text-white/50 uppercase">
            {formatActionSummary(actions)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <span
            aria-hidden="true"
            className="center size-7 rounded-lg text-white/70 ring-1 ring-white/10 ring-inset"
          >
            <Icon icon="solar:alt-arrow-right-linear" size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
});

export default function SocialProofModal({ close, data }) {
  const userEntries = buildUserActionMap(data?.socialProof);

  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,560px)]"
      close={close}
      header={{
        left: <h2 className="text-xs font-bold text-white/50 uppercase">Friends activity</h2>,
        right: data?.title ? (
          <span className="truncate text-xs text-white/50">{data.title}</span>
        ) : null,
      }}
      bodyClassName="p-0"
    >
      {userEntries.length > 0 ? (
        <motion.div
          variants={MODAL_LIST_VARIANTS}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          {userEntries.map(({ user, actions }, index) => (
            <SocialUserRow
              key={user.id || user.username || index}
              close={close}
              user={user}
              actions={actions}
              index={index}
            />
          ))}
        </motion.div>
      ) : (
        <div className="center flex-col gap-2 p-8 text-center">
          <Icon icon="solar:users-group-two-rounded-linear" size={32} className="text-white/50" />
          <p className="text-sm font-medium text-white/50">No social activity found yet</p>
          <p className="text-xs text-white/50">
            When people you follow like, review, or watch this title, their activity will appear
            here.
          </p>
        </div>
      )}
    </Container>
  );
}
