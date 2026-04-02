'use client'

import Icon from '@/ui/icon'

import { NAV_ACTION_STYLES, getNavActionClass } from './styles'

export default function WatchProvidersAction({
  isActive = false,
  onToggle,
  className = 'flex-1 min-w-0 whitespace-nowrap',
}) {
  const label = isActive ? 'Back' : 'Where to watch?'
  const icon = isActive ? 'solar:arrow-left-bold' : 'solar:tv-bold'

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle?.()
      }}
      className={getNavActionClass({
        isActive,
        className,
      })}
    >
      <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
      <span className="truncate">{label}</span>
    </button>
  )
}
