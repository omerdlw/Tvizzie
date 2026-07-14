'use client';

function hasCallableHandler(handler) {
  return typeof handler === 'function';
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== 'string') {
    return null;
  }

  const value = filePath.trim();
  return value ? value : null;
}

export function createMovieBackgroundContextMenuItems({
  filePath,
  onSetMovieBackground,
  onResetMovieBackground,
  canResetBackground = true,
} = {}) {
  const resolvedFilePath = normalizeFilePath(filePath);
  const items = [];

  if (resolvedFilePath && hasCallableHandler(onSetMovieBackground)) {
    items.push({
      key: 'set-as-background',
      label: 'Set as background',
      icon: 'solar:gallery-edit-bold',
      onSelect: () => {
        onSetMovieBackground({ filePath: resolvedFilePath });
      },
    });
  }

  if (canResetBackground && hasCallableHandler(onResetMovieBackground)) {
    if (items.length > 0) {
      items.push('separator');
    }

    items.push({
      key: 'reset-background',
      label: 'Restore defaults',
      icon: 'solar:restart-bold',
      onSelect: () => {
        onResetMovieBackground();
      },
    });
  }

  return items;
}

export function createMoviePosterContextMenuItems({
  filePath,
  onSetMoviePoster,
  onResetMoviePoster,
  canResetPoster = true,
} = {}) {
  const resolvedFilePath = normalizeFilePath(filePath);
  const items = [];

  if (resolvedFilePath && hasCallableHandler(onSetMoviePoster)) {
    items.push({
      key: 'set-as-poster',
      label: 'Set as poster',
      icon: 'solar:sidebar-code-bold',
      onSelect: () => {
        onSetMoviePoster({ filePath: resolvedFilePath });
      },
    });
  }

  if (canResetPoster && hasCallableHandler(onResetMoviePoster)) {
    if (items.length > 0) {
      items.push('separator');
    }

    items.push({
      key: 'reset-poster',
      label: 'Restore defaults',
      icon: 'solar:restart-bold',
      onSelect: () => {
        onResetMoviePoster();
      },
    });
  }

  return items;
}
