import { createSearchHandler, searchUserHits } from "@/features/search/server";

export const GET = createSearchHandler("users", searchUserHits);
