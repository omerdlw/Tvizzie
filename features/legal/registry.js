'use client';

import { createRouteRegistry } from '@/features/app-shell/route-registry-factory';

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
