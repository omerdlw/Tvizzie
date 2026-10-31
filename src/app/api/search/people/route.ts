import {
  createSearchHandler,
  searchPersonHits,
} from "@/features/search/server";

export const GET = createSearchHandler("people", searchPersonHits);
