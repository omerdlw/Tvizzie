'use client';

import Link from 'next/link';

import { normalizeFeedbackContent } from '@/core/utils';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import { AccountSectionReveal } from './layout';
import { ACCOUNT_SECTION_SHELL_CLASS } from '../utils';
import { ACCOUNT_EMPTY_SECTION_CLASS } from './section-state';

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
  const titleClassName = 'text-xs font-semibold tracking-widest uppercase text-white/70 transition';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-white/50 uppercase';

  return (
    <div className={cn('account-detail-section-heading flex w-full flex-col gap-4', className)}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon ? <Icon icon={icon} size={24} className="text-white/70" /> : null}
          {titleHref ? (
            <Link href={titleHref} className={cn(titleClassName, 'min-w-0 truncate')}>
              {title}
            </Link>
          ) : (
            <h2 className={cn(titleClassName, 'min-w-0 truncate')}>{title}</h2>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 text-right">
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

      {showDivider ? <div className="account-detail-section-heading-rule" /> : null}
    </div>
  );
}

export function AccountSectionState({ message }) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className={cn('account-detail-section-body', ACCOUNT_EMPTY_SECTION_CLASS)}>
          {normalizeFeedbackContent(message)}
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
  revealDelay = 0,
  showHeader = true,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <AccountSectionReveal delay={revealDelay}>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col`, className)}>
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

          <div className={cn('account-detail-section-body', contentClassName)}>{children}</div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}
