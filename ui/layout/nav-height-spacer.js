'use client';

import { useNavHeight } from '@/modules/nav';

export default function NavHeightSpacer({ className = '' }) {
  const { navHeight } = useNavHeight();

  return (
    <div aria-hidden="true" className={className} style={{ height: navHeight, flexShrink: 0 }} />
  );
}
