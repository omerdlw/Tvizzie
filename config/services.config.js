export const SERVICES_CONFIG = {
  mongodb: {
    enabled: true,
    databases: {
      main: {
        uriEnvKey: 'MONGODB_URI',
        dbEnvKey: 'MONGODB_DB',
      },
    },
    collections: {
      posts: {
        database: 'main',
        collectionName: 'posts',
        fields: {
          title: { type: 'string', required: true },
          slug: { type: 'string', required: true, unique: true },
          content: { type: 'string', required: false },
          published: { type: 'boolean', required: false, default: false },
          createdAt: { type: 'date', auto: 'createdAt' },
          updatedAt: { type: 'date', auto: 'updatedAt' },
        },
      },
    },
  },

  firebase: {
    enabled: true,
  },
}
