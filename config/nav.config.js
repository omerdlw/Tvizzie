export const NAV_CONFIG = {
  items: {
    home: {
      path: '/',
      title: 'Tvizzie',
      description: 'Discover Movies & TV Shows',
      icon: 'solar:home-2-bold',
    },
    profile: {
      path: '/profile',
      title: 'Profile',
      description: 'Your favorites, watchlist, and custom lists',
      icon: 'solar:user-circle-bold',
    },
  },

  dimensions: {
    collapsedY: -8,
    expandedY: -78,
    cardHeight: 74,
    actionGap: 10,
  },

  dynamicSources: {
    firebase: {
      servers: {
        defaultDescription: 'Select a server',
        settingsKey: 'SELECTED_SERVER',
        icon: 'solar:server-bold',
        path: '/servers',
      },
    },
    polling: {
      lastfm: {
        endpoint: 'https://ws.audioscrobbler.com/2.0/',
        icon: 'solar:music-note-bold',
        defaultTitle: 'Now Playing',
        interval: 30000,
      },
    },
  },
}
