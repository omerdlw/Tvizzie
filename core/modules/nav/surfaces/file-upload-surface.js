'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/core/utils';
import { Description, Icon as BadgeIcon, Title } from '@/core/modules/nav/elements';
import {
  NAV_ACTION_SPRING,
  NAV_CONTENT_TRANSITION,
  NAV_SURFACE_ITEM_SPRING,
  NAV_SURFACE_SPRING,
} from '@/core/modules/nav/motion';
import Icon from '@/ui/icon';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif';

function dismissSurface(close) {
  if (typeof close === 'function') {
    close({
      success: false,
      cancelled: true,
    });
  }
}

function SurfaceHeader({ icon, title, description }) {
  return (
    <div className="relative flex h-auto w-full items-center space-x-2">
      <div className="center relative">
        <BadgeIcon icon={icon} />
      </div>

      <div className="relative flex w-full flex-1 items-center justify-between gap-2 overflow-hidden">
        <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
          <Title text={title} style={{ className: '!normal-case !truncate' }} />
          {description ? <Description text={description} maxLines={2} /> : null}
        </div>
      </div>
    </div>
  );
}

export default function FileUploadSurface({ close, data }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const title = data?.title || 'Upload media';
  const description = data?.description || 'Drag and drop a file here, or pick one from your device';
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
    [close, target]
  );

  const handleInputChange = useCallback(
    (event) => {
      const file = event.target.files?.[0] || null;
      event.target.value = '';
      handleFileSelection(file);
    },
    [handleFileSelection]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);

      const file = event.dataTransfer?.files?.[0] || null;
      handleFileSelection(file);
    },
    [handleFileSelection]
  );

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-upload-surface-title"
      className="relative flex flex-col gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={NAV_SURFACE_SPRING}
    >
      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          dismissSurface(close);
        }}
        className="center bg-primary absolute top-0 right-0 z-10 cursor-pointer border border-black/10 p-1 transition-all"
        aria-label="Close media upload"
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        transition={NAV_ACTION_SPRING}
      >
        <Icon icon="material-symbols:close-rounded" size={20} />
      </motion.button>

      <SurfaceHeader icon="solar:upload-bold" title={title} description={description} />

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
        className={cn(
          'flex min-h-[232px] w-full cursor-pointer flex-col items-center justify-center gap-3 border px-6 py-8 text-center transition-colors',
          isDragActive ? 'border-info bg-info/20' : 'bg-primary border-black/10 hover:bg-transparent'
        )}
        animate={isDragActive ? { scale: 1.01 } : { scale: 1 }}
        transition={NAV_SURFACE_ITEM_SPRING}
      >
        <motion.div
          className="center size-14 border border-black/10 bg-white text-black/70"
          animate={isDragActive ? { scale: 1.06, y: -2 } : { scale: 1, y: 0 }}
          transition={NAV_SURFACE_ITEM_SPRING}
        >
          <Icon icon="solar:cloud-upload-bold" size={24} />
        </motion.div>

        <motion.div className="space-y-1" layout="position" transition={NAV_CONTENT_TRANSITION}>
          <p className="text-base font-semibold text-black">Click to upload or drag and drop</p>
          <p className="text-xs leading-5 text-black/50">{hint}</p>
        </motion.div>

        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="hover:text-primary inline-flex h-10 items-center justify-center border border-black/5 bg-white px-4 text-[11px] font-semibold text-black uppercase transition-colors hover:bg-black"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          transition={NAV_ACTION_SPRING}
        >
          {buttonLabel}
        </motion.button>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleInputChange}
        />
      </motion.div>
    </motion.section>
  );
}
