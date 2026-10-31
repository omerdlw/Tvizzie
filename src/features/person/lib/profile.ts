import type {
  PersonDetails,
  PersonExternalIds,
} from "@/infrastructure/tmdb/types";
import { PERSON_BIO_CLAMP_LENGTH, PERSON_BIO_EXCERPT } from "./constants";
import type { SocialLink } from "./types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

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

export function excerptBiography(
  biography: string,
  limit = PERSON_BIO_EXCERPT,
): { text: string; truncated: boolean } {
  const whole = biography.trim();
  if (whole.length <= PERSON_BIO_CLAMP_LENGTH)
    return { text: whole, truncated: false };

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
