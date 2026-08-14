'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Container, CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/modules/modal';
import {
  MODAL_LIST_ITEM_VARIANTS,
  MODAL_LIST_VARIANTS,
  MODAL_MICRO_TAP_SCALE,
} from '@/modules/modal/motion';
import { useToast } from '@/modules/notification';
import {
  createUserList,
  toggleUserListItem,
  updateUserList,
} from '@/domains/media/client/collections/lists';
import { Input, Textarea } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

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
      variants={MODAL_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="group bg-primary flex min-h-10 items-center gap-3 border border-white/5 px-3 py-1.5 transition-[background-color,border-color] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/10"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: MODAL_MICRO_TAP_SCALE }}
        onClick={() => onRemove(item)}
        className="center hover:border-error/15 hover:bg-error/10 hover:text-error size-7 shrink-0 cursor-pointer border border-transparent text-white/35 opacity-100 transition-[background-color,border-color,color] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
          <span className="text-xs text-white/50">
            {isEditing
              ? `${draftItems.length} ${draftItems.length === 1 ? 'title' : 'titles'}`
              : 'Create a new list'}
          </span>
        ),
        right: (
          <div className="flex items-center gap-2 overflow-visible p-0.5">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={isSaving || !canSubmit}
              className={ACTION_BUTTON_CLASS}
            >
              {isSaving
                ? isEditing
                  ? 'Updating'
                  : 'Creating'
                : isEditing
                  ? 'Update list'
                  : 'Create list'}
            </button>
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
                'flex h-10 items-center border border-white/10 bg-white/5 px-3.5 focus-within:border-white/20',
              input:
                'h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50',
            }}
          />
          <Textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Description (optional)"
            maxHeight={120}
            className={{
              wrapper:
                'flex min-h-10 border border-white/10 bg-white/5 px-3.5 py-2.5 focus-within:border-white/20 sm:min-h-10',
              textarea:
                'max-h-[120px] min-h-5 w-full resize-none bg-transparent text-sm leading-5 text-white outline-none placeholder:text-white/50',
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
              <motion.div variants={MODAL_LIST_VARIANTS} initial="hidden" animate="visible">
                <AnimatePresence initial={false}>
                  {draftItems.map((item, index) => (
                    <ListItemRow
                      key={getItemKey(item)}
                      index={index}
                      item={item}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="flex h-28 flex-col items-center justify-center gap-2 border border-dashed border-white/10 bg-white/5 text-center">
                <Icon icon="solar:list-broken" size={24} className="text-white/50" />
                <p className="text-xs text-white/50">No titles in this list</p>
              </div>
            )}
          </div>
        )}
      </form>
    </Container>
  );
}
