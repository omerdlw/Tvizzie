'use client';

import Link from 'next/link';

import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import Container from '@/core/modules/modal/container';
import Icon from '@/ui/icon';

function buildUserActionMap(socialProof) {
  const userMap = new Map();

  const attachAction = (users = [], action) => {
    users.forEach((user) => {
      if (!user?.id) return;

      const existing = userMap.get(user.id) || {
        actions: [],
        user,
      };

      if (!existing.actions.includes(action)) {
        existing.actions.push(action);
      }

      userMap.set(user.id, existing);
    });
  };

  attachAction(socialProof?.likes?.users, 'Like');
  attachAction(socialProof?.watchlist?.users, 'Watchlist');
  attachAction(socialProof?.reviews?.users, 'Review');

  return Array.from(userMap.values());
}

function formatActionSummary(actions = []) {
  const actionMap = {
    Review: 'Review',
    Like: 'Liked',
    Watchlist: 'Watchlist',
  };
  const phrases = actions.map((action) => actionMap[action] || action);

  if (phrases.length === 0) return '';

  return phrases.join(' · ');
}

export default function MediaSocialProofModal({ close, data, header }) {
  const userActions = buildUserActionMap(data?.socialProof);

  return (
    <Container
      header={header}
      className="h-screen w-full sm:h-screen sm:w-[420px]"
      close={close}
      bodyClassName="p-0"
      footer={{
        left: `${userActions.length} users`,
      }}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-black/10 px-5 py-4">
          <p className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">
            People you follow engaged with this title
          </p>
          <p className="mt-2 text-sm text-black">{(data?.summaryParts || []).join(' · ')}</p>
        </div>

        <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
          {userActions.map(({ actions, user }) => {
            const avatarSrc = getUserAvatarUrl(user);
            const avatarFallbackSrc = getUserAvatarFallbackUrl(user);

            return (
              <Link
                key={user.id}
                href={`/account/${user.username || user.id}`}
                onClick={close}
                className="flex items-center gap-3 border-b border-black/10 px-5 py-4 transition hover:bg-black/5"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-[10px] border border-black/10">
                  <img
                    src={avatarSrc}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                    onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
                  />
                </div>

                <div className="min-w-0 flex-1 -space-y-0.5">
                  <p className="mt-0.5 truncate text-sm text-black">@{user.username || 'user'}</p>
                  <p className="mt-1.5 truncate text-[12px] font-medium text-black/70">
                    {formatActionSummary(actions)}
                  </p>
                </div>

                <Icon icon="solar:alt-arrow-right-linear" size={18} className="shrink-0 text-black/70" />
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
