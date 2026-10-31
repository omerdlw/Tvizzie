import { createSearchHandler, searchMovieHits } from "@/features/search/server";

export const GET = createSearchHandler("movies", searchMovieHits);
