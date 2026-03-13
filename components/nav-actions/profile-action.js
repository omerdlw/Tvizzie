'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

import { navActionBaseClass } from './constants'

export default function ProfileAction({
  isOwner = false,
  isAuthenticated = false,
  onSignIn,
  isNotFound = false,
  onEditProfile,
  isFollowing = false,
  onFollow,
  isLoading = false,
}) {
  const authActionClass = navActionBaseClass({
    typography: 'text-[11px] font-bold tracking-[0.15em] text-black uppercase',
    className:
      'bg-white text-black hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10',
  })

  const followActionClass = navActionBaseClass({
    typography: 'text-[11px] font-bold tracking-[0.15em] text-black uppercase',
    className:
      'bg-white/5 text-white hover:text-white hover:bg-white/5 border border-white/10',
  })

  if (isNotFound) {
    return (
      <button
        onClick={() => (window.location.href = '/')}
        className={authActionClass}
        type="button"
      >
        Back Home
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <button type="button" onClick={onSignIn} className={authActionClass}>
        <Icon icon="solar:user-circle-bold" size={14} />
        Sign In
      </button>
    )
  }

  if (isOwner) {
    return (
      <button type="button" onClick={onEditProfile} className={authActionClass}>
        <Icon icon="solar:pen-bold" size={14} />
        Edit Profile
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onFollow}
      disabled={isLoading}
      className={cn(
        followActionClass,
        isFollowing
          ? 'text-white/70 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400'
          : 'bg-white text-black hover:bg-white/5 hover:text-white'
      )}
    >
      <Icon
        icon={isFollowing ? 'solar:user-minus-bold' : 'solar:user-plus-bold'}
        size={14}
      />
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}
