'use client';

import NotFoundAction from '@/ui/feedback/not-found-action';
import { useRegistry } from '@/modules/registry';
import { normalizeFeedbackText } from '@/shared/utils';
import { FullscreenState } from '@/ui/feedback/fullscreen-state';

export default function NotFoundTemplate({ description }) {
  const normalizedDescription = normalizeFeedbackText(description);

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
      <p className="text-center">{normalizedDescription}</p>
    </FullscreenState>
  );
}
