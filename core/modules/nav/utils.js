import React from 'react';

const SECTION_KEYS = ['card', 'icon', 'title', 'description'];

function isObjectLike(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toObject(value) {
  return isObjectLike(value) ? value : {};
}

function getLegacyCardStyle(style) {
  const legacyCardStyle = {};

  if (style?.background) legacyCardStyle.background = style.background;
  if (style?.borderColor) legacyCardStyle.borderColor = style.borderColor;

  return legacyCardStyle;
}

function mergeSection(baseStyle, stateStyle, hoverStyle, section) {
  return {
    ...toObject(baseStyle?.[section]),
    ...toObject(stateStyle?.[section]),
    ...toObject(hoverStyle?.[section]),
  };
}

export function resolveNavVisualStyle(style, { isActive = false, isHovered = false } = {}) {
  const baseStyle = toObject(style);
  const stateStyle = isActive ? toObject(baseStyle.active) : toObject(baseStyle.inactive);
  const hoverStyle = isHovered ? toObject(baseStyle.hover) : {};

  const sections = SECTION_KEYS.reduce(
    (acc, section) => {
      acc[section] = mergeSection(baseStyle, stateStyle, hoverStyle, section);
      return acc;
    },
    {
      card: {},
      icon: {},
      title: {},
      description: {},
    },
  );

  sections.card = {
    ...getLegacyCardStyle(baseStyle),
    ...sections.card,
  };

  return {
    ...sections,
    scale: stateStyle?.card?.scale ?? hoverStyle?.card?.scale ?? baseStyle?.scale,
  };
}






export function getNavStackClassName() {
  return 'fixed bottom-1 left-1/2 h-auto w-full -translate-x-1/2 touch-manipulation select-none';
}

export function getItemKey(link, index = 0) {
  const pathPart = String(link?.path || '').trim() || 'no-path';
  const namePart = String(link?.name || '').trim() || 'no-name';
  const typePart = String(link?.type || '').trim() || 'no-type';
  const surfacePart = link?.isSurface ? `surface::${link?.id || link?.surfaceTitle || 'open'}` : 'base';

  return `${pathPart}::${namePart}::${typePart}::${surfacePart}:${index}`;
}

export function getIsItemActive(link, activeItem) {
  return (link.path || link.name) === (activeItem?.path || activeItem?.name);
}

export function getItemPosition(index) {
  return index;
}

export function shouldSyncStackHover(pathname, compact) {
  return compact;
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

export function isInlineActionPathMatch(path, pathname) {
  return isSamePath(path, pathname) || (path !== '/' && isPathPrefix(path, pathname));
}

export function shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname) {
  return Boolean(action) && !isLoading && (isOverlay || !path || isInlineActionPathMatch(path, pathname));
}

export function normalizePath(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === '/') return '/';
  return normalized.replace(/\/+$/, '');
}

export function isSamePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

export function isPathPrefix(candidatePath, pathname) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);

  if (!normalizedCandidate || !normalizedPathname) return false;
  if (normalizedCandidate === normalizedPathname) return true;
  if (normalizedCandidate === '/') return normalizedPathname.startsWith('/');
  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

export function toSearchableText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toSearchableText).join(' ');
  if (React.isValidElement(value)) return toSearchableText(value.props?.children);
  if (value && typeof value === 'object') return Object.values(value).map(toSearchableText).join(' ');
  return '';
}
