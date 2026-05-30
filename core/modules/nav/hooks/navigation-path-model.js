import React from 'react';

export function normalizePath(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/, '');
}

export function isSamePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

export function isPathPrefix(candidatePath, pathname) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);

  if (!normalizedCandidate || !normalizedPathname) {
    return false;
  }

  if (normalizedCandidate === normalizedPathname) {
    return true;
  }

  if (normalizedCandidate === '/') {
    return normalizedPathname.startsWith('/');
  }

  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

export function toSearchableText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toSearchableText).join(' ');
  }

  if (React.isValidElement(value)) {
    return toSearchableText(value.props?.children);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(toSearchableText).join(' ');
  }

  return '';
}
