'use client'

import { useCallback, useMemo, useState } from 'react'

import AuthVerificationForm from '@/features/auth/auth-verification-form'
import { formatVerificationExpiry } from '@/features/auth/utils'
import { resolveAuthVerificationHeader } from '@/modules/modal/header'
import { Description, Icon as BadgeIcon, Title } from '@/modules/nav/elements'
import Icon from '@/ui/icon'
import { Spinner } from '@/ui/spinner'

function closeSurface(close) {
  if (typeof close === 'function') {
    close({
      success: false,
      cancelled: true,
    })
  }
}

export default function AuthVerificationSurface({ close, data, header }) {
  const hasInitialChallenge = Boolean(data?.initialChallenge?.challengeToken)
  const shouldStartSending =
    data?.autoSendOnOpen !== false && !hasInitialChallenge
  const initialCodeExpiryLabel = useMemo(() => {
    return formatVerificationExpiry(data?.initialChallenge?.expiresAt)
  }, [data?.initialChallenge?.expiresAt])

  const [meta, setMeta] = useState(() => ({
    codeExpiryLabel: initialCodeExpiryLabel,
    hasChallenge: hasInitialChallenge,
    isExpired: false,
    isSending: shouldStartSending,
  }))

  const handleMetaChange = useCallback((nextMeta) => {
    setMeta((prev) => ({
      ...prev,
      ...nextMeta,
    }))
  }, [])

  const resolvedHeader = useMemo(() => {
    const fallbackHeader = resolveAuthVerificationHeader({
      data,
    })

    const defaultDescription =
      header?.description || 'Enter the 6-digit code sent to your email'
    const dynamicDescription =
      meta?.isExpired
        ? 'Süre doldu'
        : meta?.isSending && !meta?.codeExpiryLabel
        ? 'Sending verification code...'
        : meta?.codeExpiryLabel
          ? `Code expires at ${meta.codeExpiryLabel}`
          : defaultDescription

    return {
      title: header?.title || fallbackHeader.title,
      description: dynamicDescription,
    }
  }, [
    data,
    header?.description,
    header?.title,
    meta?.codeExpiryLabel,
    meta?.isExpired,
    meta?.isSending,
  ])

  const headerIcon =
    meta?.isSending && !meta?.hasChallenge
      ? <Spinner size={24} className="text-white" />
      : 'solar:shield-keyhole-bold'

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-verification-surface-title"
      className="flex flex-col gap-3 px-1 py-1"
    >
      <div className="relative flex h-auto w-full items-center space-x-3">
        <div className="center relative">
          <BadgeIcon icon={headerIcon} />
        </div>

        <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <Title
              text={resolvedHeader.title}
              style={{ className: '!normal-case !truncate' }}
            />

            {resolvedHeader.description ? (
              <Description
                text={resolvedHeader.description}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => closeSurface(close)}
            className="center cursor-pointer bg-transparent p-1 text-white/70 rounded-full transition-all hover:bg-white/5 hover:text-white"
            aria-label="Close verification"
          >
            <Icon icon="material-symbols:close-rounded" size={24} />
          </button>
        </div>
      </div>

      <AuthVerificationForm
        close={close}
        data={data}
        autoFocusCodeInput
        onMetaChange={handleMetaChange}
        className="space-y-3 pt-0.5"
      />
    </section>
  )
}
