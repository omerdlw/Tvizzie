'use client';

import { cn } from '@/core/utils';

export default function AccountInlineSectionState({ children, className = '' }) {
  return <div className={cn('py-4 text-center underline', className)}>{children}</div>;
}
