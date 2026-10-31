import { err, ok, type Result } from "@omerdlw/base-framework/result";
import {
  TMDB_AWARDS_TIMEOUT_MS,
  TMDB_CACHE_TAG,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
  TMDB_WEBSITE_URL,
  tmdbCacheTag,
} from "./constants";
import { isExpectedTmdbError, tmdbErrors, type TmdbError } from "./errors";
import { isTmdbImagePath } from "./images";
import type { NextFetchInit } from "./transport";
import type { Award, AwardOrganization, AwardRecipient, Awards } from "./types";
import { checkLanguage, isTmdbId } from "./validation";

const EMPTY_AWARDS: Awards = Object.freeze({
  nominations: 0,
  organizations: [],
  wins: 0,
});

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

function decode(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g,
    (m) => ENTITIES[m],
  );
}

function cleanText(html: string | undefined): string {
  return decode(
    (html ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function imagePathOf(src: string | undefined | null): string | null {
  const path =
    /\/t\/p\/[^/]+(\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp))(?:[?#].*)?$/i.exec(
      src ?? "",
    )?.[1];
  return path && isTmdbImagePath(path) ? path : null;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const TITLE_PATTERN =
  /<div class="[^"]*font-semibold leading-9 text-xl[^"]*"[^>]*>\s*<a[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
const LOGO_PATTERNS = [
  /<img[^>]+class="[^"]*logo[^"]*"[^>]+(?:src|data-src)="([^"]+)"/gi,
  /<img[^>]+(?:src|data-src)="([^"]+)"[^>]+class="[^"]*logo[^"]*"/gi,
];

const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

function attributeOf(attributes: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attributes)?.[1];
}

function parseRecipients(row: string): AwardRecipient[] {
  const people = new Map<number, AwardRecipient>();
  for (const [, attributes, inner] of row.matchAll(ANCHOR)) {
    const id = Number(
      /^\/person\/(\d+)(?:[-/?#][^"]*)?$/.exec(
        attributeOf(attributes, "href") ?? "",
      )?.[1],
    );
    if (!Number.isSafeInteger(id)) continue;
    const name =
      cleanText(attributeOf(attributes, "title")) || cleanText(inner);
    const profilePath = imagePathOf(
      /<img[^>]+(?:src|data-src)="([^"]+)"/i.exec(inner)?.[1],
    );
    const known = people.get(id);
    if (known) {
      known.name ||= name;
      known.profilePath ??= profilePath;
    } else {
      people.set(id, { id, name, profilePath });
    }
  }
  return [...people.values()].filter((person) => person.name);
}

function parseRow(row: string): Award | null {
  const links = [...row.matchAll(ANCHOR)].map(([, attributes, inner]) => ({
    href: attributeOf(attributes, "href") ?? "",
    inner,
  }));
  const category = links.find((link) =>
    /\/category\/|#category/.test(link.href),
  );
  const ceremony = links.find(
    (link) => link !== category && /\/ceremony\//.test(link.href),
  );
  if (!ceremony || !category) return null;

  const ceremonyText = cleanText(ceremony.inner);
  const year =
    /\((\d{4})\)/.exec(ceremonyText)?.[1] ??
    /^\d{4}$/.exec(
      cleanText(
        /<p class="[^"]*font-bold[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(row)?.[1],
      ),
    )?.[0] ??
    null;

  const badge =
    /<span[^>]*class="[^"]*round(?:ed-md)?\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(
      row,
    );
  const won = /win|kazand/i.test(cleanText(badge?.[1]));

  const link =
    /<a[^>]*href="\/(movie|tv)\/(\d+)(?:[-/?#][^"]*)?"[^>]*>([\s\S]*?)<\/a>/.exec(
      row,
    );
  const inner = link?.[3] ?? "";
  const project =
    /<img[^>]+alt="([^"]+)"/i.exec(inner)?.[1] ??
    /title="([^"]+)"/i.exec(link?.[0] ?? "")?.[1] ??
    null;
  const projectId = link ? Number(link[2]) : null;

  return {
    category: cleanText(category.inner),
    ceremony: ceremonyText,
    mediaType: link ? (link[1] as "movie" | "tv") : null,
    posterPath: imagePathOf(
      /<img[^>]+(?:src|data-src)="([^"]+)"/i.exec(inner)?.[1],
    ),
    project: project ? decode(project).trim() || null : null,
    projectId:
      projectId !== null && Number.isSafeInteger(projectId) ? projectId : null,
    recipients: parseRecipients(row),
    won,
    year,
  };
}

function parseAwardsHtml(html: string): Awards {
  const start = html.indexOf("space-y-12");
  if (start === -1) return EMPTY_AWARDS;
  const main = html.slice(start);

  const titles = [...main.matchAll(TITLE_PATTERN)].map((match) => ({
    index: match.index,
    title: cleanText(match[1]),
  }));

  const organizations: AwardOrganization[] = [];
  titles.forEach((current, i) => {
    if (!current.title) return;
    const before = main.slice(i === 0 ? 0 : titles[i - 1].index, current.index);
    const chunk = main.slice(
      current.index,
      i + 1 < titles.length ? titles[i + 1].index : main.length,
    );

    const logos = LOGO_PATTERNS.flatMap((pattern) =>
      [...before.matchAll(pattern)].map((m) => ({ at: m.index, src: m[1] })),
    ).sort((a, b) => a.at - b.at);
    const logoPath = imagePathOf(logos.at(-1)?.src);

    const table = chunk.indexOf("divide-y");
    if (table === -1) return;
    const awards = chunk
      .slice(table)
      .split(/<div [^>]*class="[^"]*flex flex-row[^"]*"/)
      .slice(1)
      .flatMap((row) => parseRow(row) ?? []);
    if (awards.length === 0) return;

    organizations.push({
      awards: awards.sort((a, b) => (b.year ?? "").localeCompare(a.year ?? "")),
      id: slug(current.title) || `organization-${i}`,
      logoPath,
      title: current.title,
    });
  });

  const all = organizations.flatMap((organization) => organization.awards);
  return {
    nominations: all.filter((award) => !award.won).length,
    organizations,
    wins: all.filter((award) => award.won).length,
  };
}

export interface AwardsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface AwardsApi {
  forMovie(
    id: number,
    options?: AwardsOptions,
  ): Promise<Result<Awards, TmdbError>>;
  forPerson(
    id: number,
    options?: AwardsOptions,
  ): Promise<Result<Awards, TmdbError>>;
}

const NOUNS = { movie: "Movie", person: "Person" } as const;

export function createAwardsApi(
  onError?: (error: TmdbError, path: string) => void,
): AwardsApi {
  async function load(
    kind: keyof typeof NOUNS,
    id: number,
    { language = TMDB_DEFAULT_LANGUAGE, signal }: AwardsOptions,
  ): Promise<Result<Awards, TmdbError>> {
    if (!isTmdbId(id)) {
      return err(
        tmdbErrors.invalidRequest(
          `${NOUNS[kind]} id must be a positive integer`,
        ),
      );
    }
    const languageError = checkLanguage(language);
    if (languageError) return err(languageError);

    const path = `/${kind}/${id}/awards`;
    const report = (error: TmdbError): Result<never, TmdbError> => {
      if (!isExpectedTmdbError(error)) onError?.(error, path);
      return err(error);
    };

    const timeoutSignal = AbortSignal.timeout(TMDB_AWARDS_TIMEOUT_MS);
    const init: NextFetchInit = {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": `${language},en;q=0.9`,
      },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
      next: {
        revalidate: TMDB_REVALIDATE.awards,
        tags: [TMDB_CACHE_TAG, tmdbCacheTag(`${kind}-awards`, id)],
      },
    };

    let response: Response;
    try {
      response = await fetch(
        `${TMDB_WEBSITE_URL}${path}?${new URLSearchParams({ language })}`,
        init,
      );
    } catch (cause) {
      if (timeoutSignal.aborted)
        return report(tmdbErrors.timeout(TMDB_AWARDS_TIMEOUT_MS));
      return report(
        tmdbErrors.network(
          cause instanceof Error ? cause.message : "Network request failed",
        ),
      );
    }

    if (response.status === 404) return err(tmdbErrors.notFound());
    if (response.status === 429) return report(tmdbErrors.rateLimited(null));
    if (!response.ok) return report(tmdbErrors.upstream(response.status));

    try {
      return ok(parseAwardsHtml(await response.text()));
    } catch {
      return report(
        tmdbErrors.invalidResponse(path, ["body could not be read"]),
      );
    }
  }

  return {
    forMovie: (id, options = {}) => load("movie", id, options),
    forPerson: (id, options = {}) => load("person", id, options),
  };
}
