const SECTION_KEYS = ['card', 'icon', 'title', 'description', 'shortcutBadge']

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
