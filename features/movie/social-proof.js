'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { subscribeToMediaSocialProof } from '@/core/services/media/social-proof.service';
import Icon from '@/ui/icon';
import AdaptiveImage from '@/ui/elements/adaptive-image';

const EMPTY_SOCIAL_PROOF = Object.freeze({
  followingCount: 0,
  highlights: [],
  reviews: { count: 0, previewUsers: [], users: [] },
  likes: { count: 0, previewUsers: [], users: [] },
  lists: { count: 0, previewLists: [], previewUsers: [], users: [] },
  scope: 'following',
  similarTaste: { count: 0, previewTitles: [] },
  watched: { count: 0, previewUsers: [], users: [] },
  watchlist: { count: 0, previewUsers: [], users: [] },
});

const IS_ENABLED = true;

function getSummaryParts({ likes, lists, reviews, watched, watchlist }) {
  return [
    likes.count > 0 && `${likes.count} likes`,
    watched.count > 0 && `${watched.count} watched`,
    watchlist.count > 0 && `${watchlist.count} watchlist`,
    reviews.count > 0 && `${reviews.count} reviews`,
    lists.count > 0 && `${lists.count} lists`,
  ].filter(Boolean);
}

function getPreviewUsers(socialProof) {
  const users = [
    ...(socialProof?.likes?.previewUsers || []),
    ...(socialProof?.watched?.previewUsers || []),
    ...(socialProof?.reviews?.previewUsers || []),
    ...(socialProof?.watchlist?.previewUsers || []),
    ...(socialProof?.lists?.previewUsers || []),
  ];
  const seen = new Set();

  return users.filter((user) => {
    if (!user?.id || seen.has(user.id)) return false;

    seen.add(user.id);
    return true;
  });
}

function SocialAvatarStack({ users = [] }) {
  const visibleUsers = users.slice(0, 3);

  if (!visibleUsers.length) {
    return null;
  }

  return (
    <span className={cn("media-social-avatar-stack")}>
      {visibleUsers.map((user) => {
        const avatarSrc = getUserAvatarUrl(user);
        const avatarFallbackSrc = getUserAvatarFallbackUrl(user);
        const label = user?.displayName || user?.username || 'User';

        return (
          <span key={user.id} className={cn("media-social-avatar center")} aria-hidden="true">
            <AdaptiveImage
              mode="img"
              src={avatarSrc}
              alt={label}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
              wrapperClassName="size-full"
            />
          </span>
        );
      })}
    </span>
  );
}

function getCompactLabel(summaryParts) {
  if (!summaryParts.length) return 'Activity from people you follow';

  return `${summaryParts.slice(0, 2).join(' · ')} from people you follow`;
}

export default function MediaSocialProof({ media, viewerId, knownMovieIds = [], className }) {
  const auth = useAuth();
  const { openModal } = useModal();
  const [socialProof, setSocialProof] = useState(EMPTY_SOCIAL_PROOF);

  const resolvedViewerId = viewerId || auth.user?.id || null;
  const knownMovieIdsKey = useMemo(
    () =>
      Array.isArray(knownMovieIds)
        ? knownMovieIds
            .map((id) => String(id || '').trim())
            .filter(Boolean)
            .join(',')
        : '',
    [knownMovieIds]
  );
  const summaryParts = getSummaryParts(socialProof);
  const highlights = Array.isArray(socialProof?.highlights) ? socialProof.highlights.slice(0, 3) : [];
  const previewUsers = getPreviewUsers(socialProof);
  const compactLabel = getCompactLabel(summaryParts);

  useEffect(() => {
    if (!IS_ENABLED || !media || !resolvedViewerId) {
      setSocialProof(EMPTY_SOCIAL_PROOF);
      return;
    }

    return subscribeToMediaSocialProof(
      { knownMovieIds: knownMovieIdsKey ? knownMovieIdsKey.split(',') : [], media, viewerId: resolvedViewerId },
      setSocialProof
    );
  }, [knownMovieIdsKey, media, resolvedViewerId]);

  if (!IS_ENABLED || !highlights.length) {
    return null;
  }

  const handleOpenModal = () => {
    openModal(
      'MEDIA_SOCIAL_PROOF_MODAL',
      { desktop: 'right', mobile: 'right' },
      {
        header: { title: 'Following activity' },
        data: { socialProof, summaryParts },
      }
    );
  };

  return (
    <button
      type="button"
      aria-label="Open social activity"
      onClick={handleOpenModal}
      className={cn('media-social-proof-button tracking-wide uppercase', className)}
    >
      <SocialAvatarStack users={previewUsers} />
      <span className="min-w-0 flex-1 truncate">{compactLabel}</span>
      {highlights.length > 1 ? <span className={cn("media-social-proof-count")}>+{highlights.length - 1}</span> : null}
      <span className={cn("media-social-proof-icon center")}>
        <Icon icon="solar:alt-arrow-right-linear" size={14} />
      </span>
    </button>
  );
}
