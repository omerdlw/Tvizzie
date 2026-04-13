'use client';

import { useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { submitFeedback } from '@/core/services/feedback/feedback.service';
import { getStorageItem, setStorageItem } from '@/core/utils/client-utils';
import { cn } from '@/core/utils';
import { Button, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

const FEEDBACK_STORAGE_KEY = 'tvizzie-feedback-drafts';
const FEEDBACK_STORAGE_LIMIT = 25;

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

function createFeedbackId() {
  return `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildFeedbackRecord({ message, page, scope }) {
  return {
    createdAt: new Date().toISOString(),
    description: page?.descriptionText || '',
    id: createFeedbackId(),
    message,
    pageTitle: page?.titleText || '',
    path: page?.path || '',
    scope,
  };
}

function getClipboardPayload(record) {
  const lines = [
    `Scope: ${record.scope === 'page' ? 'Page Feedback' : 'Project Feedback'}`,
    record.pageTitle ? `Page: ${record.pageTitle}` : null,
    record.path ? `Path: ${record.path}` : null,
    `Created: ${record.createdAt}`,
    '',
    record.message,
  ].filter(Boolean);

  return lines.join('\n');
}

async function copyFeedbackRecord(record) {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    return false;
  }

  try {
    await navigator.clipboard.writeText(getClipboardPayload(record));
    return true;
  } catch {
    return false;
  }
}

function FeedbackPageCard({ page }) {
  if (!page) {
    return null;
  }

  return (
    <div className="flex items-start gap-4 rounded-[12px] border border-black/10 bg-black/5 p-3">
      {page.icon ? (
        isImageIconSource(page.icon) ? (
          <div
            className="size-11 shrink-0 rounded-[8px] bg-cover bg-center bg-no-repeat shadow-sm"
            style={{ backgroundImage: `url(${page.icon})` }}
          />
        ) : (
          <div className="bg-primary flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-black/10 text-black/70 shadow-sm">
            <Icon icon={page.icon} size={20} />
          </div>
        )
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/60 uppercase">Current page</p>
        <p className="mt-0.5 truncate text-[15px] leading-tight font-semibold text-black">
          {page.titleText || page.path || 'Current page'}
        </p>
        {page.descriptionText ? (
          <p className="mt-1 text-xs leading-none text-black/70">{page.descriptionText}</p>
        ) : null}
      </div>
    </div>
  );
}

function ScopeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-1 flex-col rounded-[12px] border p-3 text-left transition-all',
        active
          ? 'border-black bg-black/5 shadow-sm'
          : 'bg-primary border-black/10 hover:border-black/20 hover:bg-black/2'
      )}
    >
      {children}
    </button>
  );
}

export default function FeedbackModal({ close, data, header }) {
  const toast = useToast();
  const page = data?.page || null;
  const initialScope = data?.defaultScope === 'project' || !page ? 'project' : 'page';
  const formId = 'feedback-modal-form';

  const [message, setMessage] = useState('');
  const [scope, setScope] = useState(initialScope);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = String(message || '').trim();

    if (!trimmedMessage) {
      toast.error('Please write a short feedback note');
      return;
    }

    setIsSaving(true);

    const nextRecord = buildFeedbackRecord({
      message: trimmedMessage,
      page,
      scope,
    });

    try {
      const result = await submitFeedback({
        message: trimmedMessage,
        page,
        scope,
        source: 'context-menu',
      });

      toast.success('Feedback sent');
      close({
        ...nextRecord,
        createdAt: result?.createdAt || nextRecord.createdAt,
        id: result?.id || nextRecord.id,
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
  };

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
              className="bg-primary h-8 rounded-[12px] border border-black/10 px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-black/15 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving}
              className="hover:bg-info hover:border-info hover:text-primary h-8 rounded-[12px] border border-black bg-black px-4 text-xs font-semibold tracking-wide text-white uppercase transition disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/60"
            >
              {isSaving ? 'Sending' : 'Send feedback'}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
        <div className="space-y-1">
          <p className="text-[16px] font-semibold text-black">What would you like to improve?</p>
          <p className="text-[14px] font-medium text-black/60">
            Feedback is sent to the backend now. If the request fails, a local draft is kept so nothing is lost.
          </p>
        </div>

        {scope === 'page' && page ? <FeedbackPageCard page={page} /> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          {page ? (
            <ScopeButton active={scope === 'page'} onClick={() => setScope('page')}>
              <p className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Page</p>
              <p className="mt-1 text-[13px] text-black/70">Comment on the current route and its content.</p>
            </ScopeButton>
          ) : null}
          <ScopeButton active={scope === 'project'} onClick={() => setScope('project')}>
            <p className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Project</p>
            <p className="mt-1 text-[13px] text-black/70">Share a broader product or UX suggestion.</p>
          </ScopeButton>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Feedback</label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              scope === 'page'
                ? 'What feels off on this page? What should change?'
                : 'What should improve across the product?'
            }
            maxHeight={220}
            className={{
              wrapper:
                'rounded-[12px] border border-black/10 bg-white transition focus-within:border-black focus-within:bg-white hover:border-black/20',
              textarea:
                'min-h-[160px] w-full bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40',
            }}
          />
        </div>
      </form>
    </Container>
  );
}
