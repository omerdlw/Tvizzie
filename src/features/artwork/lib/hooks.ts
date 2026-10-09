"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  useContextMenu,
  type ContextMenuContextValue,
} from "@omerdlw/base-framework/modules/context-menu";
import { isTmdbImagePath } from "@/infrastructure/tmdb/images";
import { artworkKey, resolveArtwork } from "./entries";
import { artworkStore } from "./store";
import type { ArtworkKind, ArtworkSlot } from "./types";

const subscribe = artworkStore.subscribe;
const getSnapshot = artworkStore.getSnapshot;

export function useArtworkPath(
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  fallback: string | null,
): string | null {
  const chosen = useSyncExternalStore(
    subscribe,
    () => getSnapshot()[artworkKey(kind, id)]?.[slot] ?? null,
    () => null,
  );
  return chosen ?? fallback;
}

export function artworkTarget(slot: ArtworkSlot, path: string | null) {
  return path
    ? { "data-artwork": slot, "data-artwork-path": path }
    : ({} as Record<string, never>);
}

interface MenuPayload {
  path: string;
  slot: ArtworkSlot;
}

const TARGET = "[data-artwork]";

const LABELS: Record<
  ArtworkSlot,
  { icon: string; restore: string; set: string }
> = {
  backdrop: {
    icon: "solar:gallery-edit-bold",
    restore: "Restore default background",
    set: "Set as background",
  },
  poster: {
    icon: "solar:sidebar-code-bold",
    restore: "Restore default poster",
    set: "Set as poster",
  },
};

interface ArtworkContextMenuOptions {
  defaults: Record<ArtworkSlot, string | null>;
  id: number;
  kind: ArtworkKind;
}

export function useArtworkContextMenu({
  defaults,
  id,
  kind,
}: ArtworkContextMenuOptions): void {
  const { backdrop: defaultBackdrop, poster: defaultPoster } = defaults;

  const config = useMemo(() => {
    const payloadOf = (context: ContextMenuContextValue) =>
      context.payload as MenuPayload | null | undefined;

    return {
      id: `artwork:${kind}:${id}`,
      target: TARGET,
      priority: 10,
      resolvePayload: (event: MouseEvent): MenuPayload | null => {
        const element = (event.target as Element | null)?.closest<HTMLElement>(
          TARGET,
        );
        const slot = element?.dataset.artwork;
        const path = element?.dataset.artworkPath;
        return (slot === "poster" || slot === "backdrop") &&
          isTmdbImagePath(path)
          ? { path, slot }
          : null;
      },
      items: (context: ContextMenuContextValue) => {
        const payload = payloadOf(context);
        if (!payload) return [];
        const { path, slot } = payload;
        const fallback = slot === "poster" ? defaultPoster : defaultBackdrop;
        const showing = resolveArtwork(getSnapshot(), kind, id, slot, fallback);
        const labels = LABELS[slot];

        return [
          {
            key: `set-${slot}`,
            hidden: path === showing,
            icon: labels.icon,
            label: labels.set,
            onSelect: () => artworkStore.set(kind, id, slot, path),
          },
          {
            key: `restore-${slot}`,
            hidden: getSnapshot()[artworkKey(kind, id)]?.[slot] === undefined,
            icon: "solar:restart-bold",
            label: labels.restore,
            onSelect: () => artworkStore.clear(kind, id, slot),
          },
        ];
      },
    };
  }, [defaultBackdrop, defaultPoster, id, kind]);

  useContextMenu(config);
}
