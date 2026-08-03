'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { normalizeFeedbackContent, cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';
import { AccountSectionReveal } from './account-layout';
import { ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';
import { sectionHeadingVariants } from '@/app/(account)/motion';

const ACCOUNT_SECTION_GRID_CLASS = 'grid grid-cols-12 gap-x-4 sm:gap-x-6';
const ACCOUNT_SECTION_CONTENT_CLASS = 'col-span-12 flex min-w-0 flex-col gap-5';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'bg-primary center border border-black/5 p-6 text-black/50 rounded-2xl';

export function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>
      {normalizeFeedbackContent(children)}
    </div>
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
  const titleClassName = 'min-w-0 text-xs font-semibold tracking-widest uppercase text-black/70';
  const summaryClassName = 'text-xs font-semibold tracking-widest text-black/50 uppercase';
  const TitleWrapper = titleHref ? Link : 'h2';
  return (
    <motion.div
      className={cn('flex w-full flex-col gap-4', className)}
      initial={sectionHeadingVariants.initial}
      animate={sectionHeadingVariants.animate || sectionHeadingVariants.whileInView}
      transition={sectionHeadingVariants.transition}
    >
      <div className="flex w-full items-center justify-between gap-4">
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

      {showDivider && <div className="h-px bg-black/10" />}
    </motion.div>
  );
}

export function AccountSectionState({ message }) {
  return (
    <section className="relative bg-transparent py-4 sm:py-6">
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className={ACCOUNT_SECTION_GRID_CLASS}>
          <div className="col-span-12">
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
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  return (
    <section className="relative bg-transparent py-4 sm:py-6">
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

              {contentClassName ? <div className={contentClassName}>{children}</div> : children}
            </div>
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}
