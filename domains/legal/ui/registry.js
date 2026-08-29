'use client';

import { createRouteRegistry } from '@/modules/registry';

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
          className: 'ring-0',
        },
      },
    },
  }),
});

export default LegalRegistry;
