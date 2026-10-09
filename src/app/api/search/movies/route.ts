import { searchMovieHits } from "@/features/search/server/server";
import { createSearchHandler } from "../../../../features/search/server/handler";

export const GET = createSearchHandler("movies", searchMovieHits);
