'use client';

import { AccountSectionReveal } from '@/domains/account/ui/layouts/account-layout';
import { AccountSectionHeading } from '@/domains/account/ui/sections/account-section';
import { ACCOUNT_SECTION_SHELL_CLASS, DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared/constants';
import { cn } from '@/core/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';

export const INPUT_BASE_CLASSES =
  'h-11 w-full border border-black/15 bg-primary px-3 text-sm text-black outline-none placeholder:text-black/50 focus:border-black rounded-xl';
export const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y py-3`;
const BUTTON_BASE_CLASSES =
  'border border-black/15 bg-white px-3 py-2 text-black hover:bg-black/5 disabled:opacity-50 rounded-xl';
const BUTTON_FRAME_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2 px-4 text-[11px] font-bold tracking-widest uppercase disabled:cursor-not-allowed rounded-xl';
export function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? DESTRUCTIVE_ACTION_TONE_CLASS : BUTTON_BASE_CLASSES,
        className,
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </button>
  );
}
export function StatusState({ title, description }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl border border-black/15 bg-white p-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest uppercase">Account Editor</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-black/70">{description}</p>
      </div>
    </div>
  );
}
export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  summaryLabel,
}) {
  return (
    <section className="relative bg-transparent">
      <AccountSectionReveal>
        <div className={cn(ACCOUNT_SECTION_SHELL_CLASS, 'relative flex flex-col', className)}>
          <div className="pointer-events-none absolute top-0 left-1/2 w-screen -translate-x-1/2 border-t border-black/10" />
          <AccountSectionHeading title={title} summaryLabel={summaryLabel} />
          <div className="p-6">
            {description ? <p className="text-sm leading-6 text-black/70">{description}</p> : null}
            <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}
export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold tracking-wide text-black/70 uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs leading-5 text-black/70">{hint}</span> : null}
    </label>
  );
}
export function MediaField({
  fieldLabel,
  value,
  placeholder = 'https://',
  preview,
  previewAlt,
  previewClassName,
  isUploading,
  isDisabled,
  onChange,
  onClear,
  onOpenUpload,
}) {
  const shouldDisableActions = isDisabled || isUploading;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <Field label={fieldLabel}>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            type="button"
            onClick={onOpenUpload}
            disabled={shouldDisableActions}
            icon={isUploading ? 'solar:refresh-bold' : 'solar:upload-bold'}
          >
            {isUploading ? 'Uploading' : 'Upload Media'}
          </ActionButton>

          <ActionButton type="button" onClick={onClear} disabled={!value || shouldDisableActions}>
            Clear
          </ActionButton>
        </div>
      </div>

      <div>
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-black/10 bg-black/5',
            previewClassName,
          )}
        >
          {preview ? (
            <AdaptiveImage
              mode="img"
              src={preview}
              alt={previewAlt}
              decoding="async"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/5 text-black/70">
              <Icon icon="solar:gallery-bold" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
