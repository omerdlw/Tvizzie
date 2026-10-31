import type { Awards } from "@/infrastructure/tmdb/types";
import type { AwardGroup, AwardItem, AwardsGrouping } from "./types";

export function flattenAwards(awards: Awards): AwardItem[] {
  return awards.organizations.flatMap((organization) =>
    organization.awards.map((award, index) => ({
      category: award.category,
      ceremony: award.ceremony,
      key: `${organization.id}-${index}`,
      mediaType: award.mediaType,
      organizationId: organization.id,
      organizationLogoPath: organization.logoPath,
      organizationTitle: organization.title,
      posterPath: award.posterPath,
      project: award.project,
      projectId: award.projectId,
      recipients: award.recipients,
      won: award.won,
      year: award.year,
    })),
  );
}

export function filterAwards(
  items: readonly AwardItem[],
  {
    organizationId,
    winsOnly,
  }: { organizationId: string | null; winsOnly: boolean },
): AwardItem[] {
  return items.filter(
    (item) =>
      (!winsOnly || item.won) &&
      (!organizationId || item.organizationId === organizationId),
  );
}

const byYearDesc = (a: AwardItem, b: AwardItem) =>
  (b.year ?? "").localeCompare(a.year ?? "") ||
  Number(b.won) - Number(a.won) ||
  a.category.localeCompare(b.category);

function group(
  key: string,
  title: string,
  items: AwardItem[],
  extra: Pick<AwardGroup, "logoPath" | "poster">,
): AwardGroup {
  return {
    ...extra,
    items: [...items].sort(byYearDesc),
    key,
    nominations: items.filter((item) => !item.won).length,
    title,
    wins: items.filter((item) => item.won).length,
  };
}

export function groupAwards(
  items: readonly AwardItem[],
  grouping: AwardsGrouping,
): AwardGroup[] {
  const buckets = new Map<string, AwardItem[]>();
  const keyOf = (item: AwardItem): string => {
    if (grouping === "organizations") return item.organizationId;
    if (grouping === "timeline") return item.year ?? "";
    return item.projectId ? `${item.mediaType}-${item.projectId}` : "honors";
  };
  for (const item of items) {
    const key = keyOf(item);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }

  const groups = [...buckets.entries()].map(([key, bucket]) => {
    const first = bucket[0];
    if (grouping === "organizations") {
      return group(key, first.organizationTitle, bucket, {
        logoPath: first.organizationLogoPath,
        poster: null,
      });
    }
    if (grouping === "timeline") {
      return group(key, first.year ?? "Undated", bucket, {
        logoPath: null,
        poster: null,
      });
    }
    const titled = bucket.find((item) => item.project) ?? first;
    return group(key, titled.project ?? "Career and honorary", bucket, {
      logoPath: null,
      poster: {
        id: first.projectId,
        mediaType: first.mediaType,
        path: bucket.find((item) => item.posterPath)?.posterPath ?? null,
      },
    });
  });

  return groups.sort((a, b) => {
    if (grouping === "timeline") {
      return (b.items[0].year ?? "").localeCompare(a.items[0].year ?? "");
    }
    return b.wins - a.wins || b.items.length - a.items.length;
  });
}

export function wonAcademyAward(awards: Awards): boolean {
  return awards.organizations.some(
    (organization) =>
      /academy award|oscar/i.test(organization.title) &&
      organization.awards.some((award) => award.won),
  );
}
