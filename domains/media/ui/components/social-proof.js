'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { subscribeToMediaSocialProof } from '@/domains/media/client/social-proof';
import Icon from '@/ui/primitives/icon';
const EMPTY_SOCIAL_PROOF = Object.freeze({
  reviews: {
    count: 0,
    previewUsers: [],
    users: [],
  },
  likes: {
    count: 0,
    previewUsers: [],
    users: [],
  },
  watchlist: {
    count: 0,
    previewUsers: [],
    users: [],
  },
  watched: {
    count: 0,
    previewUsers: [],
    users: [],
  },
});
const IS_ENABLED = true;

function getSummaryParts(socialProof = {}) {
  const likesCount = socialProof?.likes?.count || socialProof?.likedBy?.length || 0;
  const watchlistCount = socialProof?.watchlist?.count || socialProof?.watchlistedBy?.length || 0;
  const reviewsCount = socialProof?.reviews?.count || 0;
  const watchedCount = socialProof?.watched?.count || socialProof?.watchedBy?.length || 0;

  return [
    likesCount > 0 && `${likesCount} likes`,
    watchlistCount > 0 && `${watchlistCount} watchlist`,
    reviewsCount > 0 && `${reviewsCount} reviews`,
    watchedCount > 0 && `${watchedCount} watched`,
  ].filter(Boolean);
}

export default function MediaSocialProof({ media, viewerId }) {
  const auth = useAuth();
  const { openModal } = useModal();
  const [socialProof, setSocialProof] = useState(EMPTY_SOCIAL_PROOF);
  const resolvedViewerId = viewerId || auth.user?.id || null;
  const summaryParts = getSummaryParts(socialProof);

  useEffect(() => {
    if (!IS_ENABLED || !media || !resolvedViewerId) {
      setSocialProof(EMPTY_SOCIAL_PROOF);
      return;
    }
    return subscribeToMediaSocialProof(
      {
        media,
        viewerId: resolvedViewerId,
      },
      setSocialProof,
    );
  }, [media, resolvedViewerId]);

  if (!IS_ENABLED || !summaryParts.length) {
    return null;
  }

  const handleOpenModal = () => {
    openModal(
      'MEDIA_SOCIAL_PROOF_MODAL',
      {
        desktop: 'right',
        mobile: 'right',
      },
      {
        header: {
          title: 'Social activity',
        },
        data: {
          socialProof,
          summaryParts,
        },
      },
    );
  };

  return (
    <button
      type="button"
      aria-label="Open social activity"
      onClick={handleOpenModal}
      className="group inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-black/70 uppercase transition-all duration-200 hover:border-black/20 hover:bg-black/10 hover:text-black"
    >
      <Icon
        icon="solar:users-group-two-rounded-bold"
        size={15}
        className="shrink-0 text-black/60 group-hover:text-black"
      />
      <span>Social activity</span>
      {summaryParts.length > 0 && (
        <span className="font-normal text-black/40">({summaryParts.join(' • ')})</span>
      )}
      <Icon
        icon="solar:alt-arrow-right-linear"
        size={14}
        className="shrink-0 text-black/40 group-hover:text-black"
      />
    </button>
  );
}
