'use client';

import { Spinner } from '@/ui/feedback/spinner';
import Registry from '@/app/(media)/registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    </>
  );
}
