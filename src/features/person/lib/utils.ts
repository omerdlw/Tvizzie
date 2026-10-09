import type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonDetails,
  PersonExternalIds,
  PersonImage,
} from "@/infrastructure/tmdb/types";
import {
  PERSON_BACKDROP_LIMIT,
  PERSON_BACKDROP_MIN_VOTES,
  PERSON_BIO_CLAMP_LENGTH,
  PERSON_BIO_EXCERPT,
  PERSON_CAREER_MIN_YEARS,
  PERSON_GALLERY_LIMIT,
} from "./constants";
import type {
  Career,
  FilmographyCredit,
  FilmographyGroup,
  FilmographySort,
  SocialLink,
  TimelineCredit,
  PersonViewKey,
  TimelineYear,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export { personHref } from "@/config/routes";

export function parsePersonId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

const DEPARTMENT_ROLES: Readonly<Record<string, string>> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
  Camera: "Cinematographer",
  Sound: "Sound",
  Art: "Art",
  "Costume & Make-Up": "Costume & Make-Up",
  "Visual Effects": "Visual Effects",
  Lighting: "Lighting",
  Creator: "Creator",
  Crew: "Crew",
};

export function departmentRole(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENT_ROLES[department] ?? department;
}

function parseDay(date: string | null): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(date: string | null): string | null {
  const parsed = parseDay(date);
  return parsed ? dateFormatter.format(parsed) : null;
}

export function calculateAge(
  birthday: string | null,
  deathday: string | null,
  now: Date = new Date(),
): number | null {
  const birth = parseDay(birthday);
  if (!birth) return null;
  const end = parseDay(deathday) ?? now;

  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    end.getUTCMonth() < birth.getUTCMonth() ||
    (end.getUTCMonth() === birth.getUTCMonth() &&
      end.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function lifeSpan(
  person: Pick<PersonDetails, "birthday" | "deathday">,
): string | null {
  const born = person.birthday?.slice(0, 4);
  const died = person.deathday?.slice(0, 4);
  if (born && died) return `${born} - ${died}`;
  if (born) return `Born ${born}`;
  if (died) return `Died ${died}`;
  return null;
}

export function describePerson(
  person: PersonDetails,
  films: number | null = null,
): string {
  return [
    departmentRole(person.knownForDepartment),
    lifeSpan(person),
    films ? `${films} ${films === 1 ? "film" : "films"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function isLongBiography(biography: string): boolean {
  return biography.length > PERSON_BIO_CLAMP_LENGTH;
}

type Credit = PersonCastCredit | PersonCrewCredit;

const byPopularity = (a: Credit, b: Credit) =>
  b.popularity - a.popularity || b.voteCount - a.voteCount;

const byNewest = (a: Credit, b: Credit) =>
  (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") ||
  byPopularity(a, b);

const GROUP_PRIORITY = ["Acting", "Directing", "Writing", "Production"];

const DEPARTMENT_JOBS: Readonly<Record<string, RegExp>> = {
  Directing: /^(?:co-)?director$/i,
  Production: /producer/i,
};

function toCredit(movie: Credit, role: string | null): FilmographyCredit {
  return {
    id: movie.id,
    key: `${movie.id}`,
    popularity: movie.popularity,
    posterPath: movie.posterPath,
    releaseDate: movie.releaseDate,
    role,
    title: movie.title,
    voteCount: movie.voteCount,
    year: movie.releaseYear,
  };
}

function mergeByMovie<T extends Credit>(
  credits: readonly T[],
  roleOf: (credit: T) => string | null,
): FilmographyCredit[] {
  const merged = new Map<number, { movie: T; roles: string[] }>();
  for (const credit of credits) {
    const role = roleOf(credit);
    const existing = merged.get(credit.id);
    if (!existing) {
      merged.set(credit.id, { movie: credit, roles: role ? [role] : [] });
    } else if (role && !existing.roles.includes(role)) {
      existing.roles.push(role);
    }
  }
  return [...merged.values()].map(({ movie, roles }) =>
    toCredit(movie, roles.length > 0 ? roles.join(" / ") : null),
  );
}

function makeGroup(
  key: string,
  label: string,
  credits: FilmographyCredit[],
): FilmographyGroup {
  const withPoster = credits.filter((credit) => credit.posterPath);
  return { credits: withPoster, key, label, total: withPoster.length };
}

function crewOfDepartment(
  credits: readonly PersonCrewCredit[],
  department: string,
): PersonCrewCredit[] {
  const jobs = DEPARTMENT_JOBS[department];
  const defining = jobs
    ? credits.filter((credit) => credit.job && jobs.test(credit.job))
    : [];
  return defining.length > 0 ? defining : [...credits];
}

const SHOWN_ALONGSIDE = ["Acting", "Directing"];

export function getFilmography(person: PersonDetails): FilmographyGroup[] {
  const groups: FilmographyGroup[] = [];

  groups.push(
    makeGroup(
      "Acting",
      departmentRole("Acting") ?? "Actor",
      mergeByMovie(
        [...person.credits.cast].sort(byPopularity),
        (credit) => credit.character,
      ),
    ),
  );

  const byDepartment = new Map<string, PersonCrewCredit[]>();
  for (const credit of person.credits.crew) {
    const department = credit.department ?? "Crew";
    byDepartment.set(department, [
      ...(byDepartment.get(department) ?? []),
      credit,
    ]);
  }
  for (const [department, credits] of byDepartment) {
    groups.push(
      makeGroup(
        department,
        departmentRole(department) ?? department,
        mergeByMovie(
          crewOfDepartment(credits, department).sort(byPopularity),
          (credit) => credit.job,
        ),
      ),
    );
  }

  const present = groups.filter((group) => group.total > 0);
  const shown = present
    .filter(
      (group) =>
        group.key === person.knownForDepartment ||
        SHOWN_ALONGSIDE.includes(group.key),
    )
    .sort((a, b) => {
      const rank = (group: FilmographyGroup) =>
        group.key === person.knownForDepartment
          ? -1
          : SHOWN_ALONGSIDE.indexOf(group.key);
      return rank(a) - rank(b);
    });
  if (shown.length > 0) return shown;

  const priority = (group: FilmographyGroup) => {
    const index = GROUP_PRIORITY.indexOf(group.key);
    return index === -1 ? GROUP_PRIORITY.length : index;
  };
  const [largest] = present.sort(
    (a, b) => b.total - a.total || priority(a) - priority(b),
  );
  return largest ? [largest] : [];
}

const NOT_A_REAL_ROLE = /uncredited|cameo|self|archive/i;

function backdropScore(credit: Credit, kind: "cast" | "crew"): number {
  let weight = 1;
  if (kind === "cast") {
    const { order, character } = credit as PersonCastCredit;
    weight = order === 0 ? 1.6 : order <= 2 ? 1.3 : order <= 5 ? 1 : 0.7;
    if (order > 10) weight = 0.3;
    if (character && NOT_A_REAL_ROLE.test(character)) weight *= 0.2;
  } else {
    weight = (credit as PersonCrewCredit).job === "Director" ? 1.3 : 0.5;
  }
  const impact =
    Math.log10(Math.max(1, credit.voteCount)) * 25 +
    Math.log10(Math.max(1, credit.popularity)) * 10;
  return impact * weight;
}

export function getBackdropPaths(
  person: PersonDetails,
  limit = PERSON_BACKDROP_LIMIT,
): string[] {
  const best = new Map<number, { path: string; score: number }>();
  const consider = (credit: Credit, kind: "cast" | "crew") => {
    if (!credit.backdropPath || credit.voteCount < PERSON_BACKDROP_MIN_VOTES) {
      return;
    }
    const score = backdropScore(credit, kind);
    const known = best.get(credit.id);
    if (!known || score > known.score) {
      best.set(credit.id, { path: credit.backdropPath, score });
    }
  };
  person.credits.cast.forEach((credit) => consider(credit, "cast"));
  person.credits.crew.forEach((credit) => consider(credit, "crew"));

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ path }) => path);
}

export function getBackdropPath(person: PersonDetails): string | null {
  return getBackdropPaths(person, 1)[0] ?? null;
}

export function getGalleryImages(
  person: PersonDetails,
  limit = PERSON_GALLERY_LIMIT,
): PersonImage[] {
  return [...person.images.profiles]
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
    .slice(0, limit);
}

const SOCIAL_SOURCES: readonly {
  icon: string;
  id: (ids: PersonExternalIds) => string | null;
  key: string;
  label: string;
  pattern: RegExp;
  url: (id: string) => string;
}[] = [
  {
    icon: "cib:imdb",
    id: (ids) => ids.imdbId,
    key: "imdb",
    label: "IMDb",
    pattern: /^nm\d+$/,
    url: (id) => `https://www.imdb.com/name/${id}/`,
  },
  {
    icon: "mdi:instagram",
    id: (ids) => ids.instagramId,
    key: "instagram",
    label: "Instagram",
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    url: (id) => `https://www.instagram.com/${id}/`,
  },
  {
    icon: "mdi:twitter",
    id: (ids) => ids.twitterId,
    key: "twitter",
    label: "Twitter",
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    url: (id) => `https://twitter.com/${id}`,
  },
  {
    icon: "mdi:facebook",
    id: (ids) => ids.facebookId,
    key: "facebook",
    label: "Facebook",
    pattern: /^[A-Za-z0-9.]{1,50}$/,
    url: (id) => `https://www.facebook.com/${id}`,
  },
  {
    icon: "ic:baseline-tiktok",
    id: (ids) => ids.tiktokId,
    key: "tiktok",
    label: "TikTok",
    pattern: /^[A-Za-z0-9._]{1,24}$/,
    url: (id) => `https://www.tiktok.com/@${id}`,
  },
  {
    icon: "mdi:youtube",
    id: (ids) => ids.youtubeId,
    key: "youtube",
    label: "YouTube",
    pattern: /^[A-Za-z0-9._-]{1,100}$/,
    url: (id) => `https://www.youtube.com/@${id}`,
  },
  {
    icon: "simple-icons:wikidata",
    id: (ids) => ids.wikidataId,
    key: "wikidata",
    label: "Wikidata",
    pattern: /^Q\d+$/,
    url: (id) => `https://www.wikidata.org/wiki/${id}`,
  },
];

export function getSocialLinks(ids: PersonExternalIds): SocialLink[] {
  return SOCIAL_SOURCES.flatMap((source) => {
    const id = source.id(ids);
    if (!id || !source.pattern.test(id)) return [];
    return [
      {
        icon: source.icon,
        key: source.key,
        label: source.label,
        url: source.url(id),
      },
    ];
  });
}

export const FILMOGRAPHY_SORTS: readonly {
  key: FilmographySort;
  label: string;
}[] = [
  { key: "popularity", label: "Popularity" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Film name" },
];

export function isFilmographySort(value: unknown): value is FilmographySort {
  return FILMOGRAPHY_SORTS.some((sort) => sort.key === value);
}

function sortableTitle(title: string): string {
  return title.replace(/^(?:the|a|an)\s+/i, "");
}

const byTitle = (a: FilmographyCredit, b: FilmographyCredit) =>
  sortableTitle(a.title).localeCompare(sortableTitle(b.title), "en", {
    sensitivity: "base",
  });

const byCreditPopularity = (a: FilmographyCredit, b: FilmographyCredit) =>
  b.popularity - a.popularity || b.voteCount - a.voteCount;

export function sortFilmography(
  credits: readonly FilmographyCredit[],
  sort: FilmographySort,
): FilmographyCredit[] {
  const compare = (a: FilmographyCredit, b: FilmographyCredit): number => {
    switch (sort) {
      case "popularity":
        return 0;
      case "name":
        return byTitle(a, b);
      case "newest":
      case "oldest": {
        if (!a.releaseDate || !b.releaseDate) {
          return Number(!a.releaseDate) - Number(!b.releaseDate);
        }
        const order = a.releaseDate.localeCompare(b.releaseDate);
        return sort === "newest" ? -order : order;
      }
    }
  };
  return [...credits].sort((a, b) => compare(a, b) || byCreditPopularity(a, b));
}

function describeCredits(
  cast: readonly PersonCastCredit[],
  crew: readonly PersonCrewCredit[],
): string | null {
  const parts: string[] = [];
  if (cast.length > 0) {
    const characters = [
      ...new Set(cast.map((c) => c.character).filter(Boolean)),
    ];
    parts.push(
      characters.length > 0 ? `as ${characters.join(" / ")}` : "Actor",
    );
  }
  const jobs = [
    ...new Set(crew.map((c) => c.job ?? c.department).filter(Boolean)),
  ];
  if (jobs.length > 0) parts.push(jobs.join(", "));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function getTimeline(person: PersonDetails): TimelineYear[] {
  const films = new Map<
    number,
    { cast: PersonCastCredit[]; crew: PersonCrewCredit[]; movie: Credit }
  >();
  const entry = (movie: Credit) => {
    let film = films.get(movie.id);
    if (!film) {
      film = { cast: [], crew: [], movie };
      films.set(movie.id, film);
    }
    return film;
  };
  person.credits.cast.forEach((credit) => entry(credit).cast.push(credit));
  person.credits.crew.forEach((credit) => entry(credit).crew.push(credit));

  const years = new Map<
    string | null,
    { credit: TimelineCredit; movie: Credit }[]
  >();
  for (const { cast, crew, movie } of films.values()) {
    const year = movie.releaseDate?.slice(0, 4) ?? null;
    years.set(year, [
      ...(years.get(year) ?? []),
      {
        credit: {
          detail: describeCredits(cast, crew),
          id: movie.id,
          key: `${movie.id}`,
          posterPath: movie.posterPath,
          title: movie.title,
        },
        movie,
      },
    ]);
  }

  return [...years.entries()]
    .sort(([a], [b]) => {
      if (a === null || b === null)
        return Number(a === null) - Number(b === null);
      return Number(b) - Number(a);
    })
    .map(([year, items]) => ({
      credits: items
        .sort((a, b) => byNewest(a.movie, b.movie))
        .map((i) => i.credit),
      year,
    }));
}

export function toggleView(
  current: PersonViewKey,
  target: Exclude<PersonViewKey, "main">,
): PersonViewKey {
  return current === target ? "main" : target;
}

export function excerptBiography(
  biography: string,
  limit = PERSON_BIO_EXCERPT,
): { text: string; truncated: boolean } {
  const whole = biography.trim();
  if (!isLongBiography(whole)) return { text: whole, truncated: false };

  const paragraph = whole.split(/\n{2,}/)[0].trim();
  const base = paragraph.length >= limit / 2 ? paragraph : whole;
  if (base.length <= limit) {
    return { text: base, truncated: base.length < whole.length };
  }

  const cut = base.slice(0, limit);
  const ends = [...cut.matchAll(/[.!?]["')\]]?(?=\s)/g)];
  const last = ends[ends.length - 1];
  if (last && last.index + last[0].length >= limit / 2) {
    return { text: cut.slice(0, last.index + last[0].length), truncated: true };
  }
  const space = cut.lastIndexOf(" ");
  return {
    text: `${cut.slice(0, space > 0 ? space : limit).replace(/[\s,;:.\-–—]+$/, "")}…`,
    truncated: true,
  };
}

interface Film {
  id: number;
  popularity: number;
  title: string;
  votes: number;
  year: number;
}

function careerFilms(person: PersonDetails): Film[] {
  const films = new Map<number, Film>();
  for (const credit of [...person.credits.cast, ...person.credits.crew]) {
    if (credit.releaseYear === null || films.has(credit.id)) continue;
    films.set(credit.id, {
      id: credit.id,
      popularity: credit.popularity,
      title: credit.title,
      votes: credit.voteCount,
      year: credit.releaseYear,
    });
  }
  return [...films.values()];
}

const byImpact = (a: Film, b: Film) =>
  b.votes - a.votes || b.popularity - a.popularity;

export function getCareer(person: PersonDetails): Career | null {
  const films = careerFilms(person);
  if (films.length === 0) return null;

  const first = Math.min(...films.map((film) => film.year));
  const last = Math.max(...films.map((film) => film.year));
  const end = Math.max(last, first + PERSON_CAREER_MIN_YEARS - 1);

  const byYear = new Map<number, Film[]>();
  for (const film of films) {
    byYear.set(film.year, [...(byYear.get(film.year) ?? []), film]);
  }
  const height = (year: number) =>
    (byYear.get(year) ?? []).reduce((n, f) => n + f.votes, 0);

  let tallest = 0;
  let peak = first;
  for (let year = first; year <= end; year++) {
    if (height(year) >= tallest && byYear.has(year)) {
      tallest = height(year);
      peak = year;
    }
  }

  const years = [];
  for (let year = first; year <= end; year++) {
    const here = [...(byYear.get(year) ?? [])].sort(byImpact);
    years.push({
      count: here.length,
      films: here.map((film) => film.title),
      weight:
        tallest > 0
          ? Math.sqrt(height(year) / tallest)
          : here.length > 0
            ? 1
            : 0,
      year,
    });
  }
  return { peak, years };
}

export function countFilms(
  person: PersonDetails,
  now: Date = new Date(),
): number {
  const today = now.getUTCFullYear();
  return careerFilms(person).filter((film) => film.year <= today).length;
}
