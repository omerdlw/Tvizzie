'use client';

import Link from 'next/link';
import { normalizeFeedbackContent, cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';
import { ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';
import {
  PosterCardsSkeletonRow,
  ListCardsSkeletonGrid,
  ActivityItemsSkeletonList,
  ReviewCardsSkeletonList,
} from '@/domains/account/ui/skeletons/account-section-skeletons';
import { AccountReveal } from '@/app/(account)/motion';

export const ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS = 'px-4';
export const ACCOUNT_SECTION_HEADER_PADDING_CLASS = `min-h-14 ${ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS}`;
export const ACCOUNT_SECTION_CONTENT_PADDING_CLASS = 'p-6';
export const ACCOUNT_SECTION_TOOLBAR_PADDING_CLASS = `${ACCOUNT_SECTION_HORIZONTAL_PADDING_CLASS} py-4`;
export const ACCOUNT_SECTION_PAGINATION_CLASS = 'mt-6 flex justify-center';
const ACCOUNT_SECTION_BORDER_CLASS = 'border-white/10';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'center min-h-24 w-full  border border-white/10 p-6 text-center text-xs sm:text-sm font-semibold tracking-wider text-white/50 uppercase';

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
  const titleClassName = 'min-w-0 text-xs font-semibold tracking-widest uppercase text-white/70';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-white/50 uppercase';
  const TitleWrapper = titleHref ? Link : 'h2';
  return (
    <div className={cn('relative flex w-full flex-col', className)}>
      <div
        className={cn(
          'flex w-full items-center justify-between gap-4',
          ACCOUNT_SECTION_HEADER_PADDING_CLASS,
        )}
      >
        <AccountReveal className="flex min-w-0 items-center gap-2" deferred stage="section.heading">
          {icon && <Icon icon={icon} size={24} className="text-white/70" />}
          <TitleWrapper href={titleHref} className={titleClassName}>
            {title}
          </TitleWrapper>
        </AccountReveal>

        <AccountReveal
          className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right"
          deferred
          itemIndex={1}
          stage="section.heading"
        >
          {summaryLabel &&
            (titleHref ? (
              <Link href={titleHref} className={summaryClassName}>
                {summaryLabel}
              </Link>
            ) : (
              <p className={summaryClassName}>{summaryLabel}</p>
            ))}
          {action}
          {showSeeMore && titleHref && (
            <Link href={titleHref} className={summaryClassName}>
              See more
            </Link>
          )}
        </AccountReveal>
      </div>
      {showDivider && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
      )}
    </div>
  );
}

export function AccountSectionBand({ children, className = '', isInitialSection = true }) {
  return (
    <div
      className={cn(
        'relative w-full',
        className,
      )}
    >
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
      {children}
    </div>
  );
}

export function AccountSectionState({ message, isInitialSection = true }) {
  return (
    <section className="relative bg-transparent">
      <div
        className={cn(
          ACCOUNT_SECTION_SHELL_CLASS,
          'relative',
        )}
      >
        <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
        <div className={ACCOUNT_SECTION_CONTENT_PADDING_CLASS}>
          <div className={ACCOUNT_EMPTY_SECTION_CLASS}>{normalizeFeedbackContent(message)}</div>
        </div>
      </div>
    </section>
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
    <section className="relative bg-transparent">
      <div
        className={cn(
          ACCOUNT_SECTION_SHELL_CLASS,
          'relative',
          className,
        )}
      >
        {showTopRule && (
          <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
        )}
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
        ) : (
          title && <h2 className="sr-only">{title}</h2>
        )}

        {toolbar ? (
          <AccountSectionBand
            isInitialSection={isInitialSection}
            className={cn(toolbarPaddingClassName, toolbarClassName)}
          >
            <AccountReveal deferred itemIndex={revealDelay} stage="control">
              {toolbar}
            </AccountReveal>
          </AccountSectionBand>
        ) : null}

        <AccountReveal
          className={cn(contentPaddingClassName, contentClassName)}
          deferred
          itemIndex={revealDelay}
          stage="section.content"
        >
          {children}
        </AccountReveal>
      </div>
    </section>
  );
}
