export const FOLLOW_SELECT = [
  'created_at',
  'follower_avatar_url',
  'follower_display_name',
  'follower_id',
  'follower_username',
  'following_avatar_url',
  'following_display_name',
  'following_id',
  'following_username',
  'responded_at',
  'status',
  'updated_at',
].join(',');

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

export function createEmptyRelationshipState() {
  return {
    canViewPrivateContent: false,
    inboundRelationship: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    inboundStatus: null,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };
}
