'use client'

import { useCallback, useState } from 'react'

import ListPickerModal from '@/features/modal/list-picker-modal'
import { useModal } from '@/modules/modal/context'
import { useRegistry } from '@/modules/registry'
import { Button } from '@/ui/elements'
import Icon from '@/ui/icon'

export default function AccountProfileMediaActions({
  extraActions = [],
  media,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  userId = null,
}) {
  const { openModal } = useModal()
  const [isRemoving, setIsRemoving] = useState(false)

  useRegistry({
    modal: {
      LIST_PICKER_MODAL: ListPickerModal,
    },
  })

  const handleOpenListPicker = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()

      if (!userId || !media) {
        return
      }

      openModal('LIST_PICKER_MODAL', 'bottom', {
        data: {
          media,
          userId,
        },
      })
    },
    [media, openModal, userId]
  )

  const handleRemove = useCallback(
    async (event) => {
      event.preventDefault()
      event.stopPropagation()

      if (isRemoving || typeof onRemoveItem !== 'function') {
        return
      }

      setIsRemoving(true)

      try {
        await onRemoveItem(media)
      } finally {
        setIsRemoving(false)
      }
    },
    [isRemoving, media, onRemoveItem]
  )

  return (
    <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-2">
      {extraActions.map((action, index) => (
        <button
          key={`${action.label || action.icon || 'media-action'}-${index}`}
          type="button"
          aria-label={action.label}
          className="flex size-6 items-center justify-center border border-white/10  text-white hover:text-white backdrop-blur-sm transition hover:border-white/40 hover: disabled:cursor-default"
          disabled={Boolean(action.disabled)}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            action.onClick?.(media)
          }}
        >
          <Icon icon={action.icon} size={12} />
        </button>
      ))}

      {userId ? (
        <button
          type="button"
          aria-label="Add to list"
          className="flex size-6 items-center justify-center border border-white/10  text-white hover:text-white backdrop-blur-sm transition hover:border-white/40 hover: disabled:cursor-default"
          onClick={handleOpenListPicker}
        >
          <Icon icon="solar:list-check-minimalistic-bold" size={12} />
        </button>
      ) : null}

      {typeof onRemoveItem === 'function' ? (
        <Button
          className="flex size-6 items-center justify-center border border-white/10  text-white hover:text-white backdrop-blur-sm transition hover:border-white/40 hover: disabled:cursor-default"
          aria-label={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon
            icon="solar:trash-bin-trash-bold"
            size={16}
            className={isRemoving ? 'animate-pulse' : ''}
          />
        </Button>
      ) : null}
    </div>
  )
}
