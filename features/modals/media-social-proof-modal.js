'use client';

import Link from 'next/link';

import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import Container from '@/core/modules/modal/container';
import AdaptiveImage from '@/ui/elements/adaptive-image';
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
  attachAction(socialProof?.watched?.users, 'Watched');
  attachAction(socialProof?.watchlist?.users, 'Watchlist');
  attachAction(socialProof?.reviews?.users, 'Review');
  attachAction(socialProof?.lists?.users, 'List');

  return Array.from(userMap.values());
}

function formatActionSummary(actions = []) {
  const actionMap = {
    Review: 'Reviewed',
    Like: 'Liked',
    Watched: 'Watched',
    Watchlist: 'Watchlisted',
    List: 'Listed',
  };
  const ordered = ['Review', 'Like', 'Watched', 'Watchlist', 'List'];
  const phrases = ordered.filter((action) => actions.includes(action)).map((action) => actionMap[action] || action);

  if (phrases.length === 0) return '';

  return phrases.join(' · ');
}

export default function MediaSocialProofModal({ close, data, header }) {
  const userActions = buildUserActionMap(data?.socialProof);
  const isSidePosition = header?.position === 'left' || header?.position === 'right';
  const highlights = Array.isArray(data?.socialProof?.highlights) ? data.socialProof.highlights : [];

  return (
    <Container
      className={
        isSidePosition ? 'h-full max-h-full w-full sm:w-[460px]' : 'max-h-[78dvh] w-full sm:w-[min(1400px,96vw)]'
      }
      close={close}
      header={header}
      bodyClassName="p-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {highlights.length > 0 ? (
            <div className="p-3 lg:p-4">
              <div className="bg-black/[0.035] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                <p className="mb-2 text-[10px] font-semibold tracking-widest text-black/45 uppercase">
                  People you follow
                </p>
                {highlights.map((highlight) => (
                  <div key={highlight.key} className="flex items-start gap-2 py-1 text-sm text-black/70">
                    <Icon icon="solar:stars-bold" size={15} className="mt-0.5 shrink-0 text-black/40" />
                    <span>{highlight.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {userActions.length === 0 && highlights.length === 0 ? (
            <div className={cn('center h-full w-full py-20 text-sm font-medium text-black/50')}>
              No social activity from people you follow yet
            </div>
          ) : (
            <div className="flex min-h-0 flex-col">
              {userActions.map(({ actions, user }) => {
                const avatarSrc = getUserAvatarUrl(user);
                const avatarFallbackSrc = getUserAvatarFallbackUrl(user);
                const username = user?.username || 'user';

                return (
                  <Link
                    key={user.id}
                    href={`/account/${username}`}
                    onClick={close}
                    className="relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/10 p-3 transition-colors last:border-none hover:bg-black/5 lg:p-4"
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
                        <span className="font-semibold">@{username}</span> engaged with this title.
                      </span>
                      <span className="truncate text-[10px] tracking-widest text-black/50 uppercase">
                        {formatActionSummary(actions)}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 self-center">
                      <span
                        aria-hidden="true"
                        className="center size-7 border border-black/10 text-black/70 transition"
                      >
                        <Icon icon="solar:alt-arrow-right-linear" size={16} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
