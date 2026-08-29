'use client';

import { useCallback, useMemo, useState } from 'react';

import { uploadAccountMediaFile } from '@/domains/account/client/profile';
import { useProgressHud } from '@/domains/shell/navigation/huds/progress-hud';
import { ACCOUNT_MEDIA_UPLOAD_CONFIG } from '@/domains/account/utils/constants';
import { createFileUploadSurfaceEntry } from '@/domains/shell/navigation/surfaces/file-upload-surface';

function normalizeMediaTarget(target) {
  return String(target || '').toLowerCase() === 'avatar' ? 'avatar' : 'banner';
}

export function useAccountMediaState({ isSaving, openSurface, setForm, toast }) {
  const [mediaUploadState, setMediaUploadState] = useState({
    avatar: null,
    banner: null,
  });

  const activeMediaUpload = useMemo(
    () => mediaUploadState.avatar || mediaUploadState.banner || null,
    [mediaUploadState],
  );
  const isAnyMediaUploading = Boolean(activeMediaUpload);

  useProgressHud({
    id: 'account-media-upload',
    isActive: isAnyMediaUploading,
    title: activeMediaUpload?.target === 'avatar' ? 'Uploading avatar' : 'Uploading banner',
    description: activeMediaUpload?.fileName || 'Preparing image...',
    isIndeterminate: true,
    icon: 'solar:cloud-upload-bold',
  });

  const handleMediaUpload = useCallback(
    async (target, file) => {
      if (!file) return;

      const normalizedTarget = normalizeMediaTarget(target);
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      const label = normalizedTarget === 'avatar' ? 'Avatar' : 'Logo';
      let localBlobUrl = null;
      let previousMediaUrl = '';

      try {
        localBlobUrl = URL.createObjectURL(file);
        setForm((previousForm) => {
          previousMediaUrl = previousForm[field] || '';
          return { ...previousForm, [field]: localBlobUrl };
        });
      } catch {}

      setMediaUploadState((previousState) => ({
        ...previousState,
        [normalizedTarget]: {
          fileName: file?.name || `${label}.image`,
          target: normalizedTarget,
        },
      }));

      try {
        const result = await uploadAccountMediaFile({ file, target: normalizedTarget });
        setForm((previousForm) => ({ ...previousForm, [field]: result.url }));
        return result.url;
      } catch (error) {
        if (localBlobUrl) {
          setForm((previousForm) =>
            previousForm[field] === localBlobUrl
              ? { ...previousForm, [field]: previousMediaUrl }
              : previousForm,
          );
        }
        toast.error(error?.message || `${label} could not be uploaded`);
        return null;
      } finally {
        if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        setMediaUploadState((previousState) => ({
          ...previousState,
          [normalizedTarget]: null,
        }));
      }
    },
    [setForm, toast],
  );

  const handleClearMedia = useCallback(
    (target) => {
      const normalizedTarget = normalizeMediaTarget(target);
      const field = normalizedTarget === 'avatar' ? 'avatarUrl' : 'bannerUrl';
      setForm((previousForm) => ({ ...previousForm, [field]: '' }));
    },
    [setForm],
  );

  const handleOpenMediaUpload = useCallback(
    async (target, onLocalBlob) => {
      if (isSaving || isAnyMediaUploading) return null;

      const normalizedTarget = normalizeMediaTarget(target);
      const selection = await openSurface(
        createFileUploadSurfaceEntry({
          ...ACCOUNT_MEDIA_UPLOAD_CONFIG[normalizedTarget],
          target: normalizedTarget,
        }),
      );

      if (selection?.success && selection?.file) {
        if (typeof onLocalBlob === 'function') {
          try {
            const blobUrl = URL.createObjectURL(selection.file);
            onLocalBlob(blobUrl);
          } catch {}
        }
        return await handleMediaUpload(normalizedTarget, selection.file);
      }
      return null;
    },
    [handleMediaUpload, isAnyMediaUploading, isSaving, openSurface],
  );

  return {
    handleClearMedia,
    handleMediaUpload,
    handleOpenMediaUpload,
    isAnyMediaUploading,
    mediaUploadFileName: activeMediaUpload?.fileName || '',
    mediaUploadState,
  };
}
