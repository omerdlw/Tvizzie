'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const STYLES = Object.freeze({
  base: 'group flex flex-col items-center justify-center py-12 text-center',
  iconWrap:
    'relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-[var(--motion-duration-moderate)] group-hover:scale-110',
  icon: 'text-white/40 transition-colors duration-[var(--motion-duration-normal)] group-hover:text-white/60',
  content: 'flex max-w-[280px] flex-col items-center',
  title: 'text-base font-bold tracking-tight text-white',
  description: 'mt-1.5 text-xs leading-relaxed font-medium text-white/40',
  action:
    'mt-6 transition-transform duration-[var(--motion-duration-normal)] active:scale-95',
  fullscreenBase: 'flex flex-col items-center justify-center py-20 text-center',
  fullscreenIconWrap:
    'mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-white/20',
  fullscreenIcon: 'text-white/80',
  fullscreenTitle: 'text-2xl font-bold tracking-tight text-white sm:text-3xl',
  fullscreenDescription:
    'mt-2 max-w-sm text-sm leading-relaxed font-medium text-white/30 sm:text-base',
  fullscreenAction:
    'mt-8 transition-transform duration-[var(--motion-duration-normal)] active:scale-95',
})

export function EmptyState({ action, description, icon, title, className }) {
  return (
    <div className={cn(STYLES.base, className)}>
      <div className={STYLES.iconWrap}>
        <Icon icon={icon} size={28} className={STYLES.icon} />
      </div>
      <div className={STYLES.content}>
        <h3 className={STYLES.title}>{title}</h3>
        {description && <p className={STYLES.description}>{description}</p>}
      </div>
      {action && <div className={STYLES.action}>{action}</div>}
    </div>
  )
}

export function FullScreenEmptyState({ action, description, icon, title }) {
  return (
    <div className={STYLES.fullscreenBase}>
      <div className={STYLES.fullscreenIconWrap}>
        <Icon icon={icon} size={36} className={STYLES.fullscreenIcon} />
      </div>
      <h3 className={STYLES.fullscreenTitle}>{title}</h3>
      {description && (
        <p className={STYLES.fullscreenDescription}>{description}</p>
      )}
      {action && <div className={STYLES.fullscreenAction}>{action}</div>}
    </div>
  )
}
