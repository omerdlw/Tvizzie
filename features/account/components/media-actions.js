'use client';

import { useCallback, useState } from 'react';

import { useModal } from '@/core/modules/modal/context';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

export default function ProfileMediaActions({
  extraActions = [],
  media,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  userId = null,
}) {
  const { openModal } = useModal();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleOpenListPicker = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!userId || !media) {
        return;
      }

      openModal('LIST_PICKER_MODAL', 'center', {
        data: {
          media,
          userId,
        },
      });
    },
    [media, openModal, userId]
  );

  const handleRemove = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isRemoving || typeof onRemoveItem !== 'function') {
        return;
      }

      setIsRemoving(true);

      try {
        await onRemoveItem(media);
      } finally {
        setIsRemoving(false);
      }
    },
    [isRemoving, media, onRemoveItem]
  );

  return (
    <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
      {extraActions.map((action, index) => (
        <button
          key={`${action.label || action.icon || 'media-action'}-${index}`}
          type="button"
          aria-label={action.label}
          className="center size-8 border border-white/15 bg-black text-white disabled:cursor-default"
          disabled={Boolean(action.disabled)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onClick?.(media);
          }}
        >
          <Icon icon={action.icon} size={12} />
        </button>
      ))}

      {userId ? (
        <button
          type="button"
          aria-label="Add to list"
          className="center size-8 border border-white/15 bg-black text-white disabled:cursor-default"
          onClick={handleOpenListPicker}
        >
          <Icon icon="solar:list-check-minimalistic-bold" size={12} />
        </button>
      ) : null}

      {typeof onRemoveItem === 'function' ? (
        <Button
          variant="destructive-icon"
          className="center text-error hover:border-error hover:bg-error size-8 border border-white/15 bg-black hover:text-black disabled:cursor-default"
          aria-label={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      ) : null}
    </div>
  );
}
