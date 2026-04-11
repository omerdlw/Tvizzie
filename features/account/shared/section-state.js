'use client';

import { cn } from '@/core/utils';

const ACCOUNT_INLINE_SECTION_STATE_CLASS = 'border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm';

export default function AccountInlineSectionState({ children, className = '' }) {
  return <div className={cn(ACCOUNT_INLINE_SECTION_STATE_CLASS, className)}>{children}</div>;
}
