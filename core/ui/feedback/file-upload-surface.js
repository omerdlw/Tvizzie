'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif';

export function createFileUploadSurfaceEntry(data = {}, config = {}) {
  const title = data?.title || 'Upload media';
  const description =
    data?.description || 'Drag and drop a file here, or pick one from your device';

  return {
    component: FileUploadSurface,
    icon: 'solar:upload-bold',
    title,
    description,
    props: { data },
    ...config,
  };
}

export default function FileUploadSurface({ close, data }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const buttonLabel = data?.buttonLabel || 'Select from device';
  const hint = data?.hint || 'PNG, JPG, WEBP, AVIF or GIF';
  const target = data?.target || 'banner';
  const accept = data?.accept || DEFAULT_ACCEPT;

  const handleFileSelection = useCallback(
    (file) => {
      if (!file) {
        return;
      }

      close?.({
        success: true,
        file,
        target,
      });
    },
    [close, target],
  );

  const handleInputChange = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null;
      event.target.value = '';
      handleFileSelection(file);
    },
    [handleFileSelection],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);

      const file = event.dataTransfer?.files?.[0] || null;
      handleFileSelection(file);
    },
    [handleFileSelection],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragActive) {
          setIsDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
      }}
      onDrop={handleDrop}
      className={cn(
        'group flex min-h-[232px] w-full cursor-pointer flex-col items-center justify-center gap-4  border px-6 py-8 text-center',
        isDragActive
          ? 'border-info/30 bg-info/10'
          : 'bg-primary border-transparent hover:border-black/10',
      )}
    >
      <div
        className={cn(
          'center size-14  border',
          isDragActive
            ? 'border-info/20 bg-info/10 text-info'
            : 'border-black/5 bg-black/5 text-black/70',
        )}
      >
        <Icon icon="solar:cloud-upload-bold" size={24} />
      </div>
      <div className="space-y-1 px-4">
        <p className="text-base font-semibold tracking-tight text-black">
          Click to upload or drag and drop
        </p>
        <p className="text-xs leading-relaxed text-black/50">{hint}</p>
      </div>
      <div className="overflow-visible p-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className={cn(
            'inline-flex h-9 items-center justify-center  border px-4 text-xs font-bold tracking-wider uppercase',
            isDragActive
              ? 'border-info/20 bg-info/10 text-info hover:bg-info/20'
              : 'hover:bg-primary border-black/5 bg-black/5 hover:border-black/10',
          )}
        >
          {buttonLabel}
        </button>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
