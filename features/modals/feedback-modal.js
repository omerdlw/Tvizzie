'use client';

import { useState } from 'react';
import Container, { CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { requestApiJson } from '@/core/services/shared/client';
import { getStorageItem, setStorageItem } from '@/core/utils/client-utils';
import { Button, Textarea } from '@/ui/elements';
import { cn } from '@/core/utils';
import { motion } from 'framer-motion';

const feedbackSpringTransition = Object.freeze({
  type: 'spring',
  stiffness: 290,
  damping: 25,
  mass: 0.8,
});

const feedbackButtonSpring = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 22,
  mass: 0.55,
});

const feedbackButtonTap = Object.freeze({});

const feedbackInputMotion = Object.freeze({});

const MotionButton = motion(Button);

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const FEEDBACK_STORAGE_KEY = 'tvizzie-feedback-drafts';
const FEEDBACK_STORAGE_LIMIT = 25;
const FORM_ID = 'feedback-modal-form';


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

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

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function FeedbackModal({ close, header }) {
  const toast = useToast();
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
      toast.success('Feedback sent', {
        allowInProduction: true,
      });
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
    <ModalView
      close={close}
      header={header}
      message={message}
      setMessage={setMessage}
      isSaving={isSaving}
      handleSubmit={handleSubmit}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({ close, header, message, setMessage, isSaving, handleSubmit }) {
  return (
    <Container
      className="w-full sm:w-[580px]"
      header={header}
      close={close}
      bodyClassName="p-4"
      footer={{
        right: (
          <>
            <MotionButton
              type="button"
              onClick={close}
              {...feedbackButtonTap}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="submit"
              form={FORM_ID}
              disabled={isSaving}
              {...feedbackButtonTap}
              className={ACTION_BUTTON_CLASS}
            >
              {isSaving ? 'Sending' : 'Send feedback'}
            </MotionButton>
          </>
        ),
      }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h2 className="text-[16px] font-semibold text-black">What should improve on Tvizzie?</h2>
          <p className="text-sm font-medium text-black/50">Share general product, UX, or quality feedback.</p>
        </div>

        <motion.div {...feedbackInputMotion} className="space-y-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxHeight={220}
            placeholder="Your message"
            className={{
              wrapper:
                'focus-within:bg-primary rounded-[10px] border border-black/10 bg-white transition-all duration-300 ease-out focus-within:border-black/15 hover:border-black/15',
              textarea:
                'min-h-[160px] w-full rounded-[10px] bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/50',
            }}
          />
        </motion.div>
      </form>
    </Container>
  );
}
