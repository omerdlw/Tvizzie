'use client'

import { cn } from '@/lib/utils'
import AccountSectionHeading from './section-heading'
import { ACCOUNT_SECTION_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from './utils'

export default function AccountSectionLayout({
  action = null,
  children,
  className = '',
  contentClassName = '',
  icon,
  showDivider = true,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  return (
    <section className={ACCOUNT_SECTION_CLASS}>
      <div
        className={cn(
          `${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col gap-6`,
          className
        )}
      >
        <AccountSectionHeading
          action={action}
          icon={icon}
          showDivider={showDivider}
          showSeeMore={showSeeMore}
          summaryLabel={summaryLabel}
          title={title}
          titleHref={titleHref}
        />

        {contentClassName ? (
          <div className={contentClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
