'use client';

import { Spinner } from '@/ui/feedback/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-12">
      <Spinner size={32} />
    </div>
  );
}
