'use client';

import Link from 'next/link';

import { normalizeFeedbackContent } from '@/core/utils';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import { AccountSectionReveal } from './layout';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'flex min-h-10 w-full items-center justify-center text-center text-sm leading-6 text-white/70';

export function AccountInlineSectionState({ children, className = '' }) {
  return <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>{normalizeFeedbackContent(children)}</div>;
}

export function AccountSectionState({ message }) {
  return (
    <section>
      <AccountSectionReveal>
        <div className={cn('p-4', ACCOUNT_EMPTY_SECTION_CLASS)}>{normalizeFeedbackContent(message)}</div>
      </AccountSectionReveal>
    </section>
  );
}

export function AccountSectionHeading({
  action = null,
  className = '',
  icon,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  const titleClassName = 'text-xs font-semibold tracking-widest uppercase text-white/70 ';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-white/50 uppercase';

  return (
    <div className={cn('account-detail-section-heading flex w-full flex-col gap-0 border-t border-white/10', className)}>
      <div className="flex w-full items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 p-4">
          {icon ? <Icon icon={icon} size={24} className="text-white/70" /> : null}
          {titleHref ? (
            <Link href={titleHref} className={cn(titleClassName, 'min-w-0 truncate')}>
              {title}
            </Link>
          ) : (
            <h2 className={cn(titleClassName, 'min-w-0 truncate')}>{title}</h2>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 p-4 text-right">
          {summaryLabel && titleHref ? (
            <Link href={titleHref} className={cn(summaryClassName, 'whitespace-nowrap')}>
              {summaryLabel}
            </Link>
          ) : summaryLabel ? (
            <p className={cn(summaryClassName, 'whitespace-nowrap')}>{summaryLabel}</p>
          ) : null}

          {action}
          {showSeeMore && titleHref ? (
            <Link href={titleHref} className={cn(summaryClassName, 'whitespace-nowrap')}>
              See more
            </Link>
          ) : null}
        </div>
      </div>
      {showDivider ? <div className="h-px w-full border-t border-white/10" /> : null}
    </div>
  );
}

export default function AccountSectionLayout({
  action = null,
  children,
  className = '',
  contentClassName = '',
  headerToolbar = null,
  icon,
  showHeader = true,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  revealIndex = 0,
  title,
  titleHref = null,
}) {
  return (
    <section>
      <AccountSectionReveal className={cn('flex flex-col', className)} index={revealIndex}>
        {showHeader ? (
          <AccountSectionHeading
            action={action}
            icon={icon}
            showDivider={showDivider}
            showSeeMore={showSeeMore}
            summaryLabel={summaryLabel}
            title={title}
            titleHref={titleHref}
          />
        ) : title ? (
          <h2 className="sr-only">{title}</h2>
        ) : null}
        {headerToolbar ? (
          <div
            className={cn(
              'w-full border-white/10 p-4',
              showHeader ? 'border-b' : 'account-detail-section-toolbar border-y'
            )}
          >
            {headerToolbar}
          </div>
        ) : null}
        <div className={cn('p-4', contentClassName)}>{children}</div>
      </AccountSectionReveal>
    </section>
  );
}
