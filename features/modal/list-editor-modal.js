'use client';

import { useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserList, updateUserList } from '@/core/services/media/lists.service';
import { Button, Input, Textarea } from '@/ui/elements';

export default function ListEditorModal({ close, data, header }) {
  const toast = useToast();
  const { isOwner, userId, initialData = null, onSuccess } = data || {};

  const isEditing = Boolean(initialData?.id);

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
  });
  const formId = 'list-editor-modal-form';

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isOwner || isSaving) return;
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

        if (typeof onSuccess === 'function') onSuccess(updatedList);
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
      className="w-full sm:w-[460px]"
      header={header}
      close={close}
      bodyClassName="p-4"
      footer={{
        left: isEditing ? 'Update list details' : 'Create a new list',
        right: (
          <>
            <Button
              type="button"
              onClick={close}
              className="bg-primary h-10 border border-black/15 px-4 text-xs font-semibold tracking-wide text-black uppercase transition hover:bg-black/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving}
              className="h-10 border border-black bg-black px-4 text-xs font-semibold tracking-wide text-white uppercase transition hover:bg-black/70 disabled:cursor-not-allowed disabled:border-black/15 disabled:bg-black/15 disabled:text-black/60"
            >
              {isSaving ? (isEditing ? 'Updating' : 'Creating') : isEditing ? 'Update list' : 'Create list'}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-wide text-black/70 uppercase">List title</label>
          <Input
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            placeholder="e.g. 90s Sci-Fi Essentials"
            className={{
              input:
                'bg-primary w-full border border-black/15 p-3 text-sm font-medium text-black outline-none placeholder:text-black/60',
            }}
          />
          <label className="text-xs font-semibold tracking-wide text-black/70 uppercase">Description</label>
          <Textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Describe your collection"
            maxHeight={200}
            className={{
              textarea:
                'bg-primary w-full border border-black/15 p-3 text-sm font-medium text-black outline-none placeholder:text-black/60',
            }}
          />
        </div>
      </form>
    </Container>
  );
}
