'use client';

import NotFoundAction from '@/features/navigation/actions/not-found-action';
import { useRegistry } from '@/core/modules/registry';
import { FullscreenState } from '@/ui/states/fullscreen-state';

export default function NotFoundTemplate({ description }) {
  useRegistry({
    nav: {
      description: 'The page you were looking for was not found',
      icon: 'solar:forbidden-circle-bold',
      action: <NotFoundAction />,
      isNotFound: true,
      title: '404',
    },
  });

  return (
    <FullscreenState className="h-screen w-screen" contentClassName="h-screen w-screen">
      <p className="text-center">{description}</p>
    </FullscreenState>
  );
}
