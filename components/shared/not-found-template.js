'use client'

import Link from 'next/link'

const STYLES = Object.freeze({
  layout: 'flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center',
  action:
    'inline-flex h-10 items-center justify-center rounded-[20px] border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20',
})

export default function NotFoundTemplate({
  actionHref = '/',
  actionLabel = 'Return Home',
  description,
  title = 'Page not found',
}) {
  return (
    <div className={STYLES.layout}>
      <h2 className="text-4xl font-bold text-white">404</h2>
      <p className="max-w-md text-white/50">{description || title}</p>
      <Link href={actionHref} className={`mt-2 ${STYLES.action}`}>
        {actionLabel}
      </Link>
    </div>
  )
}
