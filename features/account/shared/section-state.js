'use client';

import { cn } from '@/core/utils';

export default function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn('bg-primary rounded-[10px] border border-black/5 p-3 text-black/50', className)}>{children}</div>
  );
}
