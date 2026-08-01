'use client';

import { Skeleton } from '@/domains/media/ui/person-skeleton';
import Registry from '@/domains/media/ui/media-registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <Skeleton />
    </>
  );
}
