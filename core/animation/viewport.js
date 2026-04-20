export const ANIMATION_VIEWPORTS = Object.freeze({
  section: Object.freeze({
    once: true,
    amount: 0.14,
    margin: '0px 0px -6% 0px',
  }),
  relaxed: Object.freeze({
    once: true,
    amount: 0.08,
    margin: '0px 0px -12% 0px',
  }),
  dense: Object.freeze({
    once: true,
    amount: 0.2,
    margin: '0px 0px -4% 0px',
  }),
});

export const ANIMATION_SCROLL_RULES = Object.freeze({
  revealOnce: true,
  restoreWillChange: true,
  resetTransformOnComplete: true,
});

export function createAnimationViewport(overrides = {}) {
  return {
    ...ANIMATION_VIEWPORTS.section,
    ...(overrides || {}),
  };
}

export function createAnimationObserverOptions(viewport = ANIMATION_VIEWPORTS.section) {
  const amount = Number(viewport?.amount);

  return {
    threshold: [0, Number.isFinite(amount) ? amount : ANIMATION_VIEWPORTS.section.amount, 1],
    rootMargin: viewport?.margin || ANIMATION_VIEWPORTS.section.margin,
  };
}
