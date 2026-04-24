'use client';

import { useEffect, useMemo } from 'react';

import FeedbackModal from '@/features/modals/feedback-modal';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { REGISTRY_TYPES, useRegistry, useRegistryActions } from '@/core/modules/registry';

const GLOBAL_CONTEXT_MENU_KEY = '*';
const GLOBAL_CONTEXT_MENU_SOURCE = 'global-context-menu';

async function shareCurrentPage({ page, toast }) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = window.location.href;
  const title = page?.titleText || document.title || 'Tvizzie';
  const text = page?.descriptionText || `Check out ${title} on Tvizzie`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        text,
        title,
        url,
      });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Page link copied', { allowInProduction: true });
      return;
    } catch {
      // fall through to error toast
    }
  }

  toast.error('Sharing is not available on this device');
}

export default function GlobalContextMenuRegistry() {
  const { openModal } = useModal();
  const toast = useToast();
  const { register, unregister } = useRegistryActions();

  useRegistry({
    modal: {
      FEEDBACK_MODAL: FeedbackModal,
    },
  });

  const globalContextMenuConfig = useMemo(
    () => ({
      key: 'global-page-context-menu',
      priority: 5,
      items: (menuContext) => [
        {
          key: 'refresh-page',
          label: 'Refresh page',
          icon: 'solar:refresh-bold',
          onSelect: () => {
            if (typeof window === 'undefined') {
              return;
            }

            window.location.reload();
          },
        },
        {
          key: 'share-page',
          label: 'Share page',
          icon: 'solar:share-bold',
          onSelect: () => {
            void shareCurrentPage({
              page: menuContext?.page || null,
              toast,
            });
          },
        },
        'separator',
        {
          key: 'feedback',
          label: 'Send feedback',
          icon: 'solar:chat-round-dots-bold',
          onSelect: () => {
            openModal('FEEDBACK_MODAL', 'center', {
              title: 'Feedback',
            });
          },
        },
      ],
    }),
    [openModal, toast]
  );

  useEffect(() => {
    register(REGISTRY_TYPES.CONTEXT_MENU, GLOBAL_CONTEXT_MENU_KEY, globalContextMenuConfig, {
      source: GLOBAL_CONTEXT_MENU_SOURCE,
    });

    return () => {
      unregister(REGISTRY_TYPES.CONTEXT_MENU, GLOBAL_CONTEXT_MENU_KEY, {
        source: GLOBAL_CONTEXT_MENU_SOURCE,
      });
    };
  }, [globalContextMenuConfig, register, unregister]);

  return null;
}
