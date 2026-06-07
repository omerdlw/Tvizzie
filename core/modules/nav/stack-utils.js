export function getNavStackClassName({ isFullscreenStateActive }) {
  const baseClassName =
    'fixed right-2 bottom-0 left-2 h-auto touch-manipulation select-none transition-opacity duration-200 sm:right-auto sm:bottom-1 sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2';

  if (isFullscreenStateActive) {
    return `${baseClassName} pointer-events-none opacity-0`;
  }

  return `${baseClassName} opacity-100`;
}

export function getItemKey(link, index) {
  const pathPart = String(link?.path || '').trim() || 'no-path';
  const namePart = String(link?.name || '').trim() || 'no-name';
  const typePart = String(link?.type || '').trim() || 'no-type';

  return `${pathPart}::${namePart}::${typePart}`;
}

export function getIsItemActive(link, activeItem) {
  return (link.path || link.name) === (activeItem?.path || activeItem?.name);
}

export function getItemPosition(index) {
  return index;
}

export function shouldSyncStackHover(pathname, compact) {
  return pathname !== '/' || compact;
}

export function canPreviewStackOnTopHover(compact, expanded) {
  return !(compact && !expanded);
}

export function getActiveItemLayoutKey(activeItem) {
  if (!activeItem) return 'none';

  const pathPart = String(activeItem.path || '').trim() || 'no-path';
  const namePart = String(activeItem.name || '').trim() || 'no-name';
  const typePart = String(activeItem.type || '').trim() || 'no-type';

  return [
    pathPart,
    namePart,
    typePart,
    activeItem.isLoading ? 'loading' : 'ready',
    activeItem.isOverlay ? 'overlay' : 'base',
    activeItem.isSurface ? 'surface' : 'content',
    activeItem.action ? 'action' : 'no-action',
  ].join('::');
}
