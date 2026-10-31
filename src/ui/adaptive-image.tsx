"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn, trimToNull } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";

interface AdaptiveImageProps extends Omit<
  ComponentPropsWithoutRef<"img">,
  "src" | "alt"
> {
  alt?: string;
  fallback?: ReactNode;
  fill?: boolean;
  priority?: boolean;
  src?: string | null;
  wrapperClassName?: string;
}

export function AdaptiveImage({
  alt = "",
  className,
  crossOrigin,
  decoding = "async",
  fallback,
  fetchPriority,
  fill,
  loading,
  onError,
  onLoad,
  priority = false,
  src,
  wrapperClassName,
  ...props
}: AdaptiveImageProps) {
  const theme = useTheme(primitivesTheme);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const resolvedSrc = trimToNull(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const corsRefused = refused !== null && refused === resolvedSrc;

  useEffect(() => {
    const image = imageRef.current;
    setHasLoaded(Boolean(image?.complete && image.naturalWidth > 0));
    setHasFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || (hasFailed && fallback)) {
    return fallback ? (
      <div
        className={cn(theme.slots.adaptiveImageFallback, wrapperClassName)}
        suppressHydrationWarning
      >
        {fallback}
      </div>
    ) : null;
  }

  const handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasLoaded(true);
    setHasFailed(false);
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (crossOrigin && !corsRefused) {
      setRefused(resolvedSrc);
      return;
    }
    setHasFailed(true);
    onError?.(event);
  };

  return (
    <div
      className={cn(
        theme.slots.adaptiveImageFrame,
        !hasLoaded && !hasFailed && "skeleton-block",
        wrapperClassName,
      )}
      suppressHydrationWarning
    >
      <img
        ref={imageRef}
        src={resolvedSrc}
        alt={alt}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className={cn(theme.slots.adaptiveImage, className)}
        crossOrigin={corsRefused ? undefined : crossOrigin}
        data-fill={(fill ?? (!props.width && !props.height)) || undefined}
        data-state={hasLoaded ? "loaded" : "loading"}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading || (priority ? "eager" : "lazy")}
        fetchPriority={fetchPriority || (priority ? "high" : undefined)}
        decoding={decoding}
        suppressHydrationWarning
        {...props}
      />
    </div>
  );
}
