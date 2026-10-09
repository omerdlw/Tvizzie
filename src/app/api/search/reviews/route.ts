import { searchReviewHits } from "@/features/search/server/community";
import { createSearchHandler } from "../../../../features/search/server/handler";

export const GET = createSearchHandler("reviews", searchReviewHits);
