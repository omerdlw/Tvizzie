// How well a title answers a query, in one number from 0 to 1, so that
// films, people and community rows can be weighed against one another.

export const MATCH = Object.freeze({
  exact: 1,
  prefix: 0.85,
  partialPrefix: 0.8,
  phrase: 0.6,
  phraseStart: 0.55,
  allWords: 0.4,
  substring: 0.35,
  // Inside a tier, the more of the title the query covers, the closer it
  // is: "hathaway" is half of "Anne Hathaway" and a quarter of "Mobile
  // Suit Gundam: Hathaway".
  coverage: 0.1,
  // Below this, a row only shares words with the query; it does not answer it.
  strong: 0.85,
  weak: 0.55,
});

const ARTICLE = /^(?:the|a|an) (?=\S)/;

// Folded for comparison only: case, accents, Turkish dotless i and
// punctuation fall away, so "La-La Land" and "la la land" are one title.
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

// A trailing year narrows a film search: "dune 1984". A year that is the
// whole query ("1917"), or one still to come ("blade runner 2049"), is a
// title.
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

// Fame on a log scale, relative to the loudest row in the same answer: a
// film everyone has rated and one everyone is waiting for both count.
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

// How well known a row is on a fixed scale, so that a film and a person can
// be weighed against each other: the overview opens on Quentin Tarantino,
// not on an unseen short called "Tarantino". The reference is the
// popularity (or the count of followers, likes) that counts as famous.
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

// TMDB's own order is a signal too, so it is kept as a light tiebreak.
export function orderWeight(index: number, length: number): number {
  return length > 1 ? 1 - index / length : 1;
}
