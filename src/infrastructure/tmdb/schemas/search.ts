import { z } from "zod";
import { countOrZero, lenientList } from "./common";
import { movieSummarySchema } from "./movie";
import { personSummarySchema } from "./person";

function searchPageSchema<S extends z.ZodType>(item: S) {
  return z
    .object({
      page: z.number().int().positive(),
      total_pages: countOrZero,
      total_results: countOrZero,
      results: lenientList(item),
    })
    .transform((p) => ({
      page: p.page,
      totalPages: p.total_pages,
      totalResults: p.total_results,
      results: p.results,
    }));
}

export const movieSearchPageSchema = searchPageSchema(movieSummarySchema);
export const personSearchPageSchema = searchPageSchema(personSummarySchema);
