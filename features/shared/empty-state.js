'use client';

import { cn } from '@/core/utils';

export function EmptyState({ action, description, title, className }) {
  return (
    <div className={cn('group flex flex-col items-center justify-center p-4 text-center', className)}>
      <div className="flex w-auto flex-col items-center">
        <h3 className="text-lg font-bold uppercase">{title}</h3>
        {description && <p className="text-sm leading-relaxed font-medium">{description}</p>}
      </div>
      {action && <div className="mt-2 transition-transform duration-[300ms]">{action}</div>}
    </div>
  );
}
