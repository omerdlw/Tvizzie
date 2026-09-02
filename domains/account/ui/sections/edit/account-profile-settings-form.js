'use client';

import { useEffect, useRef, useState } from 'react';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { cn } from '@/ui/class-names';
import { Button, Input, Textarea } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import {
  ActionButton,
  Field,
  INPUT_BASE_CLASSES,
  MediaField,
  SectionCard,
  TEXTAREA_BASE_CLASSES,
} from './account-edit-primitives';

function SurfaceMediaForm({
  form,
  formId,
  formRef,
  handleAccountSubmit,
  handleChange,
  handleClearMedia,
  handleMediaUpload,
  avatarPreview,
  bannerPreview,
  heroDisplayName,
  isAnyMediaUploading,
  isSaving,
  mediaUploadState,
}) {
  const [localAvatarUrl, setLocalAvatarUrl] = useState(
    () => form?.avatarUrl || avatarPreview || '',
  );
  const [localBannerUrl, setLocalBannerUrl] = useState(
    () => form?.bannerUrl || bannerPreview || '',
  );
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleAvatarChange = (value) => {
    setLocalAvatarUrl(value);
    handleChange?.('avatarUrl', value);
  };

  const handleBannerChange = (value) => {
    setLocalBannerUrl(value);
    handleChange?.('bannerUrl', value);
  };

  const uploadFile = async (target, file) => {
    if (!file) return;
    const isAvatar = target === 'avatar';
    if (isAvatar) {
      setIsAvatarUploading(true);
    } else {
      setIsBannerUploading(true);
    }

    let localBlobUrl = null;
    try {
      localBlobUrl = URL.createObjectURL(file);
      if (isAvatar) {
        setLocalAvatarUrl(localBlobUrl);
        handleChange?.('avatarUrl', localBlobUrl);
      } else {
        setLocalBannerUrl(localBlobUrl);
        handleChange?.('bannerUrl', localBlobUrl);
      }
    } catch {}

    try {
      const uploadedUrl = await handleMediaUpload?.(target, file);
      if (uploadedUrl) {
        if (isAvatar) {
          setLocalAvatarUrl(uploadedUrl);
          handleChange?.('avatarUrl', uploadedUrl);
        } else {
          setLocalBannerUrl(uploadedUrl);
          handleChange?.('bannerUrl', uploadedUrl);
        }
      }
    } finally {
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
      if (isAvatar) {
        setIsAvatarUploading(false);
      } else {
        setIsBannerUploading(false);
      }
    }
  };

  const onClear = (target) => {
    if (target === 'avatar') {
      setLocalAvatarUrl('');
      handleChange?.('avatarUrl', '');
      handleClearMedia?.('avatar');
    } else {
      setLocalBannerUrl('');
      handleChange?.('bannerUrl', '');
      handleClearMedia?.('logo');
    }
  };

  const hasAvatar = Boolean(localAvatarUrl && localAvatarUrl.trim());
  const hasBanner = Boolean(localBannerUrl && localBannerUrl.trim());

  const isAvatarBusy = isAvatarUploading || Boolean(mediaUploadState?.avatar);
  const isBannerBusy = isBannerUploading || Boolean(mediaUploadState?.banner);
  const isMediaDisabled = isSaving || isAnyMediaUploading || isAvatarBusy || isBannerBusy;

  return (
    <form id={formId} ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col gap-2.5">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          await uploadFile('avatar', file);
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          await uploadFile('banner', file);
        }}
      />

      <div className="flex flex-col sm:flex-row gap-2.5 w-full">
        {/* Avatar Card */}
        <div className="flex flex-1 flex-col gap-3 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">Avatar</span>
          </div>

          <div className="flex h-28 w-full items-center justify-center">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-[20px] bg-black/60 ring-1 ring-inset ring-white/10">
              {hasAvatar ? (
                <AdaptiveImage
                  key={localAvatarUrl}
                  mode="img"
                  src={localAvatarUrl}
                  alt={`${heroDisplayName} avatar`}
                  decoding="async"
                  className="h-full w-full object-cover"
                  wrapperClassName="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/50">
                  <Icon icon="solar:user-circle-bold" size={32} />
                </div>
              )}
            </div>
          </div>

          <Input
            value={localAvatarUrl}
            onChange={(event) => handleAvatarChange(event.target.value)}
            placeholder="Avatar URL"
            aria-label="Avatar URL"
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isMediaDisabled}
              onClick={() => avatarInputRef.current?.click()}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <Icon
                icon={isAvatarBusy ? 'solar:refresh-bold' : 'solar:upload-bold'}
                size={14}
                className={isAvatarBusy ? 'animate-spin' : ''}
              />
              <span>{isAvatarBusy ? 'Uploading' : 'Upload'}</span>
            </Button>
            {hasAvatar ? (
              <Button
                type="button"
                disabled={isMediaDisabled}
                onClick={() => onClear('avatar')}
                className="h-10 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-xs font-semibold text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {/* Banner Card */}
        <div className="flex flex-1 flex-col gap-3 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">Banner</span>
          </div>

          <div className="flex h-28 w-full items-center justify-center">
            <div className="relative h-28 w-full overflow-hidden rounded-[20px] bg-black/60 ring-1 ring-inset ring-white/10">
              {hasBanner ? (
                <AdaptiveImage
                  key={localBannerUrl}
                  mode="img"
                  src={localBannerUrl}
                  alt={`${heroDisplayName} banner`}
                  decoding="async"
                  className="h-full w-full object-cover"
                  wrapperClassName="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/50">
                  <Icon icon="solar:gallery-bold" size={32} />
                </div>
              )}
            </div>
          </div>

          <Input
            value={localBannerUrl}
            onChange={(event) => handleBannerChange(event.target.value)}
            placeholder="Banner URL"
            aria-label="Banner URL"
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isMediaDisabled}
              onClick={() => bannerInputRef.current?.click()}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <Icon
                icon={isBannerBusy ? 'solar:refresh-bold' : 'solar:upload-bold'}
                size={14}
                className={isBannerBusy ? 'animate-spin' : ''}
              />
              <span>{isBannerBusy ? 'Uploading' : 'Upload'}</span>
            </Button>
            {hasBanner ? (
              <Button
                type="button"
                disabled={isMediaDisabled}
                onClick={() => onClear('banner')}
                className="h-10 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-xs font-semibold text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function SurfaceProfileInfoForm({
  form,
  formId,
  formRef,
  handleAccountSubmit,
  handleChange,
}) {
  const [localForm, setLocalForm] = useState(() => ({
    displayName: form?.displayName || '',
    username: form?.username || '',
    description: form?.description || '',
    isPrivate: Boolean(form?.isPrivate),
  }));

  const handleFieldChange = (field, value) => {
    setLocalForm((prev) => ({ ...prev, [field]: value }));
    handleChange?.(field, value);
  };

  return (
    <form id={formId} ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Input
          value={localForm.displayName}
          onChange={(event) => handleFieldChange('displayName', event.target.value)}
          placeholder="Display Name"
          aria-label="Display Name"
          className={INPUT_BASE_CLASSES}
        />
        <Input
          value={localForm.username}
          onChange={(event) => handleFieldChange('username', event.target.value)}
          placeholder="Username"
          aria-label="Username"
          spellCheck={false}
          className={INPUT_BASE_CLASSES}
        />
      </div>

      <Textarea
        aria-label="Bio"
        value={localForm.description}
        onChange={(event) => handleFieldChange('description', event.target.value)}
        placeholder="Bio"
        rows={4}
        className={TEXTAREA_BASE_CLASSES}
      />

      <Button
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 transition-colors hover:bg-white/10"
        onClick={() => handleFieldChange('isPrivate', !localForm.isPrivate)}
      >
        <span className="text-sm font-medium text-white">
          {localForm.isPrivate ? 'Private profile' : 'Public profile'}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset transition-colors',
            localForm.isPrivate ? 'bg-white/15 ring-white/15' : 'bg-black/60 ring-white/10',
          )}
        >
          <span
            className={cn(
              'size-5 rounded-full transition-transform duration-200 ease-in-out',
              localForm.isPrivate
                ? 'translate-x-5 bg-white shadow-sm'
                : 'translate-x-0 bg-white/50',
            )}
          />
        </span>
      </Button>
    </form>
  );
}

export function AccountProfileSettingsForm({
  form,
  formId,
  formRef,
  handleAccountSubmit,
  handleChange,
  handleClearMedia,
  handleMediaUpload,
  handleOpenMediaUpload,
  avatarPreview,
  bannerPreview,
  heroDisplayName,
  isAnyMediaUploading,
  isSaving,
  mediaUploadState,
  section = 'profile',
  variant = 'default',
}) {
  if (variant === 'surface') {
    if (section === 'avatar-banner') {
      return (
        <SurfaceMediaForm
          form={form}
          formId={formId}
          formRef={formRef}
          handleAccountSubmit={handleAccountSubmit}
          handleChange={handleChange}
          handleClearMedia={handleClearMedia}
          handleMediaUpload={handleMediaUpload}
          handleOpenMediaUpload={handleOpenMediaUpload}
          avatarPreview={avatarPreview}
          bannerPreview={bannerPreview}
          heroDisplayName={heroDisplayName}
          isAnyMediaUploading={isAnyMediaUploading}
          isSaving={isSaving}
          mediaUploadState={mediaUploadState}
        />
      );
    }

    return (
      <SurfaceProfileInfoForm
        form={form}
        formId={formId}
        formRef={formRef}
        handleAccountSubmit={handleAccountSubmit}
        handleChange={handleChange}
      />
    );
  }
  return (
    <form id={formId} ref={formRef} onSubmit={handleAccountSubmit} className="flex flex-col gap-2.5">
      <SectionCard title="Identity" variant={variant}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Display Name">
            <Input
              value={form.displayName}
              onChange={(event) => handleChange('displayName', event.target.value)}
              placeholder="Your name"
              className={INPUT_BASE_CLASSES}
            />
          </Field>

          <Field label="Username">
            <Input
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="username"
              spellCheck={false}
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        </div>

        <Textarea
          aria-label="Bio"
          value={form.description}
          onChange={(event) => handleChange('description', event.target.value)}
          placeholder="Write something about yourself"
          rows={6}
          className={TEXTAREA_BASE_CLASSES}
        />
      </SectionCard>

      <SectionCard title="Avatar & Logo" variant={variant}>
        <MediaField
          fieldLabel="Avatar URL"
          value={form.avatarUrl}
          preview={avatarPreview}
          previewAlt={`${heroDisplayName} avatar preview`}
          previewClassName="aspect-square"
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
          previewClassName="aspect-[16/7]"
          isUploading={Boolean(mediaUploadState?.banner)}
          isDisabled={isSaving || isAnyMediaUploading}
          onChange={(value) => handleChange('bannerUrl', value)}
          onClear={() => handleClearMedia('logo')}
          onOpenUpload={() => handleOpenMediaUpload('banner')}
        />
      </SectionCard>

      <SectionCard title="Privacy" variant={variant}>
        <Button
          type="button"
          className="flex w-full items-center justify-between gap-2.5 rounded-xl bg-white/5 p-2.5 text-left ring-1 ring-white/5 transition-colors ring-inset hover:bg-white/10 hover:ring-white/10"
          onClick={() => handleChange('isPrivate', !form.isPrivate)}
        >
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="text-sm font-medium text-white">
              {form.isPrivate ? 'Private profile' : 'Public profile'}
            </span>
            <span className="text-xs leading-5 text-white/50">
              {form.isPrivate
                ? 'Only approved followers can inspect your collections'
                : 'Anyone can inspect your collections and profile activity'}
            </span>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              'flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset transition-colors',
              form.isPrivate ? 'bg-white/15 ring-white/15' : 'bg-black/60 ring-white/10',
            )}
          >
            <span
              className={cn(
                'size-5 rounded-full transition-transform duration-200 ease-in-out',
                form.isPrivate ? 'translate-x-5 bg-white shadow-sm' : 'translate-x-0 bg-white/50',
              )}
            />
          </span>
        </Button>
      </SectionCard>
    </form>
  );
}
