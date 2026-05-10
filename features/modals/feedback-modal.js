'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { requestApiJson } from '@/core/services/shared/api-request.service';
import { getStorageItem, setStorageItem } from '@/core/utils/client-utils';
import {
  MODAL_ACTION_BUTTON_PRIMARY_CLASS,
  MODAL_ACTION_BUTTON_SECONDARY_CLASS,
  MODAL_TEXTAREA_CLASSNAMES,
} from '@/features/modals/constants';
import { getFeatureModalSectionMotion } from '@/features/motion';
import { Button, Textarea } from '@/ui/elements';

const FEEDBACK_STORAGE_KEY = 'tvizzie-feedback-drafts';
const FEEDBACK_STORAGE_LIMIT = 25;

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

function normalizeValue(value) {
  return String(value || '').trim();
}

async function submitFeedback({ message, source = 'context-menu' } = {}) {
  const payload = await requestApiJson('/api/feedback', {
    method: 'POST',
    body: {
      message: normalizeValue(message),
      source: normalizeValue(source) || 'context-menu',
    },
  });

  return payload?.data || null;
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
              className={MODAL_ACTION_BUTTON_SECONDARY_CLASS}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving}
              className={MODAL_ACTION_BUTTON_PRIMARY_CLASS}
            >
              {isSaving ? 'Sending' : 'Send feedback'}
            </Button>
          </>
        ),
      }}
    >
      <motion.form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5" {...getFeatureModalSectionMotion(0)}>
        <motion.div {...getFeatureModalSectionMotion(1)}>
          <h2 className="text-[16px] font-semibold text-white">What should improve on Tvizzie?</h2>
          <p className="text-sm font-medium text-white/50">Share general product, UX, or quality feedback.</p>
        </motion.div>

        <motion.div className="space-y-2" {...getFeatureModalSectionMotion(2)}>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxHeight={220}
            placeholder="Your message"
            className={{
              ...MODAL_TEXTAREA_CLASSNAMES,
              wrapper: `${MODAL_TEXTAREA_CLASSNAMES.wrapper} min-h-[160px]`,
              textarea: 'min-h-[160px] w-full resize-none bg-transparent px-4 py-3 text-sm leading-5 text-white outline-none placeholder:text-white/50',
            }}
          />
        </motion.div>
      </motion.form>
    </Container>
  );
}
