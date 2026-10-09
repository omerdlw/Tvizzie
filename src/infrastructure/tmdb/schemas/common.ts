import { z } from "zod";

export const text = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const calendarDate = z
  .string()
  .nullish()
  .transform((value) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null,
  );

export function yearOf(date: string | null): number | null {
  return date ? Number(date.slice(0, 4)) : null;
}

export const timestamp = z
  .string()
  .nullish()
  .transform((value) =>
    value && !Number.isNaN(Date.parse(value)) ? value : null,
  );

export const positiveOrNull = z
  .number()
  .nullish()
  .transform((value) => (value && value > 0 ? value : null));

export const countOrZero = z
  .number()
  .nullish()
  .transform((value) => value ?? 0);

export const genreIds = z
  .array(z.unknown())
  .nullish()
  .transform((items) =>
    (items ?? []).filter(
      (item): item is number =>
        typeof item === "number" && Number.isInteger(item),
    ),
  );

export function lenientList<S extends z.ZodType>(item: S) {
  return z
    .array(z.unknown())
    .nullish()
    .transform((items): z.output<S>[] =>
      (items ?? []).flatMap((entry) => {
        const parsed = item.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      }),
    );
}
