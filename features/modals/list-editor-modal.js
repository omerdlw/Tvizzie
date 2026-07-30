'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { motion } from 'framer-motion';

import { Container, CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal';
import { useToast } from '@/core/modules/notification';
import { createUserList, toggleUserListItem, updateUserList } from '@/core/services/media/lists';
import { Input, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

// --- CONSTANTS & HELPERS ---

const FORM_ID = 'list-editor-modal-form';

const getItemKey = (item) =>
  String(
    item?.mediaKey ||
      `${item?.entityType || item?.media_type || 'movie'}-${item?.entityId || item?.id}`,
  )
    .trim()
    .toLowerCase();

const getItemTitle = (item) => String(item?.title || item?.name || 'Untitled').trim();

function getRemovedItems(initialItems = [], draftItems = []) {
  const draftKeys = new Set(draftItems.map((item) => getItemKey(item)));
  return initialItems.filter((item) => !draftKeys.has(getItemKey(item)));
}

// --- SUB-COMPONENTS ---

const ListItemRow = memo(function ListItemRow({ item, onRemove, index }) {
  const title = getItemTitle(item);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1], delay: Math.min(index * 0.02, 0.12) }}
      className="group bg-primary flex min-h-10 items-center gap-3 rounded-xl border border-black/5 px-3 py-1.5 transition-colors duration-150 hover:border-black/10"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }}
        onClick={() => onRemove(item)}
        className="center hover:border-error/15 hover:bg-error/10 hover:text-error size-7 shrink-0 cursor-pointer rounded-lg border border-transparent text-black/35 opacity-100 transition-colors duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </motion.button>
    </motion.div>
  );
});

// --- MAIN COMPONENT ---

export default function ListEditorModal({ close, data, header }) {
  const toast = useToast();
  const {
    isOwner,
    userId,
    initialData = null,
    initialItems = null,
    onItemsChange,
    onSuccess,
  } = data || {};

  const isEditing = Boolean(initialData?.id);
  const resolvedInitialItems = useMemo(() => {
    if (Array.isArray(initialItems)) return initialItems;
    if (Array.isArray(initialData?.items)) return initialData.items;
    if (Array.isArray(initialData?.previewItems)) return initialData.previewItems;
    return [];
  }, [initialItems, initialData]);

  const [isSaving, setIsSaving] = useState(false);
  const [draftItems, setDraftItems] = useState(resolvedInitialItems);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
  });

  const canSubmit = Boolean(form.title.trim());

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveItem = useCallback(
    (item) => {
      if (!isEditing || !isOwner) return;
      const key = getItemKey(item);
      setDraftItems((curr) => curr.filter((currItem) => getItemKey(currItem) !== key));
    },
    [isEditing, isOwner],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isOwner || isSaving || !canSubmit) return;

    setIsSaving(true);
    try {
      if (isEditing) {
        const updatedList = await updateUserList({
          description: form.description,
          title: form.title,
          listId: initialData.id,
          userId,
        });

        const removedItems = getRemovedItems(resolvedInitialItems, draftItems);
        if (removedItems.length > 0) {
          await Promise.all(
            removedItems.map((item) =>
              toggleUserListItem({ listId: initialData.id, media: item, userId }),
            ),
          );
        }

        onItemsChange?.(draftItems);
        onSuccess?.({
          ...updatedList,
          itemsCount: draftItems.length,
          previewItems: draftItems.slice(0, 5),
        });
      } else {
        const nextList = await createUserList({
          userId,
          title: form.title,
          description: form.description,
        });
        onSuccess?.(nextList);
      }
      close();
    } catch (error) {
      toast.error(error?.message || 'The list could not be saved');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container
      className="max-h-[72dvh] w-full sm:w-[520px]"
      header={header}
      close={close}
      bodyClassName="flex overflow-hidden p-3"
      footer={{
        left: (
          <span className="text-xs text-black/50">
            {isEditing
              ? `${draftItems.length} ${draftItems.length === 1 ? 'title' : 'titles'}`
              : 'Create a new list'}
          </span>
        ),
        right: (
          <div className="flex items-center gap-2 overflow-visible p-0.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              onClick={close}
              disabled={isSaving}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              form={FORM_ID}
              disabled={isSaving || !canSubmit}
              whileHover={isSaving || !canSubmit ? undefined : { scale: 1.012 }}
              whileTap={isSaving || !canSubmit ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className={ACTION_BUTTON_CLASS}
            >
              {isSaving
                ? isEditing
                  ? 'Updating'
                  : 'Creating'
                : isEditing
                  ? 'Update list'
                  : 'Create list'}
            </motion.button>
          </div>
        ),
      }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <Input
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="List title"
            autoFocus
            className={{
              wrapper:
                'flex h-10 items-center rounded-xl border border-black/10 bg-black/5 px-3.5 transition-colors duration-150 ease-linear focus-within:border-black/20',
              input:
                'h-full w-full bg-transparent text-sm text-black outline-none placeholder:text-black/50',
            }}
          />
          <Textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Description (optional)"
            maxHeight={120}
            className={{
              wrapper:
                'flex min-h-10 rounded-xl border border-black/10 bg-black/5 px-3.5 py-2.5 transition-colors duration-150 ease-linear focus-within:border-black/20 sm:min-h-10',
              textarea:
                'max-h-[120px] min-h-5 w-full resize-none bg-transparent text-sm leading-5 text-black outline-none placeholder:text-black/50',
            }}
          />
        </div>

        {isEditing && (
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
          >
            {draftItems.length > 0 ? (
              draftItems.map((item, index) => (
                <ListItemRow
                  key={getItemKey(item)}
                  index={index}
                  item={item}
                  onRemove={handleRemoveItem}
                />
              ))
            ) : (
              <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/10 bg-black/5 text-center">
                <Icon icon="solar:list-broken" size={24} className="text-black/50" />
                <p className="text-xs text-black/50">No titles in this list</p>
              </div>
            )}
          </div>
        )}
      </form>
    </Container>
  );
}
