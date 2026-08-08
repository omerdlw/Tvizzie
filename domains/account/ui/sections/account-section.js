'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { normalizeFeedbackContent, cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';
import { AccountSectionReveal } from '../layouts/account-layout';
import { ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';
import { sectionHeadingVariants } from '@/app/(account)/motion';
import {
  PosterCardsSkeletonRow,
  ListCardsSkeletonGrid,
  ActivityItemsSkeletonList,
  ReviewCardsSkeletonList,
} from '@/domains/account/ui/skeletons/account-section-skeletons';

const ACCOUNT_SECTION_GRID_CLASS = 'grid grid-cols-12 gap-x-4 sm:gap-x-6';
const ACCOUNT_SECTION_CONTENT_CLASS = 'col-span-12 flex min-w-0 flex-col';
const ACCOUNT_SECTION_BAND_PADDING_CLASS = 'p-5 sm:p-6';
const ACCOUNT_SECTION_RULE_CLASS =
  'pointer-events-none absolute top-0 left-1/2 h-px w-screen max-w-6xl -translate-x-1/2 bg-black/10';
const ACCOUNT_SECTION_DIVIDER_CLASS =
  'relative left-1/2 h-px w-screen max-w-6xl -translate-x-1/2 bg-black/10';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'center min-h-24 w-full rounded-2xl border border-black/10 p-6 text-center text-xs sm:text-sm font-semibold tracking-wider text-black/50 uppercase';

export function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>
      {normalizeFeedbackContent(children)}
    </div>
  );
}

export function AccountInlineSectionLoading({ variant = 'poster' }) {
  if (variant === 'list') {
    return <ListCardsSkeletonGrid count={3} />;
  }
  if (variant === 'activity') {
    return <ActivityItemsSkeletonList count={3} />;
  }
  if (variant === 'review') {
    return <ReviewCardsSkeletonList count={2} />;
  }
  return <PosterCardsSkeletonRow count={6} />;
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
  const titleClassName = 'min-w-0 text-xs font-semibold tracking-widest uppercase text-black/70';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-black/50 uppercase';
  const TitleWrapper = titleHref ? Link : 'h2';
  return (
    <motion.div
      className={cn('flex w-full flex-col', className)}
      initial={sectionHeadingVariants.initial}
      animate={sectionHeadingVariants.animate || sectionHeadingVariants.whileInView}
      transition={sectionHeadingVariants.transition}
    >
      <div className={cn('flex w-full items-center justify-between gap-4', ACCOUNT_SECTION_BAND_PADDING_CLASS)}>
        <div className="flex min-w-0 items-center gap-2">
          {icon && <Icon icon={icon} size={24} className="text-black/70" />}
          <TitleWrapper href={titleHref} className={titleClassName}>
            {title}
          </TitleWrapper>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right">
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
        </div>
      </div>

      {showDivider && <div className={ACCOUNT_SECTION_DIVIDER_CLASS} />}
    </motion.div>
  );
}

export function AccountSectionState({ message }) {
  return (
    <section className="relative bg-transparent">
      <div aria-hidden="true" className={ACCOUNT_SECTION_RULE_CLASS} />
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className={ACCOUNT_SECTION_GRID_CLASS}>
          <div className={cn('col-span-12', ACCOUNT_SECTION_BAND_PADDING_CLASS)}>
            <div className={ACCOUNT_EMPTY_SECTION_CLASS}>{normalizeFeedbackContent(message)}</div>
          </div>
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
  isInitialSection = false,
  revealDelay = 0,
  showHeader = true,
  showDivider = true,
  showSeeMore = false,
  showTopRule = true,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  return (
    <section className="relative bg-transparent">
      {showTopRule && <div aria-hidden="true" className={ACCOUNT_SECTION_RULE_CLASS} />}
      <AccountSectionReveal delay={revealDelay} isInitialSection={isInitialSection}>
        <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, className)}>
          <div className={ACCOUNT_SECTION_GRID_CLASS}>
            <div className={ACCOUNT_SECTION_CONTENT_CLASS}>
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
              ) : (
                title && <h2 className="sr-only">{title}</h2>
              )}

              <div className={cn(ACCOUNT_SECTION_BAND_PADDING_CLASS, contentClassName)}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}
