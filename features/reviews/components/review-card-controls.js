'use client';

import { useEffect, useState } from 'react';

import ListPreviewComposition from '@/features/media/list-preview-composition';
import { canUseNextImageOptimization, cn, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

import { getReviewLikeText } from './review-card-utils';

export function ReviewLikeButton({ disabled = false, hasLiked = false, likesCount = 0, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium disabled:cursor-default disabled:opacity-50',
        hasLiked ? 'text-error' : 'text-white/50 hover:text-white/70'
      )}
    >
      <Icon icon="solar:heart-bold" size={16} className={hasLiked ? 'text-error' : 'text-white/50'} />
      <span>{getReviewLikeText(likesCount)}</span>
    </button>
  );
}

export function ReviewActions({ disabled, onEdit, onDeleteRequest, mobile = false, inline = false }) {
  return (
    <div
      className={cn(
        'shrink-0 items-center gap-2',
        mobile ? 'absolute top-0 right-0 flex sm:hidden' : inline ? 'flex sm:hidden' : 'hidden sm:flex'
      )}
    >
      <button
        disabled={disabled}
        className="bg-primary flex size-8 items-center justify-center border border-white/10 text-white/50 hover:text-white"
        title="Edit Review"
        onClick={onEdit}
        type="button"
      >
        <Icon icon="solar:pen-bold" size={16} />
      </button>
      <Button
        variant="destructive"
        disabled={disabled}
        className="size-8"
        onClick={onDeleteRequest}
        title="Delete Review"
        type="button"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </Button>
    </div>
  );
}

export function ReviewVisual({
  alt,
  fallbackSrc = null,
  isAccountVariant,
  isListSubject = false,
  previewItems = [],
  src,
}) {
  const [resolvedSrc, setResolvedSrc] = useState(src || null);

  useEffect(() => {
    setResolvedSrc(src || null);
  }, [src]);

  const wrapperClass = isAccountVariant
    ? 'relative h-24 w-16 shrink-0 overflow-hidden sm:h-28 sm:w-[72px]'
    : 'relative size-14 shrink-0 overflow-hidden border border-white/10 bg-primary hover:bg-white';

  const handleImageError = () => {
    if (fallbackSrc && resolvedSrc !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
      return;
    }

    setResolvedSrc(null);
  };

  return (
    <div className={wrapperClass}>
      {isAccountVariant && isListSubject ? (
        <ListPreviewComposition className="" emptyIcon="solar:list-broken" items={previewItems} />
      ) : resolvedSrc ? (
        <AdaptiveImage
          className="object-cover"
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={isAccountVariant ? '(max-width: 640px) 64px, 72px' : '56px'}
          quality={resolveImageQuality(isAccountVariant ? 'poster' : 'feature')}
          decoding="async"
          onError={handleImageError}
          unoptimized={!canUseNextImageOptimization(resolvedSrc)}
          wrapperClassName="h-full w-full"
        />
      ) : (
        <div className="bg-primary/40 flex h-full w-full items-center justify-center border border-white/5 text-white/50">
          <Icon
            icon={isAccountVariant ? 'solar:clapperboard-play-bold' : 'solar:user-bold'}
            size={isAccountVariant ? 24 : 20}
          />
        </div>
      )}
    </div>
  );
}

export function ReviewMetaSeparator() {
  return (
    <span className="text-white/50" aria-hidden="true">
      •
    </span>
  );
}

export function SpoilerNotice({ compact = false, onReveal }) {
  return (
    <button
      type="button"
      onClick={onReveal}
      className={cn(
        'group bg-primary inline-flex w-full items-center justify-between gap-3 border border-white/10 p-3 text-left hover:text-black',
        compact ? 'mt-2' : 'mt-2.5'
      )}
      aria-label="Show spoiler review"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wider text-white/50 uppercase group-hover:text-white/70">
          Spoiler warning
        </span>
        <span className="block text-sm leading-6 text-white/50">
          This review contains spoilers. Click to show the full review.
        </span>
      </span>
      <span className="text-info shrink-0 p-2 text-[11px] font-semibold tracking-wide uppercase">Show</span>
    </button>
  );
}
