import { ACCOUNT_SECTION_KEYS } from '@/lib/account/route-segments'

const ACCOUNT_NAV_CHILDREN = Object.freeze([
  {
    key: 'activity',
    title: 'Activity',
    description: 'Open your activity feed',
    icon: 'solar:bolt-bold',
  },
  {
    key: 'likes',
    title: 'Likes',
    description: 'Open your likes',
    icon: 'solar:heart-bold',
  },
  {
    key: 'watched',
    title: 'Watched',
    description: 'Open your watched films',
    icon: 'solar:eye-bold',
  },
  {
    key: 'watchlist',
    title: 'Watchlist',
    description: 'Open your watchlist',
    icon: 'solar:bookmark-bold',
  },
  {
    key: 'reviews',
    title: 'Reviews',
    description: 'Open your reviews',
    icon: 'solar:chat-round-bold',
  },
  {
    key: 'lists',
    title: 'Lists',
    description: 'Open your lists',
    icon: 'solar:list-bold',
  },
])

export function buildAccountChildPath(username, key) {
  const normalizedUsername = String(username || '').trim()

  if (!key) {
    return null
  }

  if (!normalizedUsername) {
    return null
  }

  return `/account/${normalizedUsername}/${key}`
}

export function buildAccountChildren(username = null) {
  if (!String(username || '').trim()) {
    return []
  }

  return ACCOUNT_NAV_CHILDREN
    .filter((item) => ACCOUNT_SECTION_KEYS.includes(item.key))
    .map((item) => ({
      name: `account-${item.key}`,
      path: buildAccountChildPath(username, item.key),
      title: item.title,
      description: item.description,
      icon: item.icon,
      accountSectionKey: item.key,
    }))
}
