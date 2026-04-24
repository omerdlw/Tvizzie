'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { subscribeToMediaSocialProof } from '@/core/services/media/social-proof.service';
import Icon from '@/ui/icon';

const EMPTY_SOCIAL_PROOF = Object.freeze({
  reviews: { count: 0, previewUsers: [], users: [] },
  likes: { count: 0, previewUsers: [], users: [] },
  watchlist: { count: 0, previewUsers: [], users: [] },
});

const IS_ENABLED = true;

function getSummaryParts({ likes, watchlist, reviews }) {
  return [
    likes.count > 0 && `${likes.count} likes`,
    watchlist.count > 0 && `${watchlist.count} watchlist`,
    reviews.count > 0 && `${reviews.count} reviews`,
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

    return subscribeToMediaSocialProof({ media, viewerId: resolvedViewerId }, setSocialProof);
  }, [media, resolvedViewerId]);

  if (!IS_ENABLED || !summaryParts.length) {
    return null;
  }

  const handleOpenModal = () => {
    openModal(
      'MEDIA_SOCIAL_PROOF_MODAL',
      { desktop: 'right', mobile: 'right' },
      {
        header: { title: 'Social activity' },
        data: { socialProof, summaryParts },
      }
    );
  };

  return (
    <button
      type="button"
      aria-label="Open social activity"
      onClick={handleOpenModal}
      className="group inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold tracking-widest text-black/70 uppercase transition-colors hover:text-black"
    >
      <span>Social activity</span>
      <Icon icon="solar:alt-arrow-right-linear" size={16} className="shrink-0" />
    </button>
  );
}
