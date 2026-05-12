'use client';

import { useEffect, useMemo } from 'react';

import { useCurrentAccount } from '@/core/modules/account';
import { useNavRegistry } from '@/core/modules/registry';
import { ACCOUNT_SECTION_KEYS } from '@/core/utils/account';

const ACCOUNT_NAV_KEY = '/account';
const ACCOUNT_CHILDREN_SOURCE = 'account-children';
const ACCOUNT_CHILDREN_PRIORITY = 150;
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
]);

function buildAccountChildPath(username, key) {
  const normalizedUsername = String(username || '').trim();

  if (!key || !normalizedUsername) {
    return null;
  }

  return `/account/${normalizedUsername}/${key}`;
}

function buildAccountChildren(username = null) {
  if (!String(username || '').trim()) {
    return [];
  }

  return ACCOUNT_NAV_CHILDREN.filter((item) => ACCOUNT_SECTION_KEYS.includes(item.key)).map((item) => ({
    name: `account-${item.key}`,
    path: buildAccountChildPath(username, item.key),
    title: item.title,
    description: item.description,
    icon: item.icon,
    accountSectionKey: item.key,
  }));
}

export default function AccountNavRegistry() {
  const currentAccount = useCurrentAccount();
  const { register, unregister } = useNavRegistry();
  const resolvedUsername = useMemo(() => String(currentAccount?.username || '').trim(), [currentAccount?.username]);
  const children = useMemo(() => buildAccountChildren(resolvedUsername), [resolvedUsername]);

  useEffect(() => {
    const hasRoutableChildren = children.some((child) => Boolean(child.path));

    if (!hasRoutableChildren) {
      unregister(ACCOUNT_NAV_KEY, { source: ACCOUNT_CHILDREN_SOURCE });
      return undefined;
    }

    register(
      ACCOUNT_NAV_KEY,
      {
        children,
      },
      {
        priority: ACCOUNT_CHILDREN_PRIORITY,
        source: ACCOUNT_CHILDREN_SOURCE,
      }
    );

    return () => {
      unregister(ACCOUNT_NAV_KEY, { source: ACCOUNT_CHILDREN_SOURCE });
    };
  }, [children, register, unregister]);

  return null;
}
