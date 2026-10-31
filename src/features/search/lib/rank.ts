export const MATCH = Object.freeze({
  exact: 1,
  prefix: 0.85,
  acronym: 0.82,
  partialPrefix: 0.8,
  phrase: 0.6,
  phraseStart: 0.55,
  allWords: 0.4,
  substring: 0.35,
  coverage: 0.1,
  strong: 0.85,
  weak: 0.55,
});

const ARTICLE = /^(?:the|a|an) (?=\S)/;

export function fold(value: string): string {
  return value
    .replace(/[ıİ]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function words(folded: string): string[] {
  return folded ? folded.split(" ") : [];
}

const ACRONYM = /^[\p{L}\p{N}]{2,8}$/u;
const SUBTITLE = /\s*(?::|\s[-–—]\s)/;
const SEQUEL = / (?:(?:vol(?:ume)?|part|chapter) )?(?:\d+|[ivx]+)$/;
const FRANCHISE = / and .*$/;

function initials(title: string): string {
  return words(title)
    .map((word) => word[0])
    .join("");
}

function isAcronym(text: string, needle: string): boolean {
  if (!ACRONYM.test(needle)) return false;
  const main = fold(text.split(SUBTITLE)[0]);
  const names = [
    fold(text),
    main,
    main.replace(SEQUEL, ""),
    main.replace(FRANCHISE, ""),
  ];
  return names.some(
    (name) =>
      initials(name) === needle ||
      initials(name.replace(ARTICLE, "")) === needle,
  );
}

export function textMatch(
  text: string | null | undefined,
  query: string,
): number {
  const haystack = fold(text ?? "");
  const needle = fold(query);
  if (!haystack || !needle) return 0;

  const bareHaystack = haystack.replace(ARTICLE, "");
  const bareNeedle = needle.replace(ARTICLE, "");
  if (haystack === needle || bareHaystack === bareNeedle) return MATCH.exact;
  if (isAcronym(text ?? "", needle)) return MATCH.acronym;
  if (
    haystack.startsWith(`${needle} `) ||
    bareHaystack.startsWith(`${bareNeedle} `)
  ) {
    return MATCH.prefix;
  }
  if (haystack.startsWith(needle) || bareHaystack.startsWith(bareNeedle)) {
    return MATCH.partialPrefix;
  }

  const have = words(haystack);
  const covered =
    MATCH.coverage * Math.min(1, words(needle).length / have.length);
  const padded = ` ${haystack} `;
  if (padded.includes(` ${needle} `)) return MATCH.phrase + covered;
  if (padded.includes(` ${needle}`)) return MATCH.phraseStart + covered;

  const want = [...new Set(words(needle))];
  const found = want.filter((word) =>
    have.some((candidate) => candidate.startsWith(word)),
  ).length;
  if (found === want.length) return MATCH.allWords + covered;
  if (haystack.includes(needle)) return MATCH.substring;
  return (MATCH.substring * found) / want.length;
}

export function bestMatch(
  texts: readonly (string | null | undefined)[],
  query: string,
): number {
  return texts.reduce(
    (best, text) => Math.max(best, textMatch(text, query)),
    0,
  );
}

export function splitYear(
  query: string,
  now: Date = new Date(),
): { title: string; year: number } | null {
  const found = /^(.*\S)\s+\(?(\d{4})\)?$/.exec(query.trim());
  if (!found) return null;
  const year = Number(found[2]);
  if (year < 1874 || year > now.getFullYear() + 1) return null;
  return { title: found[1], year };
}

export function fame(
  rows: readonly { popularity: number; votes?: number }[],
): number[] {
  const loudest = (pick: (row: (typeof rows)[number]) => number) =>
    Math.log1p(Math.max(0, ...rows.map(pick)));
  const popularity = loudest((row) => row.popularity);
  const votes = loudest((row) => row.votes ?? 0);

  return rows.map((row) => {
    const p = popularity ? Math.log1p(row.popularity) / popularity : 0;
    if (row.votes === undefined) return p;
    const v = votes ? Math.log1p(row.votes) / votes : 0;
    return 0.6 * Math.max(p, v) + 0.4 * ((p + v) / 2);
  });
}

const RENOWN_VOTES = 20_000;

export function renown(
  row: { popularity: number; votes?: number },
  reference: number,
): number {
  const scale = (value: number, top: number) =>
    Math.min(1, Math.log1p(Math.max(0, value)) / Math.log1p(top));
  const p = scale(row.popularity, reference);
  if (row.votes === undefined) return p;
  const v = scale(row.votes, RENOWN_VOTES);
  return 0.6 * Math.max(p, v) + 0.4 * ((p + v) / 2);
}

export const RENOWN = Object.freeze({
  follows: 1_000,
  likes: 300,
  movie: 100,
  person: 30,
});

export function orderWeight(index: number, length: number): number {
  return length > 1 ? 1 - index / length : 1;
}
