import { subscribeToUnreadCount } from '@/core/services/notifications/notifications.service';

export const NAV_CONFIG = {
  items: {
    home: {
      path: '/',
      title: 'Tvizzie',
      description: 'Discover titles',
      icon: '/tvizzie.png',
      style: {
        icon: {},
      },
    },
    profile: {
      name: 'account',
      path: '/account',
      title: 'Account',
      description: 'Your favorites, watched, watchlist, and lists',
      icon: 'solar:user-circle-bold',
      children: [],
    },
  },
  integrations: {
    notifications: {
      subscribeToUnreadCount,
    },
  },
};
