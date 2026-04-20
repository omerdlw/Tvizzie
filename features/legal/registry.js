'use client';

import { useRegistry } from '@/core/modules/registry';

export default function LegalNavRegistry({ description, icon, title }) {
  useRegistry({
    nav: {
      title,
      description,
      icon,
      action: null,
    },
  });

  return null;
}
