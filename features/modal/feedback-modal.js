'use client';

import { useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { submitFeedback } from '@/core/services/feedback/feedback.service';
import { cn } from '@/core/utils';
import { getStorageItem, setStorageItem } from '@/core/utils/client-utils';
import { Button, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

const FEEDBACK_STORAGE_KEY = 'tvizzie-feedback-drafts';
const FEEDBACK_STORAGE_LIMIT = 25;

const SECONDARY_BUTTON_CLASS =
  'h-8 border border-black/10 px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-black/15 hover:bg-white';

const PRIMARY_BUTTON_CLASS =
  'h-8 border border-black bg-black px-4 text-xs font-semibold tracking-wide uppercase text-white transition hover:border-info hover:bg-info hover:text-primary disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/60';

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
    id: createFeedbackId(),
    createdAt: new Date().toISOString(),
    message,
    scope,
    pageTitle: page?.titleText || '',
    description: page?.descriptionText || '',
    path: page?.path || '',
  };
}

function getClipboardPayload(record) {
  return [
    `Scope: ${record.scope === 'page' ? 'Page Feedback' : 'Project Feedback'}`,
    record.pageTitle && `Page: ${record.pageTitle}`,
    record.path && `Path: ${record.path}`,
    `Created: ${record.createdAt}`,
    '',
    record.message,
  ]
    .filter(Boolean)
    .join('\n');
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

function ScopeOption({ active, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 border p-3 text-left transition-all',
        active ? 'border-black bg-black/5 shadow-sm' : 'border-black/10 hover:border-black/20 hover:bg-black/2'
      )}
    >
      <div className="text-[11px] font-bold tracking-widest text-black/60 uppercase">{title}</div>
      <div className="mt-1 text-[13px] text-black/70">{description}</div>
    </button>
  );
}

function PageCard({ page }) {
  if (!page) return null;

  const icon = page.icon;
  const title = page.titleText || page.path || 'Current page';

  return (
    <div className="flex items-start gap-4 border border-black/10 bg-black/5 p-3">
      {icon &&
        (isImageIconSource(icon) ? (
          <div
            className="size-11 shrink-0 bg-cover bg-center bg-no-repeat shadow-sm"
            style={{ backgroundImage: `url(${icon})` }}
          />
        ) : (
          <div className="bg-primary flex size-11 shrink-0 items-center justify-center border border-black/10 text-black/70 shadow-sm">
            <Icon icon={icon} size={20} />
          </div>
        ))}

      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.18em] text-black/60 uppercase">Current page</div>
        <div className="mt-0.5 truncate text-[15px] leading-tight font-semibold text-black">{title}</div>
        {page.descriptionText && <div className="mt-1 text-xs text-black/70">{page.descriptionText}</div>}
      </div>
    </div>
  );
}

export default function FeedbackModal({ close, data, header }) {
  const toast = useToast();

  const page = data?.page || null;
  const formId = 'feedback-modal-form';
  const initialScope = data?.defaultScope === 'project' || !page ? 'project' : 'page';

  const [message, setMessage] = useState('');
  const [scope, setScope] = useState(initialScope);
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
            <Button type="button" onClick={close} className={SECONDARY_BUTTON_CLASS}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={isSaving} className={PRIMARY_BUTTON_CLASS}>
              {isSaving ? 'Sending' : 'Send feedback'}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h2 className="text-[16px] font-semibold text-black">What would you like to improve?</h2>
          <p className="text-[14px] font-medium text-black/60">
            Feedback is sent to the backend now. If the request fails, a local draft is kept so nothing is lost.
          </p>
        </div>

        {scope === 'page' && <PageCard page={page} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          {page && (
            <ScopeOption
              active={scope === 'page'}
              title="Page"
              description="Comment on the current route and its content."
              onClick={() => setScope('page')}
            />
          )}
          <ScopeOption
            active={scope === 'project'}
            title="Project"
            description="Share a broader product or UX suggestion."
            onClick={() => setScope('project')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Feedback</label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxHeight={220}
            placeholder={
              scope === 'page'
                ? 'What feels off on this page? What should change?'
                : 'What should improve across the product?'
            }
            className={{
              wrapper: 'border border-black/10 bg-white transition focus-within:border-black hover:border-black/20',
              textarea:
                'min-h-[160px] w-full bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40',
            }}
          />
        </div>
      </form>
    </Container>
  );
}
