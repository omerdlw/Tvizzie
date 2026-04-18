'use client';

import { normalizeFeedbackContent } from '@/core/utils/feedback-copy';
import { cn } from '@/core/utils';

export default function AccountInlineSectionState({ children, className = '' }) {
  return (
    <div className={cn('bg-primary rounded-[10px] border border-black/5 p-3 text-black/50', className)}>
      {normalizeFeedbackContent(children)}
    </div>
  );
}
