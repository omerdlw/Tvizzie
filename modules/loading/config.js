// ── Loading model and option normalization ─────────────────────────────────────

export const DEFAULT_LOADING_STATE = Object.freeze({
  isLoading: false,
  skeleton: null,
  minDuration: 0,
  showOverlay: true,
});

export function normalizeLoadingOptions(options = {}) {
  const minDuration = Number(options?.minDuration);

  return {
    minDuration: Number.isFinite(minDuration) && minDuration > 0 ? minDuration : 0,
    showOverlay: options?.showOverlay !== false,
    skeleton: options?.skeleton ?? null,
  };
}
