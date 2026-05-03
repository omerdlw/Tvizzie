'use client';

import { normalizeFeedbackContent } from '@/core/utils';
import { cn } from '@/core/utils';

export const ACCOUNT_EMPTY_SECTION_CLASS = 'bg-primary center rounded border border-white/10 p-6 text-white/50';

export default function AccountInlineSectionState({ children, className = '' }) {
  return <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>{normalizeFeedbackContent(children)}</div>;
}
