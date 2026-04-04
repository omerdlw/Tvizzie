'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/core/constants';
import { cn, formatYear } from '@/core/utils';
import { Button, Input, Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';

function getPosterSrc(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

function getItemTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

function getItemMeta(item) {
  const year = formatYear(item?.release_date);

  return `Movie ${year !== 'N/A' ? `• ${year}` : ''}`.trim();
}

function PanelHeader({ badge, title, meta = null }) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-widest text-[#0f172a] uppercase">{badge}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">{title}</h2>
      </div>
      {meta ? <p className="shrink-0 text-sm font-medium tracking-tight text-[#0f172a]">{meta}</p> : null}
    </div>
  );
}

function SearchResultCard({ isAdded, item, onAdd }) {
  const posterSrc = getPosterSrc(item);

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={isAdded}
      className={cn(
        'grid w-full grid-cols-[72px_minmax(0,1fr)_auto] gap-3 border p-3 text-left sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:p-4',
        isAdded ? 'cursor-default border-[#f59e0b] bg-[#fef3c7]' : 'cursor-pointer border-[#f97316] bg-[#fff7ed]'
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden border border-[#fb923c] bg-[#ffedd5]">
        {posterSrc ? (
          <img src={posterSrc} alt={getItemTitle(item)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#0f172a]">
            <Icon icon="solar:videocamera-record-bold" size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-[#0f172a]">{getItemTitle(item)}</h3>
          <span className="text-[11px] font-medium tracking-wide text-[#0f172a] uppercase">Movie</span>
        </div>
        <p className="mt-1 text-xs font-medium tracking-wide text-[#0f172a] uppercase">{getItemMeta(item)}</p>
        {item?.overview ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#0f172a]">{item.overview}</p> : null}
      </div>

      <div className="flex items-start">
        <span
          className={cn(
            'inline-flex min-w-[84px] items-center justify-center border border-[#0284c7] bg-[#dbeafe] px-3 py-2 text-[10px] font-bold tracking-widest text-[#0f172a] uppercase'
          )}
        >
          {isAdded ? 'Added' : 'Add'}
        </span>
      </div>
    </button>
  );
}

function DraftItemCard({ index, item, onRemove }) {
  const posterSrc = getPosterSrc(item);

  return (
    <div className="grid grid-cols-[24px_56px_minmax(0,1fr)_auto] items-center gap-3 border border-[#22d3ee] bg-[#cffafe] p-2">
      <span className="text-center text-[11px] font-medium tracking-wide text-[#0f172a]">{index + 1}</span>

      <div className="relative aspect-[2/3] overflow-hidden border border-[#06b6d4] bg-[#a5f3fc]">
        {posterSrc ? (
          <img src={posterSrc} alt={getItemTitle(item)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#0f172a]">
            <Icon icon="solar:videocamera-record-bold" size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#0f172a]">{getItemTitle(item)}</p>
        <p className="mt-1 text-[10px] font-medium tracking-wide text-[#0f172a] uppercase">{getItemMeta(item)}</p>
      </div>

      <Button
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        className="size-9"
        aria-label={`Remove ${getItemTitle(item)}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </Button>
    </div>
  );
}

export default function ListCreatorView({
  draftDescription,
  draftItems,
  draftTitle,
  isSearching,
  listIndexHref,
  onDescriptionChange,
  onQuickAddTopResult,
  onRemoveDraftItem,
  onResultAdd,
  onSearchChange,
  onTitleChange,
  searchError,
  searchQuery,
  searchResults,
  seededItemTitle,
}) {
  const selectedKeys = useMemo(
    () => new Set(draftItems.map((item) => `${item.entityType}-${item.entityId}`)),
    [draftItems]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-4 pt-8 pb-20 sm:px-8 sm:pt-10 sm:pb-24`}
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-zuume text-5xl leading-none tracking-tight text-[#0f172a] uppercase sm:text-6xl">
            Create List
          </h1>
          {seededItemTitle ? (
            <p className="text-sm leading-6 text-[#0f172a]">
              Seeded with <span className="text-[#0f172a]">{seededItemTitle}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <section className="border border-[#f59e0b] bg-[#fef3c7]">
              <PanelHeader badge="List Details" title="Details" />

              <div className="grid gap-3 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold tracking-widest text-[#0f172a] uppercase">Title</label>
                  <Input
                    value={draftTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder="90s Sci-Fi Essentials"
                    className={{
                      wrapper: 'border border-[#38bdf8] bg-[#e0f2fe] px-4',
                      input: 'h-12 text-sm text-[#0f172a] outline-none placeholder:text-[#475569]',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold tracking-widest text-[#0f172a] uppercase">
                    Description
                  </label>
                  <Textarea
                    value={draftDescription}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder="Optional"
                    maxHeight={220}
                    className={{
                      textarea:
                        'min-h-[120px] w-full border border-[#0ea5e9] bg-[#dbeafe] px-4 py-3 text-sm text-[#0f172a] outline-none placeholder:text-[#475569]',
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="border border-[#8b5cf6] bg-[#ede9fe]">
              <PanelHeader badge="Quick Add" title="Quick Add" />

              <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                <Input
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onQuickAddTopResult();
                    }
                  }}
                  placeholder="Search movies"
                  autoFocus
                  leftIcon={<Icon icon="solar:magnifer-bold" size={16} />}
                  rightIcon={isSearching ? <Icon icon="solar:spinner-bold" size={16} className="animate-spin" /> : null}
                  className={{
                    wrapper: 'border border-[#f97316] bg-[#ffedd5] px-4',
                    input: 'h-13 text-sm text-[#0f172a] outline-none placeholder:text-[#475569]',
                    leftIcon: 'flex shrink-0 items-center pr-3 text-[#0f172a]',
                    rightIcon: 'flex shrink-0 items-center pl-3 text-[#0f172a]',
                  }}
                />

                {searchError ? (
                  <div className="border border-[#dc2626] bg-[#fecaca] px-4 py-3 text-sm text-[#7f1d1d]">
                    {searchError}
                  </div>
                ) : null}

                <div className="space-y-2.5">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <SearchResultCard
                        key={`${item.entityType}-${item.entityId}`}
                        item={item}
                        isAdded={selectedKeys.has(`${item.entityType}-${item.entityId}`)}
                        onAdd={onResultAdd}
                      />
                    ))
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center border border-[#6366f1] bg-[#e0e7ff] px-6 text-center text-sm text-[#0f172a]">
                      {searchQuery.trim()
                        ? isSearching
                          ? 'Searching...'
                          : 'No results'
                        : 'Search to start adding titles'}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
            <section className="border border-[#14b8a6] bg-[#ccfbf1]">
              <PanelHeader badge="Draft" title="Draft" meta={`${draftItems.length}`} />

              <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
                {draftItems.length > 0 ? (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {draftItems.map((item, index) => (
                      <DraftItemCard
                        key={`${item.entityType}-${item.entityId}`}
                        index={index}
                        item={item}
                        onRemove={onRemoveDraftItem}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-40 items-center justify-center border border-[#0ea5a4] bg-[#99f6e4] px-6 text-center text-sm text-[#0f172a]">
                    No titles yet
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Link
                    href={listIndexHref}
                    className="inline-flex h-11 items-center justify-center gap-2 border border-[#6d28d9] bg-[#ddd6fe] px-5 text-[11px] font-bold tracking-widest text-[#0f172a] uppercase disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
