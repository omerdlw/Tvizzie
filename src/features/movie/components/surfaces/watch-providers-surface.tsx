"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import {
  DockSurfaceExtension,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { report } from "@omerdlw/base-framework/utils";
import { Icon, Loader, MediaCard, SegmentedControl, Select } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { size } from "../../lib/tempo";
import { Cascade, Item } from "../../stage";
import { SURFACE_LEAD, SurfaceScene, scrollWithin } from "../surface";
import type { ProviderEntry, RegionProviders } from "../../lib/providers";
import { getWatchProvidersAction } from "../../server/providers-actions";

interface WatchProvidersData {
  movieId: number;
  title: string;
}

type ProviderCategory = "stream" | "rent" | "buy" | "free";

const CATEGORIES: readonly {
  icon: string;
  key: ProviderCategory;
  label: string;
}[] = [
  { icon: "solar:play-bold", key: "stream", label: "Stream" },
  { icon: "solar:tag-price-bold", key: "rent", label: "Rent" },
  { icon: "solar:bag-check-bold", key: "buy", label: "Buy" },
  { icon: "solar:gift-bold", key: "free", label: "Free" },
];

export function createWatchProvidersSurfaceEntry(
  data: WatchProvidersData,
): SurfaceEntry {
  return {
    component: WatchProvidersSurface,
    description: "Where this movie can be watched",
    icon: "solar:tv-bold",
    props: { data },
    title: "Where to Watch",
  };
}

const FALLBACK_REGION = "US";

const SEARCH_URLS: readonly [RegExp, (q: string) => string][] = [
  [/netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
  [/prime|amazon/i, (q) => `https://www.primevideo.com/search?phrase=${q}`],
  [/apple|itunes/i, (q) => `https://tv.apple.com/search?term=${q}`],
  [
    /google play/i,
    (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
  ],
  [
    /youtube/i,
    (q) => `https://www.youtube.com/results?search_query=${q}+full+movie`,
  ],
  [/disney/i, (q) => `https://www.disneyplus.com/search?q=${q}`],
  [/\bmax\b|hbo/i, (q) => `https://play.max.com/search?q=${q}`],
  [/paramount/i, (q) => `https://www.paramountplus.com/search/?query=${q}`],
  [/peacock/i, (q) => `https://www.peacocktv.com/search?q=${q}`],
  [/hulu/i, (q) => `https://www.hulu.com/search?q=${q}`],
  [/mubi/i, (q) => `https://mubi.com/search?query=${q}`],
  [/tubi/i, (q) => `https://tubitv.com/search/${q}`],
  [/pluto/i, (q) => `https://pluto.tv/search/details?q=${q}`],
  [/crunchyroll/i, (q) => `https://www.crunchyroll.com/search?q=${q}`],
];

function providerHref(
  provider: ProviderEntry,
  title: string,
  region: RegionProviders,
): string | null {
  const q = encodeURIComponent(title.trim());
  const match = SEARCH_URLS.find(([pattern]) => pattern.test(provider.name));
  if (match && q) return match[1](q);
  return region.link;
}

const regionName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

const flagOf = (code: string) =>
  String.fromCodePoint(
    ...code.split("").map((char) => 127397 + char.charCodeAt(0)),
  );

function pickRegion(codes: readonly string[]): string {
  const language = typeof navigator === "undefined" ? "" : navigator.language;
  const own = language.split("-")[1]?.toUpperCase();
  if (own && codes.includes(own)) return own;
  return codes.includes(FALLBACK_REGION) ? FALLBACK_REGION : (codes[0] ?? "");
}

const TILE =
  "cine-fade flex min-w-0 items-center gap-3 rounded-[20px] bg-white/5 p-2 pr-4 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10";

function ProviderTile({
  categoryBadge,
  href,
  provider,
}: {
  categoryBadge?: string;
  href: string | null;
  provider: ProviderEntry;
}): JSX.Element {
  const inner = (
    <>
      <MediaCard
        aspect="free"
        className="shrink-0"
        fallbackIcon="solar:tv-bold"
        fallbackIconSize={16}
        frameClassName="size-10"
        framed={false}
        image={{
          sizes: "40px",
          src: tmdbImageUrl("logo", provider.logoPath, "original"),
        }}
        radius={12}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {provider.name}
        </span>
        {categoryBadge ? (
          <span className="text-[11px] font-medium text-white/50">
            {categoryBadge}
          </span>
        ) : null}
      </div>
    </>
  );

  return href ? (
    <a
      className={`${TILE} cursor-pointer`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {inner}
      <Icon icon="solar:arrow-right-up-linear" size={14} />
    </a>
  ) : (
    <div className={TILE}>{inner}</div>
  );
}

function WatchProvidersSurface({
  data,
}: {
  data: WatchProvidersData;
}): JSX.Element {
  const [regions, setRegions] = useState<Record<
    string,
    RegionProviders
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ProviderCategory>("stream");

  useEffect(() => {
    let cancelled = false;
    getWatchProvidersAction(data.movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setRegions(result.regions);
          setSelectedRegion(pickRegion(Object.keys(result.regions)));
        } else {
          setError(result.error);
        }
      })
      .catch((reason) => {
        if (cancelled) return;
        report("WatchProvidersSurface load", reason);
        setError("Could not load where to watch");
      });
    return () => {
      cancelled = true;
    };
  }, [data.movieId]);

  const codes = useMemo(
    () =>
      Object.keys(regions ?? {}).sort((a, b) =>
        regionName(a).localeCompare(regionName(b)),
      ),
    [regions],
  );

  const region = regions?.[selectedRegion] ?? null;

  const counts = useMemo(() => {
    if (!region) return { buy: 0, free: 0, rent: 0, stream: 0, total: 0 };
    const stream = region.stream.length;
    const rent = region.rent.length;
    const buy = region.buy.length;
    const free = region.free.length;
    const total = stream + rent + buy + free;
    return { buy, free, rent, stream, total };
  }, [region]);

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (cat.key === "free") return counts.free > 0;
      return true;
    });
  }, [counts.free]);

  const initialCategorySetRef = useRef(false);

  useEffect(() => {
    if (!region || initialCategorySetRef.current) return;
    if (counts.stream > 0) {
      initialCategorySetRef.current = true;
    } else {
      const firstWithData = visibleCategories.find((c) => counts[c.key] > 0);
      if (firstWithData) {
        setActiveCategory(firstWithData.key);
        initialCategorySetRef.current = true;
      }
    }
  }, [counts, region, visibleCategories]);

  const activeProviders = region ? (region[activeCategory] ?? []) : [];

  const status = error ? "error" : !regions ? "loading" : "ready";

  return (
    <SurfaceScene>
      <DockSurfaceExtension align="center" id="watch-providers-categories">
        <SurfaceScene className="w-auto">
          <SegmentedControl
            ariaLabel="Kind of availability"
            items={visibleCategories.map((cat) => ({
              count: counts[cat.key],
              icon: cat.icon,
              key: cat.key,
              label: cat.label,
            }))}
            onChange={setActiveCategory}
            value={activeCategory}
          />
        </SurfaceScene>
      </DockSurfaceExtension>

      <Cascade
        className="flex w-full flex-col gap-3"
        key={status}
        lead={SURFACE_LEAD}
      >
        {status === "error" ? (
          <Item className="center min-h-40" from="scale">
            <p className="text-sm text-white/70">{error}</p>
          </Item>
        ) : status === "loading" ? (
          <Item className="center min-h-40" from="scale">
            <Loader />
          </Item>
        ) : !region || counts.total === 0 ? (
          <Item
            className="center min-h-40 flex-col gap-1.5 text-center"
            from="scale"
          >
            <p className="text-xs font-bold text-white/50 uppercase">
              Not available
            </p>
            <p className="text-sm text-white/70">
              No service lists this movie right now
            </p>
          </Item>
        ) : (
          <>
            <Item from="up">
              <Select
                ariaLabel="Region"
                placement="inline"
                classNames={{
                  content: "static mt-0 max-h-52 rounded-[20px]",
                  trigger:
                    "h-10 rounded-[20px] px-4 py-0 ring-white/5 hover:ring-white/10",
                }}
                onChange={setSelectedRegion}
                options={codes.map((code) => ({
                  label: `${flagOf(code)} ${regionName(code)}`,
                  value: code,
                }))}
                value={selectedRegion}
              />
            </Item>

            <Item from="up">
              <div
                className="flex max-h-[min(52dvh,24rem)] flex-col overflow-y-auto overscroll-contain scrollbar-none"
                data-lenis-prevent
                data-lenis-prevent-wheel
                onWheel={scrollWithin}
              >
                {activeProviders.length > 0 ? (
                  <Cascade
                    className="flex flex-col gap-3"
                    key={`${selectedRegion}-${activeCategory}`}
                    lead={size(-2)}
                  >
                    {activeProviders.map((provider) => (
                      <Item from="up" key={provider.id}>
                        <ProviderTile
                          href={providerHref(provider, data.title, region)}
                          provider={provider}
                        />
                      </Item>
                    ))}
                  </Cascade>
                ) : (
                  <p className="py-6 text-center text-xs text-white/50">
                    No {activeCategory} options available in this region
                  </p>
                )}
              </div>
            </Item>
          </>
        )}
      </Cascade>
    </SurfaceScene>
  );
}
