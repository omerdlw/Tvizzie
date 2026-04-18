'use client';

import { useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { submitFeedback } from '@/core/services/feedback/feedback.service';
import { getStorageItem, setStorageItem } from '@/core/utils/client-utils';
import { Button, Textarea } from '@/ui/elements';
import { cn } from '@/core/index';

const FEEDBACK_STORAGE_KEY = 'tvizzie-feedback-drafts';
const FEEDBACK_STORAGE_LIMIT = 25;

const ACTION_BUTTON_CLASS =
  'h-8 shrink-0 rounded-[12px] border px-4 text-xs font-semibold tracking-wide uppercase transition';

function createFeedbackId() {
  return `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildFeedbackRecord({ message }) {
  return {
    id: createFeedbackId(),
    createdAt: new Date().toISOString(),
    message,
  };
}

function getClipboardPayload(record) {
  return ['Type: Site Feedback', `Created: ${record.createdAt}`, '', record.message].filter(Boolean).join('\n');
}

async function copyFeedbackRecord(record) {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    return false;
  }

  try {
    await navigator.clipboard.writeText(getClipboardPayload(record));
    return true;
  } catch {
    return false;
  }
}

export default function FeedbackModal({ close, header }) {
  const toast = useToast();

  const formId = 'feedback-modal-form';
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage) {
      toast.error('Please write a short feedback note');
      return;
    }

    setIsSaving(true);

    const nextRecord = buildFeedbackRecord({
      message: trimmedMessage,
    });

    try {
      const result = await submitFeedback({
        message: trimmedMessage,
        source: 'context-menu',
      });

      toast.success('Feedback sent', { allowInProduction: true });

      close({
        ...nextRecord,
        id: result?.id || nextRecord.id,
        createdAt: result?.createdAt || nextRecord.createdAt,
      });
    } catch (error) {
      const currentEntries = getStorageItem(FEEDBACK_STORAGE_KEY, []);
      const safeEntries = Array.isArray(currentEntries) ? currentEntries : [];

      const didStore = setStorageItem(
        FEEDBACK_STORAGE_KEY,
        [nextRecord, ...safeEntries].slice(0, FEEDBACK_STORAGE_LIMIT)
      );

      const copied = didStore ? await copyFeedbackRecord(nextRecord) : false;

      toast.error(
        didStore
          ? copied
            ? 'Feedback could not be sent. Draft saved locally and copied.'
            : 'Feedback could not be sent. Draft saved locally.'
          : error?.message || 'Feedback could not be sent'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Container
      className="w-full sm:w-[580px]"
      header={header}
      close={close}
      bodyClassName="p-4"
      footer={{
        right: (
          <>
            <Button
              type="button"
              onClick={close}
              className={cn(ACTION_BUTTON_CLASS, 'border-black/10 text-black/70 hover:bg-black/5 hover:text-black')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving}
              className={cn(
                ACTION_BUTTON_CLASS,
                'hover:bg-info hover:border-info hover:text-primary border-black bg-black text-white disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/60'
              )}
            >
              {isSaving ? 'Sending' : 'Send feedback'}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h2 className="text-[16px] font-semibold text-black">What should improve on Tvizzie?</h2>
          <p className="text-sm font-medium text-black/50">Share general product, UX, or quality feedback.</p>
        </div>

        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxHeight={220}
            placeholder="Your message"
            className={{
              wrapper:
                'focus-within:bg-primary rounded-[14px] border border-black/10 bg-white transition focus-within:border-black/15 hover:border-black/15',
              textarea:
                'min-h-[160px] w-full bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/50',
            }}
          />
        </div>
      </form>
    </Container>
  );
}
