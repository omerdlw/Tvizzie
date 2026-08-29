'use client';

import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import { DESTRUCTIVE_ACTION_TONE_CLASS, INFO_ACTION_TONE_CLASS } from '@/shared';

export const INPUT_BASE_CLASSES =
  'h-11 w-full rounded-[20px] bg-white/5 px-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out placeholder:text-white/40 hover:bg-white/10 hover:ring-white/15 focus:bg-white/10 focus:ring-white/20';

export const TEXTAREA_BASE_CLASSES =
  'w-full min-h-36 rounded-[20px] bg-white/5 p-4 text-sm text-white ring-1 ring-inset ring-white/5 transition-all duration-300 ease-in-out placeholder:text-white/40 hover:bg-white/10 hover:ring-white/15 focus:bg-white/10 focus:ring-white/20 resize-none';

const BUTTON_FRAME_CLASSES =
  'center h-10 gap-2.5 px-2.5 rounded-[20px] text-xs uppercase font-semibold disabled:cursor-not-allowed disabled:opacity-50';

export function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <Button
      {...props}
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger'
          ? DESTRUCTIVE_ACTION_TONE_CLASS
          : INFO_ACTION_TONE_CLASS,
        className,
      )}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </Button>
  );
}
export function StatusState({ title, description }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10 ring-inset">
        <p className="text-xs font-semibold text-white/40 uppercase">Account Editor</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
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
  headerClassName,
  summaryLabel,
  variant = 'default',
}) {
  const isSurface = variant === 'surface';

  return (
    <section
      className={cn(
        isSurface
          ? 'flex flex-col gap-2.5'
          : 'rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10 sm:p-5',
        className,
      )}
    >
      <div
        className={cn(
          isSurface
            ? 'flex items-center justify-between gap-4 border-b border-white/5 pb-2.5'
            : 'mb-4 flex items-center justify-between gap-4',
          headerClassName,
        )}
      >
        <h2
          className={isSurface ? 'text-sm font-semibold text-white/70' : 'text-base font-semibold text-white'}
        >
          {title}
        </h2>
        {summaryLabel ? <div className="text-xs text-white/40">{summaryLabel}</div> : null}
      </div>
      <div>
        {description ? (
          <p className="mb-4 max-w-2xl text-sm leading-6 text-white/40">{description}</p>
        ) : null}
        <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-xs font-medium text-white/40">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-white/40">{hint}</span> : null}
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
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-start">
      <div className="space-y-3">
        <Field label={fieldLabel}>
          <Input
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
            'aspect-square overflow-hidden rounded-xl bg-black/50 ring-1 ring-white/10 ring-inset',
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
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/40">
              <Icon icon="solar:gallery-bold" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
