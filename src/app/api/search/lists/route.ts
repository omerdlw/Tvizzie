import { createSearchHandler, searchListHits } from "@/features/search/server";

export const GET = createSearchHandler("lists", searchListHits);
