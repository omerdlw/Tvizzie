'use client';

import { createRouteRegistry } from '@/modules/registry/route-registry';

export default createRouteRegistry({
  displayName: 'LegalNavRegistry',
  resolveConfig: ({ description, icon, title }) => ({
    nav: {
      title,
      description,
      icon,
      action: null,
    },
  }),
});

