'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { resolveAuthVerificationHeader } from '@/core/modules/modal/header';
import { Description, Icon as BadgeIcon, Title } from '@/core/modules/nav/elements';
import { NAV_ACTION_SPRING, NAV_SURFACE_SPRING } from '@/core/modules/nav/motion';
import Icon from '@/ui/icon';
import { Spinner } from '@/ui/loadings/spinner';

function dismissSurface(close) {
  if (typeof close === 'function') {
    close({
      success: false,
      cancelled: true,
    });
  }
}

function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) {
    return null;
  }

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AuthVerificationSurface({ close, data, header }) {
  const VerificationForm = typeof data?.formComponent === 'function' ? data.formComponent : null;
  const hasInitialChallenge = Boolean(data?.initialChallenge?.challengeToken);
  const shouldStartSending = data?.autoSendOnOpen !== false && !hasInitialChallenge;
  const initialCodeExpiryLabel = useMemo(() => {
    return formatVerificationExpiry(data?.initialChallenge?.expiresAt);
  }, [data?.initialChallenge?.expiresAt]);

  const [meta, setMeta] = useState(() => ({
    codeExpiryLabel: initialCodeExpiryLabel,
    hasChallenge: hasInitialChallenge,
    isExpired: false,
    isSending: shouldStartSending,
  }));

  const handleMetaChange = useCallback((nextMeta) => {
    setMeta((prev) => ({
      ...prev,
      ...nextMeta,
    }));
  }, []);

  const resolvedHeader = useMemo(() => {
    const fallbackHeader = resolveAuthVerificationHeader({
      data,
    });

    const defaultDescription = header?.description || 'Enter the 6-digit code sent to your email';
    const dynamicDescription = meta?.isExpired
      ? 'Süre doldu'
      : meta?.isSending && !meta?.codeExpiryLabel
        ? 'Sending verification code'
        : meta?.codeExpiryLabel
          ? `Code expires at ${meta.codeExpiryLabel}`
          : defaultDescription;

    return {
      title: header?.title || fallbackHeader.title,
      description: dynamicDescription,
    };
  }, [data, header?.description, header?.title, meta?.codeExpiryLabel, meta?.isExpired, meta?.isSending]);

  const headerIcon = meta?.isSending && !meta?.hasChallenge ? <Spinner size={24} /> : 'solar:shield-keyhole-bold';

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-verification-surface-title"
      className="relative flex flex-col gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={NAV_SURFACE_SPRING}
    >
      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          dismissSurface(close);
        }}
        className={`center center absolute top-0 right-0 z-10 size-8 cursor-pointer border border-transparent p-1 transition-all hover:border-white/10 hover:bg-white/5`}
        aria-label="Close verification"
        transition={NAV_ACTION_SPRING}
      >
        <Icon icon="material-symbols:close-rounded" size={20} />
      </motion.button>
      <div className="relative flex h-auto w-full items-center space-x-2 pr-8">
        <div className="center relative">
          <BadgeIcon icon={headerIcon} />
        </div>

        <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <Title text={resolvedHeader.title} style={{ className: '!normal-case !truncate' }} />
            {resolvedHeader.description ? <Description text={resolvedHeader.description} /> : null}
          </div>
        </div>
      </div>

      {VerificationForm ? (
        <VerificationForm
          close={close}
          data={data}
          autoFocusCodeInput
          onMetaChange={handleMetaChange}
          className="space-y-3 pt-0.5"
        />
      ) : null}
    </motion.section>
  );
}
