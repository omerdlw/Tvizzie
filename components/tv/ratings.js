const RATING_TIERS = [
  {
    key: 'absolute',
    label: 'Absolute Cinema (9.7+)',
    min: 9.7,
    toneClass: 'bg-info text-white',
    swatchClass: 'bg-info',
  },
  {
    key: 'awesome',
    label: 'Awesome (9.0+)',
    min: 9,
    toneClass: 'bg-success text-black/90',
    swatchClass: 'bg-success',
  },
  {
    key: 'great',
    label: 'Great (8.0+)',
    min: 8,
    toneClass: 'bg-success/70 text-black/85',
    swatchClass: 'bg-success/70',
  },
  {
    key: 'good',
    label: 'Good (7.0+)',
    min: 7,
    toneClass: 'bg-warning text-black/85',
    swatchClass: 'bg-warning',
  },
  {
    key: 'regular',
    label: 'Regular (6.0+)',
    min: 6,
    toneClass: 'bg-warning/70 text-black/80',
    swatchClass: 'bg-warning/70',
  },
  {
    key: 'bad',
    label: 'Bad (5.0+)',
    min: 5,
    toneClass: 'bg-error text-white/90',
    swatchClass: 'bg-error',
  },
  {
    key: 'poor',
    label: 'Low (<5.0)',
    min: 0.001,
    toneClass: 'bg-white/25 text-white/90',
    swatchClass: 'bg-white/25',
  },
]

export const RATING_LEGEND_ITEMS = Object.freeze(
  RATING_TIERS.map(({ key, label, swatchClass }) => ({
    key,
    label,
    swatchClass,
  }))
)

export function getRatingToneClass(value) {
  const score = Number(value)

  if (!Number.isFinite(score) || score <= 0) {
    return 'bg-white/5 text-white/20'
  }

  const tier = RATING_TIERS.find((candidate) => score >= candidate.min)
  return tier?.toneClass || 'bg-white/5 text-white/20'
}

export function getRatingSwatchClass(value) {
  const score = Number(value)

  if (!Number.isFinite(score) || score <= 0) {
    return 'bg-white/10'
  }

  const tier = RATING_TIERS.find((candidate) => score >= candidate.min)
  return tier?.swatchClass || 'bg-white/10'
}
