const GENRE = Object.freeze({
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  scienceFiction: 878,
  thriller: 53,
  tvMovie: 10770,
  war: 10752,
  western: 37,
  kids: 10762,
  news: 10763,
  reality: 10764,
  soap: 10766,
  talk: 10767,
});

const NON_FILM_GENRES: ReadonlySet<number> = new Set([
  GENRE.news,
  GENRE.reality,
  GENRE.soap,
  GENRE.talk,
]);

const SCRIPTED_GENRES: ReadonlySet<number> = new Set([
  GENRE.action,
  GENRE.adventure,
  GENRE.animation,
  GENRE.comedy,
  GENRE.crime,
  GENRE.drama,
  GENRE.family,
  GENRE.fantasy,
  GENRE.horror,
  GENRE.mystery,
  GENRE.romance,
  GENRE.scienceFiction,
  GENRE.thriller,
  GENRE.war,
  GENRE.western,
]);

const EVENT_TITLE = new RegExp(
  [
    String.raw`\b\d{1,3}(?:st|nd|rd|th)\s+(?:annual\s+)?[\w'’&. -]*?\b(?:awards?|ceremony|gala)\b`,
    String.raw`\b(?:award|prize)s?\s+(?:ceremony|show|gala|night)\b`,
    String.raw`\b(?:academy|golden globe|bafta|emmy|grammy|tony|mtv (?:movie|video music)|critics'? choice|people'?s choice|kids'? choice|screen actors guild|sag|independent spirit|césar|cesar|goya|razzie|golden raspberry)s?\s+awards?\b`,
    String.raw`\bred carpet\b`,
    String.raw`\bbehind the scenes\b`,
    String.raw`\b(?:the )?making of\b`,
    String.raw`\b(?:blooper|gag) reel\b|\bbloopers\b`,
    String.raw`\bfeaturettes?\b`,
    String.raw`\bscreen tests?\b`,
    String.raw`\bpress (?:conference|junket|tour)\b`,
    String.raw`\bq\s*&\s*a\b`,
    String.raw`\bcomic[- ]con\b`,
    String.raw`\b(?:an )?evening with\b|\bin conversation with\b|\binterview with\b`,
    String.raw`\b(?:the )?(?:tonight show|late show|late late show|late night with|saturday night live|the view|good morning america|today show|jimmy kimmel live|the daily show|graham norton show|ellen degeneres show|oprah winfrey show|live with (?:regis|kelly|kathie))\b`,
  ].join("|"),
  "i",
);

const SELF_ROLE =
  /^\s*(?:as\s+)?(?:self|himself|herself|themselves?|themself)\b/i;

const ARCHIVE_ROLE = /\b(?:archive|archival|file footage|stock footage)\b/i;

const APPEARANCE_ROLE =
  /\b(?:host|co-?host|presenter|narrator|interviewee|interviewer|guest|contestant|panelist|announcer|commentator|moderator|participant|himself|herself|themselves?)\b/i;

const NOT_A_JOB =
  /\b(?:thanks|dedicatee|dedicated to|in memory of|acknowledg(?:e)?ments?|archival (?:footage|material)|stock footage|catering|craft service)\b/i;

const DOCUMENTARY_AUTHORSHIP =
  /^(?:co-)?director$|\bwriter\b|screenplay|\bstory\b|producer|\bediting?\b|editor|director of photography|cinematograph|composer|\bcreator\b/i;

interface TitleSignals {
  genreIds: readonly number[];
  originalTitle?: string | null;
  title: string;
  video: boolean;
}

const hasGenre = (signals: TitleSignals, genre: number) =>
  signals.genreIds.includes(genre);

const isScripted = (signals: TitleSignals) =>
  signals.genreIds.some((genre) => SCRIPTED_GENRES.has(genre));

const looksLikeEvent = (signals: TitleSignals) =>
  EVENT_TITLE.test(signals.title) ||
  (signals.originalTitle ? EVENT_TITLE.test(signals.originalTitle) : false);

export function isFilmTitle(signals: TitleSignals): boolean {
  if (signals.genreIds.some((genre) => NON_FILM_GENRES.has(genre))) {
    return false;
  }
  if (isScripted(signals)) return true;
  if (looksLikeEvent(signals)) return false;
  if (
    signals.video &&
    (hasGenre(signals, GENRE.documentary) || signals.genreIds.length === 0)
  ) {
    return false;
  }
  return true;
}

export function isActingCredit(
  signals: TitleSignals & { character: string | null },
): boolean {
  if (!isFilmTitle(signals)) return false;
  const { character } = signals;
  if (character && ARCHIVE_ROLE.test(character)) return false;

  const self = character ? SELF_ROLE.test(character) : false;
  const documentary = hasGenre(signals, GENRE.documentary);
  const tvMovie = hasGenre(signals, GENRE.tvMovie);
  const scripted = isScripted(signals);

  if ((documentary || tvMovie) && !scripted) return false;
  if (documentary || tvMovie) {
    return !self && !(character && APPEARANCE_ROLE.test(character));
  }
  if (!scripted && self) return false;
  return true;
}

export function isCrewCredit(
  signals: TitleSignals & { job: string | null },
): boolean {
  if (!isFilmTitle(signals)) return false;
  const { job } = signals;
  if (job && NOT_A_JOB.test(job)) return false;

  if (hasGenre(signals, GENRE.documentary) && !isScripted(signals)) {
    return job ? DOCUMENTARY_AUTHORSHIP.test(job) : false;
  }
  return true;
}
