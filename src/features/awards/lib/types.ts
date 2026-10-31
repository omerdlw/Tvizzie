import type { AwardRecipient } from "@/infrastructure/tmdb/types";

export type AwardsGrouping = "organizations" | "projects" | "timeline";

export interface AwardItem {
  category: string;
  ceremony: string;
  key: string;
  mediaType: "movie" | "tv" | null;
  organizationId: string;
  organizationLogoPath: string | null;
  organizationTitle: string;
  posterPath: string | null;
  project: string | null;
  projectId: number | null;
  recipients: AwardRecipient[];
  won: boolean;
  year: string | null;
}

export interface AwardGroup {
  items: AwardItem[];
  key: string;
  logoPath: string | null;
  nominations: number;
  poster: {
    id: number | null;
    mediaType: "movie" | "tv" | null;
    path: string | null;
  } | null;
  title: string;
  wins: number;
}
