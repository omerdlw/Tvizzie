function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeTransportMode(value) {
  const normalized = normalizeValue(value);

  if (!normalized || normalized === 'polling') {
    return 'realtime';
  }

  if (normalized === 'sse' || normalized === 'realtime' || normalized === 'dual_observe') {
    return normalized;
  }

  return 'realtime';
}

export function getRealtimeTransportMode() {
  return normalizeTransportMode(process.env.NEXT_PUBLIC_LIVE_TRANSPORT_MODE || process.env.REALTIME_MODE);
}

export function isRealtimeTransportEnabled() {
  const mode = getRealtimeTransportMode();
  return mode === 'realtime' || mode === 'dual_observe';
}

export function isDualObserveTransportMode() {
  return getRealtimeTransportMode() === 'dual_observe';
}
