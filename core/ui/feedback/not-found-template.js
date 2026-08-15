'use client';

import NotFoundAction from '@/ui/feedback/not-found-action';
import { useRegistry } from '@/modules/registry';
import { normalizeFeedbackText } from '@/shared/utils';
import { FullscreenState } from '@/ui/feedback/fullscreen-state';
import { getStatusTheme } from '@/modules/nav/hooks/navigation-status-model';

export default function NotFoundTemplate({ description }) {
  const normalizedDescription = normalizeFeedbackText(description);

  useRegistry({
    nav: {
      description: normalizedDescription || 'The page you were looking for was not found',
      icon: 'solar:forbidden-circle-bold',
      action: <NotFoundAction />,
      isNotFound: true,
      isStatus: true,
      title: '404',
      style: getStatusTheme('NOT_FOUND'),
    },
  });

  return (
    <FullscreenState
      affectGlobalState={false}
      className="h-screen w-screen"
      contentClassName="h-screen w-screen"
    >
      <p className="text-center">{normalizedDescription}</p>
    </FullscreenState>
  );
}
