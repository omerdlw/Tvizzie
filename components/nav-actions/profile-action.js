'use client'

import Icon from '@/ui/icon'

import {
  NAV_ACTION_ICON,
  NAV_ACTION_LAYOUT,
  navActionClass,
} from './constants'

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
  const authActionClass = navActionClass({
    tone: 'primary',
  })

  const followActionClass = navActionClass({
    tone: isFollowing ? 'danger' : 'primary',
    className: 'disabled:cursor-not-allowed disabled:opacity-60',
  })

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_LAYOUT.row}>
        <button
          onClick={() => (window.location.href = '/')}
          className={authActionClass}
          type="button"
        >
          Back Home
        </button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_LAYOUT.row}>
        <button type="button" onClick={onSignIn} className={authActionClass}>
          <Icon icon="solar:user-circle-bold" size={NAV_ACTION_ICON.default} />
          Sign In
        </button>
      </div>
    )
  }

  if (isOwner) {
    return (
      <div className={NAV_ACTION_LAYOUT.row}>
        <button
          type="button"
          onClick={onEditProfile}
          className={authActionClass}
        >
          <Icon icon="solar:pen-bold" size={NAV_ACTION_ICON.default} />
          Edit Profile
        </button>
      </div>
    )
  }

  return (
    <div className={NAV_ACTION_LAYOUT.row}>
      <button
        type="button"
        onClick={onFollow}
        disabled={isLoading}
        className={followActionClass}
      >
        <Icon
          icon={isFollowing ? 'solar:user-minus-bold' : 'solar:user-plus-bold'}
          size={NAV_ACTION_ICON.default}
        />
        {isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  )
}
