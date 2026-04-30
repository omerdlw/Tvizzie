'use client';

import { useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserList, toggleUserListItem, updateUserList } from '@/core/services/media/lists.service';
import { Button, Input, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

const ACTION_BUTTON_CLASS =
  'h-8 shrink-0  border border-black/10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition';

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
    <div className="group bg-primary flex min-h-10 items-center gap-3  border border-black/5 px-3 py-1.5 transition-colors hover:border-black/10">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item)}
        className="center size-7 shrink-0  border border-transparent text-black/35 opacity-100 transition-colors hover:border-error/15 hover:bg-error/10 hover:text-error sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
          <span className="text-xs text-black/50">
            {isEditing
              ? `${draftItems.length} ${draftItems.length === 1 ? 'title' : 'titles'}`
              : 'Create a new list'}
          </span>
        ),
        right: (
          <>
            <Button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={`${ACTION_BUTTON_CLASS} text-black/70 hover:bg-black/5 hover:text-black`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving || !canSubmit}
              className="hover:bg-info hover:border-info hover:text-primary h-8  border border-black bg-black px-4 text-xs font-semibold tracking-wide text-white uppercase transition disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/50"
            >
              {isSaving ? (isEditing ? 'Updating' : 'Creating') : isEditing ? 'Update list' : 'Create list'}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <Input
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            placeholder="List title"
            autoFocus
            className={{
              wrapper:
                'flex h-10 items-center  border border-black/10 bg-black/5 px-3.5 transition focus-within:border-black/20',
              input: 'h-full w-full bg-transparent text-sm text-black outline-none placeholder:text-black/50',
            }}
          />
          <Textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Description (optional)"
            maxHeight={120}
            className={{
              wrapper:
                'flex min-h-10  border border-black/10 bg-black/5 px-3.5 py-2.5 transition focus-within:border-black/20 sm:min-h-10',
              textarea:
                'max-h-[120px] min-h-5 w-full resize-none bg-transparent text-sm leading-5 text-black outline-none placeholder:text-black/50',
            }}
          />
        </div>

        {isEditing ? (
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
          >
            {draftItems.length > 0 ? (
              draftItems.map((item) => (
                <ListItemRow
                  key={getItemKey(item)}
                  item={item}
                  onRemove={handleRemoveItem}
                />
              ))
            ) : (
              <div className="flex h-28 flex-col items-center justify-center gap-2  border border border-black/10 bg-black/5 text-center">
                <Icon icon="solar:list-broken" size={24} className="text-black/50" />
                <p className="text-xs text-black/50">No titles in this list</p>
              </div>
            )}
          </div>
        ) : null}
      </form>
    </Container>
  );
}

function formTitleValue(value) {
  return String(value || '').trim();
}
