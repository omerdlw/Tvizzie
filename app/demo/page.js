'use client';

import { useState, useEffect } from 'react';

import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { usePageRegistry } from '@/modules/registry';
import { useSelectionHud } from '@/domains/shell/navigation/huds/selection-hud';
import { useProgressHud } from '@/domains/shell/navigation/huds/progress-hud';
import { useContextActionHud } from '@/domains/shell/navigation/huds/context-action-hud';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';

const VIDEO_SOURCE = '/video.mp4';
const VIDEO_TITLE = 'Featured Video Preview';
const VIDEO_SUBTITLE = 'Ultra HD • Fullscreen Experience';

const WIDTH_OPTIONS = [
  { label: 'Full (100%)', value: '100%' },
  { label: '85%', value: '85%' },
  { label: '70%', value: '70%' },
  { label: '1200px', value: '1200px' },
];

const CSS_OPTIONS = [
  { label: 'bg-center bg-contain', value: 'bg-center bg-contain' },
  { label: 'bg-center bg-cover', value: 'bg-center bg-cover' },
  { label: 'object-contain', value: 'object-contain' },
  { label: 'object-cover', value: 'object-cover' },
];

const FADE_OPTIONS = [
  { label: 'Deep (32%)', value: 32 },
  { label: 'Smooth (24%)', value: 24 },
  { label: 'Subtle (15%)', value: 15 },
  { label: 'Off', value: false },
];

export default function MediaDemoPage() {
  const [activeHudMode, setActiveHudMode] = useState(null); // 'selection' | 'progress' | 'actions' | null
  const [progressValue, setProgressValue] = useState(0);
  const [selectedWidth, setSelectedWidth] = useState('85%');
  const [selectedCss, setSelectedCss] = useState('bg-center bg-cover');
  const [selectedFade, setSelectedFade] = useState(50);

  const { isPlaying, videoOptions } = useBackgroundState();
  const { toggleVideo, toggleMute } = useBackgroundActions();
  const isMuted = Boolean(videoOptions?.muted);

  // Register background video and nav dock metadata
  usePageRegistry({
    background: {
      video: VIDEO_SOURCE,
      width: selectedWidth,
      videoClassName: selectedCss,
      leftGradient: 5,
      rightGradient: 5,
      isPlaying: true,
      overlay: true,
      overlayOpacity: 0.2,
      noiseStyle: {
        opacity: 0.5,
      },
      videoOptions: {
        muted: false,
        loop: false,
        autoplay: true,
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

  return <></>;
}
