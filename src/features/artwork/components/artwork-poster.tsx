"use client";

import { Suspense } from "react";
import { AwardFoil } from "@/features/awards";
import type { Awards } from "@/infrastructure/tmdb/types";
import { Picture } from "@/motion/stage";
import { AdaptiveImage, Icon } from "@/ui";
import { artworkTarget } from "../lib/hooks";

export function ArtworkPoster({
  alt,
  awards,
  className = "w-full shrink-0",
  fallbackIcon,
  frameClassName,
  path,
  src,
}: {
  alt: string;
  awards?: Promise<Awards | null>;
  className?: string;
  fallbackIcon: string;
  frameClassName: string;
  path: string | null;
  src: string | null;
}) {
  return (
    <Picture
      className={className}
      frameClassName={frameClassName}
      light={
        awards
          ? (light) => (
              <Suspense fallback={null}>
                <AwardFoil awards={awards} {...light} />
              </Suspense>
            )
          : undefined
      }
      target={artworkTarget("poster", path)}
    >
      <AdaptiveImage
        alt={alt}
        className="object-cover"
        fallback={
          <div className="center h-full w-full text-white/50 ring-1 ring-white/5 ring-inset">
            <Icon icon={fallbackIcon} size={40} />
          </div>
        }
        fetchPriority="high"
        loading="eager"
        sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 320px"
        src={src}
      />
    </Picture>
  );
}
