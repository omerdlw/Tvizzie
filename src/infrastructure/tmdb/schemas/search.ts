import { z } from "zod";
import { countOrZero, lenientList, text } from "./common";
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
// A search answer names a few titles each person is known for, which is
// what tells two people of the same name apart.
const knownForSchema = z
  .object({ media_type: text, name: text, title: text })
  .transform((k) => (k.media_type === "movie" ? k.title : null));

const personSearchResultSchema = z
  .object({ known_for: lenientList(knownForSchema) })
  .and(personSummarySchema)
  .transform(({ known_for, ...person }) => ({
    ...person,
    knownFor: known_for.filter((title): title is string => Boolean(title)),
  }));

export const personSearchPageSchema = searchPageSchema(
  personSearchResultSchema,
);
