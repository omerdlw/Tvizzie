import { cn } from '@/core/utils';
import {
  Field,
  INPUT_BASE_CLASSES,
  MediaField,
  SectionCard,
  TEXTAREA_BASE_CLASSES,
} from '@/features/account/settings/view-parts';

export default function AccountEditGeneralSection({
  avatarPreview,
  bannerPreview,
  form,
  formRef,
  handleAccountSubmit,
  handleChange,
  handleClearMedia,
  handleOpenMediaUpload,
  heroDisplayName,
  isAnyMediaUploading,
  isSaving,
  mediaUploadState,
}) {
  return (
    <form ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col">
      <SectionCard revealIndex={0} title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display Name">
            <input
              value={form.displayName}
              onChange={(event) => handleChange('displayName', event.target.value)}
              placeholder="Your name"
              className={INPUT_BASE_CLASSES}
            />
          </Field>

          <Field label="Username">
            <input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              spellCheck={false}
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        </div>

        <Field label="Bio">
          <textarea
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Write something about yourself"
            rows={6}
            className={TEXTAREA_BASE_CLASSES}
          />
        </Field>
      </SectionCard>

      <SectionCard revealIndex={1} title="Avatar & Logo">
        <MediaField
          fieldLabel="Avatar URL"
          value={form.avatarUrl}
          preview={avatarPreview}
          previewAlt={`${heroDisplayName} avatar preview`}
          isUploading={Boolean(mediaUploadState?.avatar)}
          isDisabled={isSaving || isAnyMediaUploading}
          onChange={(value) => handleChange('avatarUrl', value)}
          onClear={() => handleClearMedia('avatar')}
          onOpenUpload={() => handleOpenMediaUpload('avatar')}
        />

        <div className="h-px w-full bg-white/10" />

        <MediaField
          fieldLabel="Logo URL"
          value={form.bannerUrl}
          preview={bannerPreview}
          previewAlt={`${heroDisplayName} logo preview`}
          previewClassName="aspect-video w-80"
          isUploading={Boolean(mediaUploadState?.banner)}
          isDisabled={isSaving || isAnyMediaUploading}
          onChange={(value) => handleChange('bannerUrl', value)}
          onClear={() => handleClearMedia('logo')}
          onOpenUpload={() => handleOpenMediaUpload('banner')}
        />
      </SectionCard>

      <SectionCard revealIndex={2} title="Privacy">
        <button
          type="button"
          onClick={() => handleChange('isPrivate', !form.isPrivate)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
              {form.isPrivate ? 'Private profile' : 'Public profile'}
            </span>
            <span className="text-xs leading-5 text-white/70">
              {form.isPrivate
                ? 'Only approved followers can inspect your collections.'
                : 'Anyone can inspect your collections and profile activity.'}
            </span>
          </div>

          <span className="flex h-6 w-11 border border-white/15 bg-black p-px" aria-hidden="true">
            <span className={cn('h-full w-5 bg-white', form.isPrivate ? 'bg-info translate-x-5' : 'translate-x-0')} />
          </span>
        </button>
      </SectionCard>
    </form>
  );
}
