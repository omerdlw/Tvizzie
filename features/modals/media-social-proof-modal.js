'use client';

import Link from 'next/link';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { Container } from '@/core/modules/modal';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function buildUserActionMap(socialProof) {
  const userMap = new Map();
  const attachAction = (users = [], action) => {
    users.forEach((user) => {
      if (!user?.id) return;
      const existing = userMap.get(user.id) || {
        user,
        actions: new Set(),
      };
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

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function MediaSocialProofModal({ close, data }) {
  const userEntries = buildUserActionMap(data?.socialProof);
  if (!userEntries.length) return null;

  return <ModalView close={close} userEntries={userEntries} title={data?.title} />;
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({ close, userEntries, title }) {
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
        right: title ? <span className="truncate text-xs text-black/50">{title}</span> : null,
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
            index={index}
          />
        ))}
      </div>
    </Container>
  );
}

function SocialUserRow({ close, user, actions, index }) {
  const avatarSrc = getUserAvatarUrl(user);
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user);
  const username = user?.username || 'user';
  return (
    <div>
      <Link
        href={`/account/${username}`}
        onClick={close}
        className="relative grid h-full w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/5 p-3 last:border-none hover:bg-white lg:p-4"
      >
        <div className="center size-10 shrink-0 overflow-hidden border border-black/5">
          <AdaptiveImage
            mode="img"
            src={avatarSrc}
            alt={user?.displayName || username}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
            wrapperClassName="size-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">
            <span className="font-semibold">@{username}</span>
          </span>
          <span className="truncate text-[10px] tracking-widest text-black/50 uppercase">
            {formatActionSummary(actions)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <span
            aria-hidden="true"
            className="center size-7 border border-black/10 text-black/70"
          >
            <Icon icon="solar:alt-arrow-right-linear" size={16} />
          </span>
        </div>
      </Link>
    </div>
  );
}
