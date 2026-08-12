'use client';

import { MediaDetailRouteSkeleton } from '../../movie/[id]/loading';
import Registry from '@/app/(media)/registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <MediaDetailRouteSkeleton mediaType="tv" />
    </>
  );
}
