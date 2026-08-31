'use client';

import NotFoundAction from './navigation/actions/not-found-action';
import { usePageRegistry } from '@/modules/registry';
import { normalizeFeedbackText } from '@/shared';
import { FullscreenState } from '@/ui/feedback/fullscreen-state';
import { getStatusTheme } from '@/modules/nav';

export default function NotFoundTemplate({ description }) {
  const normalizedDescription = normalizeFeedbackText(description);

  usePageRegistry({
    nav: {
      description: normalizedDescription || 'The page you were looking for was not found',
      icon: 'solar:forbidden-circle-bold',
      style: getStatusTheme('NOT_FOUND'),
      action: <NotFoundAction />,
      isNotFound: true,
      isStatus: true,
      title: '404',
    },
  });

  return (
    <FullscreenState
      contentClassName="h-screen w-screen"
      className="h-screen w-screen"
      affectGlobalState={false}
    >
      <p className="text-center">{normalizedDescription}</p>
    </FullscreenState>
  );
}
