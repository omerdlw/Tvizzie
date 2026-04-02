
'use client'

import Icon from '@/ui/icon'

import { getNavActionClass, NAV_ACTION_STYLES } from './styles'

export default function AuthGoogleAction({
  isLoading = false,
  label = 'Continue with Google',
  onClick,
}) {
  return (
    <div className={NAV_ACTION_STYLES.row}>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={getNavActionClass({
          variant:
            'w-full border border-white/10  text-white hover:border-white/20 hover: transition-colors duration-(--motion-duration-fast)',
          className: 'justify-center normal-case tracking-normal text-sm font-medium',
        })}
      >
        <Icon icon="flat-color-icons:google" size={18} />
        <span>{isLoading ? 'Opening Google' : label}</span>
      </button>
    </div>
  )
}
