import { searchPersonHits } from "@/features/search/server/server";
import { createSearchHandler } from "../../../../features/search/server/handler";

export const GET = createSearchHandler("people", searchPersonHits);
