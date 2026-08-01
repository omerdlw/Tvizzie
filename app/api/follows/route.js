import {
  handleFollowsDelete,
  handleFollowsGet,
  handleFollowsPatch,
  handleFollowsPost,
} from '@/domains/social/server/follow-server';

export const runtime = 'nodejs';

export const GET = handleFollowsGet;
export const POST = handleFollowsPost;
export const PATCH = handleFollowsPatch;
export const DELETE = handleFollowsDelete;
