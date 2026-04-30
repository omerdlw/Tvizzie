'use client';

import { normalizeFeedbackContent } from '@/core/utils';
import { cn } from '@/core/utils';

export const ACCOUNT_EMPTY_SECTION_CLASS = 'bg-primary center  border border-black/5 p-6 text-black/50';

export default function AccountInlineSectionState({ children, className = '' }) {
  return <div className={cn(ACCOUNT_EMPTY_SECTION_CLASS, className)}>{normalizeFeedbackContent(children)}</div>;
}
