'use client';

import { Spinner } from '@/domains/shell/shared/components/feedback/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-12">
      <Spinner size={32} />
    </div>
  );
}
