import {
  handleAccountProfileGet,
  handleAccountProfilePost,
} from '@/domains/account/server/api-handlers.server';

export const GET = handleAccountProfileGet;
export const POST = handleAccountProfilePost;
