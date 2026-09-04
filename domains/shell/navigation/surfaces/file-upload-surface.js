'use client';

import { motion } from 'motion/react';
import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/ui/class-names';
import { Button, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

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
    <motion.div
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
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={cn(
        'group flex min-h-[232px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[20px] px-6 py-8 text-center ring-1 transition-all duration-300 ease-in-out ring-inset',
        isDragActive
          ? 'ring-info/30 bg-info/10'
          : 'bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:ring-white/10',
      )}
    >
      <div
        className={cn(
          'center size-14 rounded-[20px] ring-1 transition-all duration-300 ease-in-out ring-inset',
          isDragActive
            ? 'ring-info/20 bg-info/10 text-info'
            : 'bg-white/5 text-white/70 ring-white/5',
        )}
      >
        <Icon icon="solar:cloud-upload-bold" size={24} />
      </div>
      <div className="space-y-1 px-4">
        <p className="text-base font-semibold text-white">Click to upload or drag and drop</p>
        <p className="text-xs leading-relaxed text-white/50">{hint}</p>
      </div>
      <div className="overflow-visible p-1">
        <Button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className={cn(
            'inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-bold uppercase ring-1 ring-inset',
            isDragActive
              ? 'ring-info/20 bg-info/10 text-info hover:bg-info/20'
              : 'bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10',
          )}
        >
          {buttonLabel}
        </Button>
      </div>
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        classNames={{ wrapper: 'sr-only' }}
        onChange={handleInputChange}
      />
    </motion.div>
  );
}
