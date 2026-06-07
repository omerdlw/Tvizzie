'use client';

import { useCallback, useId, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import {
  getNavDragIconMotion,
  getNavDragSurfaceMotion,
  NAV_BUTTON_INTERACTION_MOTION,
  NAV_CONTENT_TRANSITION,
  NAV_SURFACE_ITEM_SPRING,
} from '@/core/modules/motion';
import { useSurfaceHeader } from './surface-shell';
import Icon from 'ui/icon';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif';

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

  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: 'solar:upload-bold',
        title,
        description,
        trailing: null,
      });
    }
  }, [setHeader, title, description]);

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
        'flex min-h-[232px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[14px] border px-6 py-8 text-center transition-all duration-200',
        isDragActive
          ? 'border-info/30 bg-info/10'
          : 'bg-primary/50 hover:bg-primary/70 border-dashed border-black/5 hover:border-black/10'
      )}
    >
      <motion.div
        className={cn(
          'center size-14 rounded-full border transition-colors',
          isDragActive ? 'border-info/20 bg-info/10 text-info' : 'border-black/5 bg-black/5 text-black/70'
        )}
        animate={getNavDragIconMotion(isDragActive)}
        transition={NAV_SURFACE_ITEM_SPRING}
      >
        <Icon icon="solar:cloud-upload-bold" size={24} />
      </motion.div>

      <motion.div className="space-y-1 px-4" layout="position" transition={NAV_CONTENT_TRANSITION}>
        <p className="text-sm font-semibold tracking-tight text-black sm:text-base">Click to upload or drag and drop</p>
        <p className="text-xs leading-relaxed text-black/50">{hint}</p>
      </motion.div>

      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        className={cn(
          'inline-flex h-9 items-center justify-center rounded-[14px] border px-4 text-xs font-bold tracking-wider uppercase transition-all duration-200',
          isDragActive
            ? 'border-info/20 bg-info/10 text-info hover:bg-info/20'
            : 'hover:bg-primary border-black/5 bg-black/5 text-black shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-black/10'
        )}
        {...NAV_BUTTON_INTERACTION_MOTION}
      >
        {buttonLabel}
      </motion.button>

      <input ref={inputRef} id={inputId} type="file" accept={accept} className="sr-only" onChange={handleInputChange} />
    </motion.div>
  );
}
