export interface ProviderEntry {
  id: number;
  logoPath: string | null;
  name: string;
}

export interface RegionProviders {
  buy: ProviderEntry[];
  free: ProviderEntry[];
  link: string | null;
  rent: ProviderEntry[];
  stream: ProviderEntry[];
}

export type WatchProvidersResult =
  | { regions: Record<string, RegionProviders>; success: true }
  | { error: string; success: false };
