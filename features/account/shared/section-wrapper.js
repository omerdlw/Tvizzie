'use client';

import Link from 'next/link';

import { normalizeFeedbackContent } from '@/core/utils/feedback-copy';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import { AccountSectionReveal } from './layout';
import { ACCOUNT_SECTION_SHELL_CLASS } from '../utils';

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
  const titleClassName = 'text-xs font-semibold tracking-widest uppercase text-black/70 transition';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-black/60 uppercase';

  return (
    <div className={`flex w-full flex-col gap-6 ${className}`}>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 flex-1 items-center gap-2">
          {icon ? <Icon icon={icon} size={24} className="text-black/70" /> : null}
          {titleHref ? (
            <Link href={titleHref} className={cn(titleClassName, 'min-w-0')}>
              {title}
            </Link>
          ) : (
            <h2 className={cn(titleClassName, 'min-w-0')}>{title}</h2>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 text-left sm:w-auto sm:shrink-0 sm:justify-end sm:text-right">
          {summaryLabel && titleHref ? (
            <Link href={titleHref} className={summaryClassName}>
              {summaryLabel}
            </Link>
          ) : summaryLabel ? (
            <p className={summaryClassName}>{summaryLabel}</p>
          ) : null}

          {action}

          {showSeeMore && titleHref ? (
            <Link href={titleHref} className={summaryClassName}>
              See more
            </Link>
          ) : null}
        </div>
      </div>

      {showDivider ? <div className="h-px bg-black/10" /> : null}
    </div>
  );
}

export function AccountSectionState({ message }) {
  return (
    <section className="relative bg-transparent">
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className="bg-primary rounded-[10px] border border-black/5 p-3 text-black/50">
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
    <section className="relative bg-transparent">
      <AccountSectionReveal delay={revealDelay}>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col gap-6`, className)}>
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

          {contentClassName ? <div className={contentClassName}>{children}</div> : children}
        </div>
      </AccountSectionReveal>
    </section>
  );
}
