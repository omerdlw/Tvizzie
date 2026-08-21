'use client';

import { useNavHeight } from './hooks/use-nav-height';

export default function NavHeightSpacer({ className = '' }) {
  const { navHeight } = useNavHeight();

  return (
    <div aria-hidden="true" className={className} style={{ flexShrink: 0, height: navHeight }} />
  );
}
