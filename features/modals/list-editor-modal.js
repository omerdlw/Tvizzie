'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserList, toggleUserListItem, updateUserList } from '@/core/services/media/lists.service';
import {
  MODAL_ACTION_BUTTON_PRIMARY_CLASS,
  MODAL_ACTION_BUTTON_SECONDARY_CLASS,
  MODAL_EMPTY_PANEL_CLASS,
  MODAL_INPUT_CLASSNAMES,
  MODAL_SCROLLABLE_BODY_CLASS,
  MODAL_TEXTAREA_CLASSNAMES,
} from '@/features/modals/constants';
import { FEATURE_MODAL_EMPTY_MOTION, getFeatureModalItemMotion, getFeatureModalSectionMotion } from '@/features/motion';
import { Button, Input, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

function getItemKey(item) {
  return String(item?.mediaKey || `${item?.entityType || item?.media_type || 'movie'}-${item?.entityId || item?.id}`)
    .trim()
    .toLowerCase();
}

function getItemTitle(item) {
  return String(item?.title || item?.name || 'Untitled').trim();
}

function ListItemRow({ item, onRemove }) {
  const title = getItemTitle(item);

  return (
    <div className="group bg-primary flex min-h-10 items-center gap-3 border border-white/5 px-3 py-1.5 hover:border-white/10">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item)}
        className="center hover:border-error/15 hover:bg-error/10 hover:text-error size-7 shrink-0 border border-transparent text-white/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </button>
    </div>
  );
}

function getRemovedItems(initialItems = [], draftItems = []) {
  const draftKeys = new Set(draftItems.map((item) => getItemKey(item)));

  return initialItems.filter((item) => !draftKeys.has(getItemKey(item)));
}

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
  const formId = 'list-editor-modal-form';

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    <Container
      className="max-h-[72dvh] w-full sm:w-[520px]"
      header={header}
      close={close}
      bodyClassName="flex overflow-hidden p-3"
      footer={{
        left: (
          <span className="text-xs text-white/50">
            {isEditing ? `${draftItems.length} ${draftItems.length === 1 ? 'title' : 'titles'}` : 'Create a new list'}
          </span>
        ),
        right: (
          <>
            <Button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={MODAL_ACTION_BUTTON_SECONDARY_CLASS}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving || !canSubmit}
              className={MODAL_ACTION_BUTTON_PRIMARY_CLASS}
            >
              {isSaving ? (isEditing ? 'Updating' : 'Creating') : isEditing ? 'Update list' : 'Create list'}
            </Button>
          </>
        ),
      }}
    >
      <motion.form
        id={formId}
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-3"
        {...getFeatureModalSectionMotion(0)}
      >
        <motion.div className="flex flex-col gap-2.5" {...getFeatureModalSectionMotion(1)}>
          <Input
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            placeholder="List title"
            autoFocus
            className={MODAL_INPUT_CLASSNAMES}
          />
          <Textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Description (optional)"
            maxHeight={120}
            className={MODAL_TEXTAREA_CLASSNAMES}
          />
        </motion.div>

        {isEditing ? (
          <motion.div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className={MODAL_SCROLLABLE_BODY_CLASS}
            {...getFeatureModalSectionMotion(2)}
          >
            {draftItems.length > 0 ? (
              draftItems.map((item, index) => (
                <motion.div key={getItemKey(item)} {...getFeatureModalItemMotion(index)}>
                  <ListItemRow item={item} onRemove={handleRemoveItem} />
                </motion.div>
              ))
            ) : (
              <motion.div {...FEATURE_MODAL_EMPTY_MOTION}>
                <div className={MODAL_EMPTY_PANEL_CLASS}>
                  <Icon icon="solar:list-broken" size={24} />
                  <p className="text-xs">No titles in this list</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </motion.form>
    </Container>
  );
}

function formTitleValue(value) {
  return String(value || '').trim();
}
