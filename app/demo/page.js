'use client';

import { useState, useEffect } from 'react';

import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { useRegistry } from '@/modules/registry';
import { useSelectionHud } from '@/domains/shell/navigation/huds/selection-hud';
import { useProgressHud } from '@/domains/shell/navigation/huds/progress-hud';
import { useContextActionHud } from '@/domains/shell/navigation/huds/context-action-hud';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';

const VIDEO_SOURCE = '/video.mp4';
const VIDEO_TITLE = 'Featured Video Preview';
const VIDEO_SUBTITLE = 'Ultra HD • Fullscreen Experience';

export default function MediaDemoPage() {
  const [activeHudMode, setActiveHudMode] = useState(null); // 'selection' | 'progress' | 'actions' | null
  const [progressValue, setProgressValue] = useState(0);

  const { isPlaying, videoOptions } = useBackgroundState();
  const { toggleVideo, toggleMute } = useBackgroundActions();
  const isMuted = Boolean(videoOptions?.muted);

  // Register background video and nav dock metadata
  useRegistry({
    background: {
      video: VIDEO_SOURCE,
      isPlaying: true,
      rightGradient: 6,
      leftGradient: 6,
      overlay: true,
      overlayOpacity: 0.6,
      videoOptions: {
        muted: false,
        loop: false,
        autoplay: false,
      },
    },
    nav: {
      path: '/demo',
      title: VIDEO_TITLE,
      description: VIDEO_SUBTITLE,
      icon: 'solar:clapperboard-play-bold',
    },
  });

  // Simulated Task Progress Loop
  useEffect(() => {
    if (activeHudMode !== 'progress') {
      setProgressValue(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setActiveHudMode(null), 1200);
          return 100;
        }
        return prev + 15;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [activeHudMode]);

  // 1. Selection HUD Preset
  useSelectionHud({
    isActive: activeHudMode === 'selection',
    count: 3,
    title: '3 items selected',
    actions: [
      {
        key: 'select-all',
        label: 'Select All',
        icon: 'solar:check-read-linear',
        onClick: () => console.log('Select all clicked'),
      },
      {
        key: 'bulk-delete',
        label: 'Delete',
        icon: 'solar:trash-bin-trash-bold',
        isDestructive: true,
        onClick: () => setActiveHudMode(null),
      },
    ],
    onCancel: () => setActiveHudMode(null),
  });

  // 2. Task Progress HUD Preset
  useProgressHud({
    isActive: activeHudMode === 'progress',
    title: progressValue >= 100 ? 'Sync Complete!' : 'Syncing Watchlist...',
    description: progressValue >= 100 ? 'All 14 items updated' : `${progressValue}% processed`,
    progress: progressValue,
    icon: progressValue >= 100 ? 'solar:check-circle-bold' : 'solar:cloud-upload-bold',
    onCancel: () => setActiveHudMode(null),
  });

  // 3. Context Action Tray HUD Preset
  useContextActionHud({
    isActive: activeHudMode === 'actions',
    title: 'Quick Filter Presets',
    description: 'Apply view mode to page',
    icon: 'solar:tuning-2-bold',
    actions: [
      {
        key: 'filter-all',
        label: 'All Media',
        onClick: () => setActiveHudMode(null),
      },
      {
        key: 'filter-movies',
        label: 'Movies Only',
        onClick: () => setActiveHudMode(null),
      },
      {
        key: 'filter-series',
        label: 'Series Only',
        onClick: () => setActiveHudMode(null),
      },
    ],
    onCancel: () => setActiveHudMode(null),
  });

  return (
    <main className="pointer-events-none relative flex min-h-screen w-full flex-col justify-between p-6 sm:p-10">
      <div className="pointer-events-auto flex flex-wrap w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3 rounded-full ring-1 ring-inset ring-white/10 bg-black/50 px-4 py-2 backdrop-blur-xl">
          <div className="size-2 flex animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-white">
            {VIDEO_TITLE}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
            4K
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setActiveHudMode((prev) => (prev === 'selection' ? null : 'selection'))}
            className={cn(
              'flex h-10 items-center gap-2 rounded-full ring-1 ring-inset px-4 text-xs font-medium backdrop-blur-xl transition-all',
              activeHudMode === 'selection'
                ? 'ring-white/20 bg-white/20 text-white'
                : 'ring-white/10 bg-black/50 text-white/70 hover:ring-white/20 hover:bg-black/80 hover:text-white',
            )}
          >
            <Icon icon="solar:check-square-bold" size={16} />
            <span>Selection HUD</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveHudMode((prev) => (prev === 'progress' ? null : 'progress'))}
            className={cn(
              'flex h-10 items-center gap-2 rounded-full ring-1 ring-inset px-4 text-xs font-medium backdrop-blur-xl transition-all',
              activeHudMode === 'progress'
                ? 'ring-white/20 bg-white/20 text-white'
                : 'ring-white/10 bg-black/50 text-white/70 hover:ring-white/20 hover:bg-black/80 hover:text-white',
            )}
          >
            <Icon icon="solar:cloud-upload-bold" size={16} />
            <span>Progress HUD</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveHudMode((prev) => (prev === 'actions' ? null : 'actions'))}
            className={cn(
              'flex h-10 items-center gap-2 rounded-full ring-1 ring-inset px-4 text-xs font-medium backdrop-blur-xl transition-all',
              activeHudMode === 'actions'
                ? 'ring-white/20 bg-white/20 text-white'
                : 'ring-white/10 bg-black/50 text-white/70 hover:ring-white/20 hover:bg-black/80 hover:text-white',
            )}
          >
            <Icon icon="solar:tuning-2-bold" size={16} />
            <span>Actions HUD</span>
          </Button>

          <Button
            type="button"
            onClick={toggleVideo}
            className="size-10 flex items-center justify-center rounded-full ring-1 ring-inset ring-white/10 bg-black/50 text-white backdrop-blur-xl transition-all hover:ring-white/20 hover:bg-black/80"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            <Icon
              icon={isPlaying ? 'solar:pause-bold' : 'solar:play-bold'}
              size={18}
            />
          </Button>

          <Button
            type="button"
            onClick={toggleMute}
            className="size-10 flex items-center justify-center rounded-full ring-1 ring-inset ring-white/10 bg-black/50 text-white backdrop-blur-xl transition-all hover:ring-white/20 hover:bg-black/80"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            <Icon
              icon={isMuted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'}
              size={18}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-1" />

      <div className="h-20" />
    </main>
  );
}
