export type ArtworkKind = "movie" | "person";

export type ArtworkSlot = "poster" | "backdrop";

export interface ArtworkEntry {
  backdrop?: string;
  poster?: string;
  updatedAt: number;
}

export type ArtworkEntries = Readonly<Record<string, ArtworkEntry>>;
