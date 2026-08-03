'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif';

export function createFileUploadSurfaceEntry(data = {}, config = {}) {
  const title = data?.title || 'Upload media';
  const description = data?.description || 'Drag and drop a file here, or pick one from your device';

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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.24, 1] }}
      whileHover={{ scale: 1.008 }}
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
        'group flex min-h-[232px] rounded-[16px] w-full cursor-pointer flex-col items-center justify-center gap-4 border px-6 py-8 text-center transition-colors duration-300 ease-out',
        isDragActive
          ? 'border-info/30 bg-info/10'
          : 'bg-primary border-transparent hover:border-black/10',
      )}
    >
      <motion.div
        whileHover={{ scale: 1.15, rotate: -4 }}
        transition={{ type: 'spring', stiffness: 350, damping: 18 }}
        className={cn(
          'center size-14 rounded-2xl border transition-colors duration-300 ease-out',
          isDragActive
            ? 'border-info/20 bg-info/10 text-info'
            : 'border-black/5 bg-black/5 text-black/70',
        )}
      >
        <Icon icon="solar:cloud-upload-bold" size={24} />
      </motion.div>
      <div className="space-y-1 px-4">
        <p className="text-base font-semibold tracking-tight text-black">
          Click to upload or drag and drop
        </p>
        <p className="text-xs leading-relaxed text-black/50">{hint}</p>
      </div>
      <div className="p-1 overflow-visible">
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className={cn(
            'inline-flex h-9 rounded-xl items-center justify-center border px-4 text-xs font-bold tracking-wider uppercase transition-colors duration-300 ease-out',
            isDragActive
              ? 'border-info/20 bg-info/10 text-info hover:bg-info/20'
              : 'hover:bg-primary border-black/5 bg-black/5 hover:border-black/10',
          )}
        > 
          {buttonLabel}
        </motion.button>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInputChange}
      />
    </motion.div>
  );
}
