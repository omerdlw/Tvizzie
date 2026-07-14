import {
  handleFollowsDelete,
  handleFollowsGet,
  handleFollowsPatch,
  handleFollowsPost,
} from '@/core/api/routes/follows.server';

export const runtime = 'nodejs';

export const GET = handleFollowsGet;
export const POST = handleFollowsPost;
export const PATCH = handleFollowsPatch;
export const DELETE = handleFollowsDelete;
