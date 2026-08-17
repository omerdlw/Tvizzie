'use client';

import NotFoundAction from '@/domains/shell/navigation/action/not-found-action';
import { useRegistry } from '@/modules/registry';
import { normalizeFeedbackText } from '@/domains/shell/shared/utils';
import { FullscreenState } from '@/domains/shell/shared/components/feedback/fullscreen-state';
import { getStatusTheme } from '@/modules/nav/hooks/navigation-status-model';

export default function NotFoundTemplate({ description }) {
  const normalizedDescription = normalizeFeedbackText(description);

  useRegistry({
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
