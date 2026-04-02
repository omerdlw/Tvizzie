'use client'

import { useEffect, useMemo, useState } from 'react'

import { isProjectFeatureEnabled } from '@/config/project.config'
import MediaSocialProofModal from '@/features/modal/media-social-proof-modal'
import { useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useRegistry } from '@/modules/registry'
import { subscribeToMediaSocialProof } from '@/services/media/social-proof.service'
import Icon from '@/ui/icon'

const EMPTY_SOCIAL_PROOF = Object.freeze({
  reviews: { count: 0, previewUsers: [], users: [] },
  likes: { count: 0, previewUsers: [], users: [] },
  watchlist: { count: 0, previewUsers: [], users: [] },
})
const IS_MEDIA_SOCIAL_PROOF_ENABLED =
  isProjectFeatureEnabled('media_social_proof')

function buildSummaryParts(socialProof) {
  const parts = []

  if (socialProof.likes.count > 0) {
    parts.push(`${socialProof.likes.count} likes`)
  }

  if (socialProof.watchlist.count > 0) {
    parts.push(`${socialProof.watchlist.count} watchlist`)
  }

  if (socialProof.reviews.count > 0) {
    parts.push(`${socialProof.reviews.count} reviews`)
  }

  return parts
}

export default function MediaSocialProof({ media, viewerId }) {
  const auth = useAuth()
  const { openModal } = useModal()
  const [socialProof, setSocialProof] = useState(EMPTY_SOCIAL_PROOF)
  const resolvedViewerId = viewerId || auth.user?.id || null

  useRegistry({
    modal: {
      MEDIA_SOCIAL_PROOF_MODAL: MediaSocialProofModal,
    },
  })

  useEffect(() => {
    if (!IS_MEDIA_SOCIAL_PROOF_ENABLED || !resolvedViewerId || !media) {
      setSocialProof(EMPTY_SOCIAL_PROOF)
      return
    }

    return subscribeToMediaSocialProof(
      { media, viewerId: resolvedViewerId },
      setSocialProof
    )
  }, [media, resolvedViewerId])

  const summaryParts = useMemo(
    () => buildSummaryParts(socialProof),
    [socialProof]
  )

  if (
    !IS_MEDIA_SOCIAL_PROOF_ENABLED ||
    summaryParts.length === 0
  ) {
    return null
  }

  return (
    <button
      type="button"
      aria-label="Open social activity"
      onClick={() =>
        openModal(
          'MEDIA_SOCIAL_PROOF_MODAL',
          { desktop: 'right', mobile: 'right' },
          {
            header: { title: 'Social activity' },
            data: { socialProof, summaryParts },
          }
        )
      }
      className="group inline-flex items-center gap-1 text-[11px] font-semibold tracking-widest text-white/70 uppercase transition-colors hover:text-white"
    >
      <span>Social activity</span>
      <Icon
        icon="solar:alt-arrow-right-linear"
        size={16}
        className="shrink-0 text-white"
      />
    </button>
  )
}
