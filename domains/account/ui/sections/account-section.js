'use client';

import Link from 'next/link';
import { normalizeFeedbackContent } from '@/shared';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import {
  PosterCardsSkeletonRow,
  ListCardsSkeletonGrid,
  ActivityItemsSkeletonList,
  ReviewCardsSkeletonList,
} from '@/domains/account/ui/skeletons';

export const ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS = '';
export const ACCOUNT_SECTION_HEADER_PADDING_CLASS = 'mb-3 sm:mb-4';
export const ACCOUNT_SECTION_CONTENT_PADDING_CLASS = 'w-full';
export const ACCOUNT_SECTION_TOOLBAR_PADDING_CLASS = 'mb-4';
export const ACCOUNT_SECTION_PAGINATION_CLASS = 'mt-8 flex justify-center';
export const ACCOUNT_SECTION_BORDER_CLASS = '';
export const ACCOUNT_EMPTY_SECTION_CLASS =
  'flex flex-col items-center justify-center gap-2 rounded-2xl ring-1 ring-inset  ring-white/5 bg-white/5 p-8 text-center text-xs sm:text-sm text-white/50';

export function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>
      {normalizeFeedbackContent(children)}
    </div>
  );
}

export function AccountInlineSectionLoading({ variant = 'poster', wideGrid = true }) {
  if (variant === 'list') {
    return <ListCardsSkeletonGrid count={6} />;
  }
  if (variant === 'activity') {
    return <ActivityItemsSkeletonList count={6} />;
  }
  if (variant === 'review') {
    return <ReviewCardsSkeletonList count={6} />;
  }
  return <PosterCardsSkeletonRow count={6} wideGrid={wideGrid} />;
}

export function AccountSectionHeading({
  action = null,
  className = '',
  icon,
  isInitialSection = true,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  const isLink = Boolean(titleHref);

  return (
    <header
      className={cn('mb-3 flex w-full items-center justify-between gap-4 sm:mb-4', className)}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <Icon icon={icon} size={16} className="shrink-0 text-white/50 transition-colors" />
        )}
        {isLink ? (
          <Link
            href={titleHref}
            className="group inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/70 uppercase transition-colors hover:text-white sm:text-sm"
          >
            <span className="truncate">{title}</span>
            {showSeeMore && (
              <Icon
                icon="solar:alt-arrow-right-linear"
                size={12}
                className="shrink-0 text-white/50 transition-colors group-hover:text-white"
              />
            )}
          </Link>
        ) : (
          <h2 className="min-w-0 truncate text-xs font-semibold text-white/70 uppercase sm:text-sm">
            {title}
          </h2>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {summaryLabel && (
          <span className="text-xs font-semibold text-white/50 uppercase">{summaryLabel}</span>
        )}
        {action}
        {showSeeMore && titleHref && (
          <Link
            href={titleHref}
            className="hidden items-center gap-1 text-xs font-semibold text-white/50 uppercase transition-colors hover:text-white sm:inline-flex"
          >
            <span>See more</span>
            <Icon icon="solar:alt-arrow-right-linear" size={12} />
          </Link>
        )}
      </div>
    </header>
  );
}

export function AccountSectionBand({ children, className = '', isInitialSection = true }) {
  return <div className={cn('w-full', className)}>{children}</div>;
}

export function AccountSectionState({ message, isInitialSection = true }) {
  const isPrivateMessage = String(message || '')
    .toLowerCase()
    .includes('profile is private');

  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, 'py-12')}>
      {isPrivateMessage ? (
        <div className="mb-1 flex size-12 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/10 bg-white/5 text-white/70 shadow-lg">
          <Icon icon="solar:lock-keyhole-bold" size={24} />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-white/70 sm:text-base">
        {normalizeFeedbackContent(message)}
      </p>
      {isPrivateMessage ? (
        <p className="max-w-xs text-xs text-white/50">
          Follow this account to see their activity, reviews, and collections.
        </p>
      ) : null}
    </div>
  );
}

export default function AccountSectionLayout({
  action = null,
  children,
  className = '',
  contentClassName = '',
  icon,
  isInitialSection = true,
  revealDelay = 0,
  showHeader = true,
  showDivider = true,
  showSeeMore = false,
  showTopRule = true,
  summaryLabel = null,
  title,
  contentPaddingClassName = ACCOUNT_SECTION_CONTENT_PADDING_CLASS,
  titleHref = null,
  toolbar = null,
  toolbarPaddingClassName = ACCOUNT_SECTION_TOOLBAR_PADDING_CLASS,
  toolbarClassName = '',
}) {
  return (
    <section className={cn('relative w-full', className)}>
      {showHeader ? (
        <AccountSectionHeading
          action={action}
          icon={icon}
          isInitialSection={isInitialSection}
          showDivider={showDivider}
          showSeeMore={showSeeMore}
          summaryLabel={summaryLabel}
          title={title}
          titleHref={titleHref}
        />
      ) : null}

      {toolbar ? (
        <AccountSectionBand
          className={cn(toolbarPaddingClassName, toolbarClassName)}
          isInitialSection={isInitialSection}
        >
          {toolbar}
        </AccountSectionBand>
      ) : null}

      <div className={cn(contentPaddingClassName, contentClassName)}>{children}</div>
    </section>
  );
}
