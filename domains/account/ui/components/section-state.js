'use client';

import { normalizeFeedbackContent } from '@/shared/lib';
import { cn } from '@/shared/lib';

export const ACCOUNT_EMPTY_SECTION_CLASS =
  'bg-primary center border border-black/5 p-6 text-black/50 rounded-2xl';

export default function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>
      {normalizeFeedbackContent(children)}
    </div>
  );
}
