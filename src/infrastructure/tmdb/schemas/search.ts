import { z } from "zod";
import { lenientList, pageSchema, text } from "./common";
import { movieSummarySchema } from "./movie";
import { personSummarySchema } from "./person";

export const movieSearchPageSchema = pageSchema(movieSummarySchema);
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

export const personSearchPageSchema = pageSchema(personSearchResultSchema);
