import {
  createSearchHandler,
  searchReviewHits,
} from "@/features/search/server";

export const GET = createSearchHandler("reviews", searchReviewHits);
