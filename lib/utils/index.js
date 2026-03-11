import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
  URL: /^https?:\/\/.+/,
}

const DEFAULT_COLOR_FALLBACK = '#000000'
const DEFAULT_RGB = '0, 0, 0'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function isBrowser() {
  return typeof window !== 'undefined'
}

export function isFunction(value) {
  return typeof value === 'function'
}

export function isString(value) {
  return typeof value === 'string'
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  return REGEX_PATTERNS.URL.test(url)
}

function normalizeHex(hex) {
  if (!isString(hex)) return null

  const value = hex.trim().replace('#', '')
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
  }

  if (value.length === 6) return value
  return null
}

function parseRgbString(color) {
  if (!isString(color)) return null

  const trimmed = color.trim()
  if (!/^rgba?\(/i.test(trimmed)) return null

  const channels = trimmed
    .match(/\d+(?:\.\d+)?/g)
    ?.slice(0, 3)
    ?.map((value) => Math.round(Number(value)))

  if (!channels || channels.length < 3) return null

  const [r, g, b] = channels

  if (
    [r, g, b].some(
      (channel) => Number.isNaN(channel) || channel < 0 || channel > 255
    )
  ) {
    return null
  }

  return `${r}, ${g}, ${b}`
}

function resolveCssVar(value) {
  if (!isString(value)) return value

  const trimmed = value.trim()
  const match = trimmed.match(
    /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+)\s*)?\)$/
  )
  if (!match) return trimmed

  const cssVarName = match[1]
  const fallbackValue = match[2]?.trim() || null

  if (!isBrowser()) return fallbackValue

  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim()

  return resolved || fallbackValue
}

function parseColorToRgb(value) {
  const resolved = resolveCssVar(value)
  if (!resolved) return null

  const rgb = parseRgbString(resolved)
  if (rgb) return rgb

  const normalizedHex = normalizeHex(resolved)
  if (!normalizedHex) return null

  const r = parseInt(normalizedHex.slice(0, 2), 16)
  const g = parseInt(normalizedHex.slice(2, 4), 16)
  const b = parseInt(normalizedHex.slice(4, 6), 16)

  return `${r}, ${g}, ${b}`
}

export function hexToRgb(value, fallback = DEFAULT_COLOR_FALLBACK) {
  return parseColorToRgb(value) || parseColorToRgb(fallback) || DEFAULT_RGB
}

export function hexToRgba(value, alpha = 1, fallback = DEFAULT_COLOR_FALLBACK) {
  const safeAlpha = Number(alpha)
  const clampedAlpha = Number.isFinite(safeAlpha)
    ? Math.max(0, Math.min(1, safeAlpha))
    : 1

  if (isString(value) && value.trim().startsWith('var(')) {
    const percentage = Math.round(clampedAlpha * 100)
    return `color-mix(in srgb, ${value.trim()} ${percentage}%, transparent)`
  }

  const rgb = hexToRgb(value, fallback)
  return `rgba(${rgb}, ${clampedAlpha})`
}

export function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatYear(value) {
  if (!value) return 'N/A'
  const year = String(value).slice(0, 4)
  return year || 'N/A'
}

export function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'N/A'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (!hours) return `${mins} minutes`
  if (!mins) return `${hours} hours`
  return `${hours} hours ${mins} minutes`
}

export function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatVotes(count) {
  if (!count || typeof count !== 'number') return null
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export function formatList(items, limit = 3) {
  if (!Array.isArray(items) || items.length === 0) return 'N/A'
  const names = items
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
  if (names.length === 0) return 'N/A'
  return names.slice(0, limit).join(', ')
}

export function uniqueBy(items, key = 'id') {
  if (!Array.isArray(items)) return []
  const getKey = typeof key === 'function' ? key : (item) => item?.[key]
  const map = new Map()
  items.forEach((item) => {
    const value = getKey(item)
    if (value === undefined || value === null) return
    if (!map.has(value)) map.set(value, item)
  })
  return Array.from(map.values())
}
