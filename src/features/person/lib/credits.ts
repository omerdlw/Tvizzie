import type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonDetails,
} from "@/infrastructure/tmdb/types";
import { PERSON_CAREER_MIN_YEARS } from "./constants";
import type {
  Career,
  FilmographyCredit,
  FilmographyGroup,
  FilmographySort,
  TimelineCredit,
  TimelineYear,
} from "./types";
import { departmentRole } from "./profile";

export type Credit = PersonCastCredit | PersonCrewCredit;

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
