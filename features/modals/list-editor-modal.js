'use client';

import { useState } from 'react';
import Container, { CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserList, toggleUserListItem, updateUserList } from '@/core/services/media/lists';
import { Button, Input, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';
import { AnimatePresence, motion } from 'framer-motion';

const editorSpringTransition = Object.freeze({
  type: 'spring',
  stiffness: 310,
  damping: 29,
  mass: 0.8,
});

const editorButtonSpring = Object.freeze({
  type: 'spring',
  stiffness: 440,
  damping: 23,
  mass: 0.58,
});

const editorButtonTap = Object.freeze({});

const editorInputMotion = Object.freeze({});

function getEditorRowAnimation(index = 0) {
  return Object.freeze({
    initial: Object.freeze({ opacity: 0, y: 4 }),
    animate: Object.freeze({ opacity: 1, y: 0 }),
    exit: Object.freeze({ opacity: 0, y: -4 }),
    transition: Object.freeze({
      opacity: { duration: 0.16 },
      y: { type: 'spring', stiffness: 350, damping: 30, delay: Math.min(index * 0.015, 0.1) },
    }),
  });
}

const MotionButton = motion(Button);

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const FORM_ID = 'list-editor-modal-form';

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getItemKey(item) {
  return String(item?.mediaKey || `${item?.entityType || item?.media_type || 'movie'}-${item?.entityId || item?.id}`)
    .trim()
    .toLowerCase();
}
function getItemTitle(item) {
  return String(item?.title || item?.name || 'Untitled').trim();
}
function getRemovedItems(initialItems = [], draftItems = []) {
  const draftKeys = new Set(draftItems.map((item) => getItemKey(item)));
  return initialItems.filter((item) => !draftKeys.has(getItemKey(item)));
}
function formTitleValue(value) {
  return String(value || '').trim();
}

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function ListEditorModal({ close, data, header }) {
  const toast = useToast();
  const { isOwner, userId, initialData = null, initialItems = null, onItemsChange, onSuccess } = data || {};
  const isEditing = Boolean(initialData?.id);
  const resolvedInitialItems = Array.isArray(initialItems)
    ? initialItems
    : Array.isArray(initialData?.items)
      ? initialData.items
      : Array.isArray(initialData?.previewItems)
        ? initialData.previewItems
        : [];
  const [isSaving, setIsSaving] = useState(false);
  const [draftItems, setDraftItems] = useState(resolvedInitialItems);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
  });
  const canSubmit = Boolean(formTitleValue(form.title));
  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleRemoveItem = (item) => {
    if (!isEditing || !isOwner) return;
    const itemKey = getItemKey(item);
    setDraftItems((currentItems) => currentItems.filter((current) => getItemKey(current) !== itemKey));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isOwner || isSaving || !canSubmit) return;
    if (!form.title.trim()) {
      toast.error('Please provide a list title');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        const listData = {
          description: form.description,
          title: form.title,
        };
        const updatedList = await updateUserList({
          ...listData,
          listId: initialData.id,
          userId: userId,
        });
        const removedItems = getRemovedItems(resolvedInitialItems, draftItems);
        if (removedItems.length > 0) {
          await Promise.all(
            removedItems.map((item) =>
              toggleUserListItem({
                listId: initialData.id,
                media: item,
                userId,
              })
            )
          );
        }
        if (typeof onItemsChange === 'function') onItemsChange(draftItems);
        if (typeof onSuccess === 'function') {
          onSuccess({
            ...updatedList,
            itemsCount: draftItems.length,
            previewItems: draftItems.slice(0, 5),
          });
        }
      } else {
        const listData = {
          userId: userId,
          title: form.title,
          description: form.description,
        };
        const nextList = await createUserList(listData);
        if (typeof onSuccess === 'function') onSuccess(nextList);
      }
      close();
    } catch (error) {
      toast.error(error?.message || 'The list could not be saved');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <ModalView
      close={close}
      header={header}
      isEditing={isEditing}
      isSaving={isSaving}
      canSubmit={canSubmit}
      draftItems={draftItems}
      form={form}
      handleChange={handleChange}
      handleRemoveItem={handleRemoveItem}
      handleSubmit={handleSubmit}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({
  close,
  header,
  isEditing,
  isSaving,
  canSubmit,
  draftItems,
  form,
  handleChange,
  handleRemoveItem,
  handleSubmit,
}) {
  return (
    <Container
      className="max-h-[72dvh] w-full sm:w-[520px]"
      header={header}
      close={close}
      bodyClassName="flex overflow-hidden p-3"
      footer={{
        left: (
          <span className="text-xs text-black/50">
            {isEditing ? `${draftItems.length} ${draftItems.length === 1 ? 'title' : 'titles'}` : 'Create a new list'}
          </span>
        ),
        right: (
          <>
            <MotionButton
              type="button"
              onClick={close}
              disabled={isSaving}
              {...editorButtonTap}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="submit"
              form={FORM_ID}
              disabled={isSaving || !canSubmit}
              {...editorButtonTap}
              className={ACTION_BUTTON_CLASS}
            >
              {isSaving ? (isEditing ? 'Updating' : 'Creating') : isEditing ? 'Update list' : 'Create list'}
            </MotionButton>
          </>
        ),
      }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <motion.div {...editorInputMotion}>
            <Input
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="List title"
              autoFocus
              className={{
                wrapper: 'flex h-10 items-center border border-black/10 bg-black/5 px-3.5 focus-within:border-black/20 rounded-[10px] transition-all duration-300 ease-out',
                input: 'h-full w-full bg-transparent text-sm text-black rounded-[10px] outline-none placeholder:text-black/50',
              }}
            />
          </motion.div>
          <motion.div {...editorInputMotion}>
            <Textarea
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Description (optional)"
              maxHeight={120}
              className={{
                wrapper:
                  'flex min-h-10 border border-black/10 bg-black/5 px-3.5 py-2.5 focus-within:border-black/20 sm:min-h-10 rounded-[10px] transition-all duration-300 ease-out',
                textarea:
                  'max-h-[120px] min-h-5 w-full resize-none bg-transparent text-sm leading-5 text-black rounded-[10px] outline-none placeholder:text-black/50',
              }}
            />
          </motion.div>
        </div>

        {isEditing ? (
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
          >
            <AnimatePresence mode="popLayout">
              {draftItems.length > 0 ? (
                draftItems.map((item, index) => <ListItemRow key={getItemKey(item)} index={index} item={item} onRemove={handleRemoveItem} />)
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-28 flex-col items-center justify-center gap-2 border border-dashed border-black/10 bg-black/5 text-center rounded-[14px]"
                >
                  <Icon icon="solar:list-broken" size={24} className="text-black/50" />
                  <p className="text-xs text-black/50">No titles in this list</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </form>
    </Container>
  );
}
function ListItemRow({ item, onRemove, index }) {
  const title = getItemTitle(item);
  return (
    <motion.div
      {...getEditorRowAnimation(index)}
      layout
      className="group bg-primary flex min-h-10 items-center gap-3 border border-black/5 px-3 py-1.5 hover:border-black/10 rounded-[10px] transition-all duration-300 ease-out"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
      </div>

      <motion.button
        type="button"
        onClick={() => onRemove(item)}
        {...editorButtonTap}
        className="center hover:border-error/15 hover:bg-error/10 hover:text-error size-7 shrink-0 border border-transparent text-black/35 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 rounded-[8px] transition-all duration-300 ease-out"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </motion.button>
    </motion.div>
  );
}
