'use client';

import Link from 'next/link';

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
  const summaryClassName = 'text-xs font-semibold tracking-widest text-black/50 uppercase';

  return (
    <div className={`flex w-full flex-col gap-6 ${className}`}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex w-full flex-1 items-center gap-2">
          {icon ? <Icon icon={icon} size={24} className="text-black/70" /> : null}
          {titleHref ? (
            <Link href={titleHref} className={titleClassName}>
              {title}
            </Link>
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 text-right">
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
        <div className="border border-black/15 bg-white/40 px-5 py-5 text-sm font-semibold uppercase backdrop-blur-sm">
          {message}
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
          <AccountSectionHeading
            action={action}
            icon={icon}
            showDivider={showDivider}
            showSeeMore={showSeeMore}
            summaryLabel={summaryLabel}
            title={title}
            titleHref={titleHref}
          />

          {contentClassName ? <div className={contentClassName}>{children}</div> : children}
        </div>
      </AccountSectionReveal>
    </section>
  );
}
