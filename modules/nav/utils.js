const SECTION_KEYS = ['card', 'icon', 'title', 'description', 'shortcutBadge']
const confirmationIds = new WeakMap()
let confirmationIdCounter = 0

function isObjectLike(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toObject(value) {
  return isObjectLike(value) ? value : {}
}

function getLegacyCardStyle(style) {
  const legacyCardStyle = {}

  if (style?.background) legacyCardStyle.background = style.background
  if (style?.borderColor) legacyCardStyle.borderColor = style.borderColor

  return legacyCardStyle
}

function mergeSection(baseStyle, stateStyle, hoverStyle, section) {
  return {
    ...toObject(baseStyle?.[section]),
    ...toObject(stateStyle?.[section]),
    ...toObject(hoverStyle?.[section]),
  }
}

export function resolveNavVisualStyle(
  style,
  { isActive = false, isHovered = false } = {}
) {
  const baseStyle = toObject(style)
  const stateStyle = isActive
    ? toObject(baseStyle.active)
    : toObject(baseStyle.inactive)
  const hoverStyle = isHovered ? toObject(baseStyle.hover) : {}

  const sections = SECTION_KEYS.reduce(
    (acc, section) => {
      acc[section] = mergeSection(baseStyle, stateStyle, hoverStyle, section)
      return acc
    },
    {
      card: {},
      icon: {},
      title: {},
      description: {},
      shortcutBadge: {},
    }
  )

  sections.card = {
    ...getLegacyCardStyle(baseStyle),
    ...sections.card,
  }

  return {
    ...sections,
    scale:
      stateStyle?.card?.scale ?? hoverStyle?.card?.scale ?? baseStyle?.scale,
  }
}

function normalizeConfirmationValue(value) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function getConfirmationInstanceId(confirmation) {
  if (!confirmation || typeof confirmation !== 'object') return 'primitive'

  const existingId = confirmationIds.get(confirmation)
  if (existingId) return existingId

  confirmationIdCounter += 1
  const nextId = `confirmation-${confirmationIdCounter}`
  confirmationIds.set(confirmation, nextId)
  return nextId
}

export function getNavConfirmationKey(item) {
  const confirmation = item?.confirmation

  if (!confirmation) return null

  return [
    getConfirmationInstanceId(confirmation),
    item?.path || item?.name || 'nav',
    normalizeConfirmationValue(confirmation.title ?? item?.title ?? item?.name),
    normalizeConfirmationValue(
      confirmation.description ?? item?.description ?? ''
    ),
    normalizeConfirmationValue(confirmation.confirmText ?? 'Confirm'),
    normalizeConfirmationValue(confirmation.cancelText ?? 'Cancel'),
    normalizeConfirmationValue(
      confirmation.tone || (confirmation.isDestructive ? 'destructive' : 'default')
    ),
    normalizeConfirmationValue(
      typeof confirmation.icon === 'string' ? confirmation.icon : ''
    ),
  ].join('::')
}
