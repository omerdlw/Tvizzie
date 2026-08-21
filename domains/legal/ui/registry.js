'use client';

import { createRouteRegistry } from '@/modules/registry/route-registry';

const LegalRegistry = createRouteRegistry({
  displayName: 'LegalNavRegistry',
  resolveConfig: ({ description, icon, title }) => ({
    nav: {
      title,
      description,
      icon,
      action: null,
      style: {
        card: {
          className: 'border-none',
        },
      },
    },
  }),
});

export default LegalRegistry;
