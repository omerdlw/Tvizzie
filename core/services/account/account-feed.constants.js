import 'server-only';

export const ACTIVITY_SELECT = [
  'created_at',
  'dedupe_key',
  'event_type',
  'id',
  'payload',
  'updated_at',
  'user_id',
].join(',');
export const ACTIVITY_SUBJECT_FILTERS = new Set(['all', 'list', 'movie']);
export const ACTIVITY_SORT_MODES = new Set(['newest', 'oldest']);
export const FOLLOW_STATUS_ACCEPTED = 'accepted';
