export const DEFAULT_REALTIME_TRANSPORT_MODE = 'realtime';

export function getRealtimeTransportMode() {
  return DEFAULT_REALTIME_TRANSPORT_MODE;
}

export function isRealtimeTransportEnabled() {
  const mode = getRealtimeTransportMode();
  return mode === 'realtime' || mode === 'dual_observe';
}

export function isDualObserveTransportMode() {
  return getRealtimeTransportMode() === 'dual_observe';
}
