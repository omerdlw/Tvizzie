'use client';

import { useMemo } from 'react';

import { TMDB_IMG } from '@/core/constants';
import { useNavHeight } from '@/core/modules/nav/hooks';
import { cn, formatYear } from '@/core/utils';
import { AccountSectionReveal } from '@/features/account/shared/layout';
import MediaCard from '@/features/shared/media-card';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button, Input } from '@/ui/elements';
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

function SearchGridCard({ isAdded, item, onAdd }) {
  const posterSrc = getPosterSrc(item);
  const title = getItemTitle(item);
  const meta = getItemMeta(item);

  return (
    <MediaCard
      onClick={isAdded ? undefined : () => onAdd(item)}
      className={cn(
        'w-full border bg-white transition-all',
        isAdded
          ? 'cursor-default border-black/25 opacity-75'
          : 'cursor-pointer border-black/10 hover:border-black/30 hover:shadow-sm'
      )}
      imageSrc={posterSrc}
      imageAlt={title}
      imageSizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 14vw"
      tooltipText={meta}
      topOverlay={
        <div className="pointer-events-none absolute top-2 right-2">
          <div
            className={cn(
              'flex items-center gap-1 border px-2 py-1 text-[10px] font-bold tracking-wider uppercase backdrop-blur',
              isAdded ? 'border-black! bg-black text-white' : 'border-black/20 bg-white/80 text-black'
            )}
          >
            <Icon icon={isAdded ? 'material-symbols:check-rounded' : 'material-symbols:add-rounded'} size={13} />
            {isAdded ? 'Added' : 'Add'}
          </div>
        </div>
      }
    />
  );
}

function DraftItemCard({ index, item, onRemove }) {
  const posterSrc = getPosterSrc(item);

  return (
    <div className="group flex items-center gap-3 border border-black/10 bg-white/80 p-2.5 transition-all hover:border-black/20">
      <span className="w-6 text-center text-[11px] font-bold tracking-widest text-black/40">{index + 1}</span>

      <div className="relative h-16 w-11 shrink-0 overflow-hidden border border-black/10 bg-black/5">
        {posterSrc ? (
          <AdaptiveImage
            mode="img"
            src={posterSrc}
            alt={getItemTitle(item)}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/30">
            <Icon icon="solar:videocamera-record-bold" size={14} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[14px] font-semibold text-black">{getItemTitle(item)}</p>
        <p className="mt-0.5 text-[10px] font-bold tracking-widest text-black/60 uppercase">{getItemMeta(item)}</p>
      </div>

      <Button
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        className="mr-1 size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${getItemTitle(item)}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </Button>
    </div>
  );
}

function MobileDraftRowItem({ item, onRemove }) {
  const posterSrc = getPosterSrc(item);

  return (
    <div className="flex min-w-[180px] items-center gap-2 border border-black/10 bg-white/85 p-2">
      <div className="relative h-12 w-8 shrink-0 overflow-hidden border border-black/10 bg-black/5">
        {posterSrc ? (
          <AdaptiveImage
            mode="img"
            src={posterSrc}
            alt={getItemTitle(item)}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/30">
            <Icon icon="solar:videocamera-record-bold" size={12} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-black">{getItemTitle(item)}</p>
        <p className="truncate text-[10px] font-bold tracking-widest text-black/60 uppercase">{getItemMeta(item)}</p>
      </div>

      <Button
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        className="size-7 shrink-0"
        aria-label={`Remove ${getItemTitle(item)}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={14} />
      </Button>
    </div>
  );
}

export default function ListCreatorView({
  draftDescription,
  draftItems,
  draftTitle,
  isSearching,
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
  const { navHeight } = useNavHeight();
  const selectedKeys = useMemo(
    () => new Set(draftItems.map((item) => `${item.entityType}-${item.entityId}`)),
    [draftItems]
  );

  return (
    <main className="h-screen w-screen overflow-hidden">
      <AccountSectionReveal className="h-full min-h-0">
        <div className="h-full min-h-0 w-full overflow-hidden border border-black/10 bg-white/50 shadow-sm">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="flex min-h-0 flex-col overflow-hidden border-b border-black/10 lg:border-r lg:border-b-0">
              <div className="border-b border-black/10 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Title</label>
                    <Input
                      value={draftTitle}
                      onChange={(event) => onTitleChange(event.target.value)}
                      placeholder="90s Sci-Fi Essentials"
                      className={{
                        wrapper:
                          'flex h-12 items-center border border-black/10 bg-white px-4 transition focus-within:border-black/20 hover:border-black/25',
                        input: 'h-full bg-transparent text-sm text-black outline-none placeholder:text-black/40',
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest text-black/60 uppercase">Description</label>
                    <Input
                      value={draftDescription}
                      onChange={(event) => onDescriptionChange(event.target.value)}
                      placeholder="Optional"
                      className={{
                        wrapper:
                          'flex h-12 items-center border border-black/10 bg-white px-4 transition focus-within:border-black/20 hover:border-black/25',
                        input: 'h-full bg-transparent text-sm text-black outline-none placeholder:text-black/40',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold tracking-widest text-black/60 uppercase">
                      Search Movie
                    </label>
                    {seededItemTitle ? (
                      <span className="truncate border border-black/10 bg-white px-2 py-1 text-[10px] font-bold tracking-widest text-black/70 uppercase">
                        Seeded: {seededItemTitle}
                      </span>
                    ) : null}
                  </div>

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
                    leftIcon={<Icon icon="solar:magnifer-linear" size={18} className="text-black/45" />}
                    rightIcon={
                      isSearching ? (
                        <Icon icon="solar:spinner-bold" size={18} className="animate-spin text-black/40" />
                      ) : null
                    }
                    className={{
                      wrapper:
                        'flex h-12 items-center border border-black/20 bg-white px-4 transition focus-within:border-black/20 hover:border-black/30',
                      input: 'h-full bg-transparent text-sm text-black outline-none placeholder:text-black/40',
                      leftIcon: 'flex shrink-0 items-center pr-3',
                      rightIcon: 'flex shrink-0 items-center pl-3',
                    }}
                  />
                </div>

                {searchError ? (
                  <div className="mt-3 border border-[#dc2626]/25 bg-[#fecaca]/60 px-4 py-3 text-sm text-[#991b1b]">
                    {searchError}
                  </div>
                ) : null}
              </div>

              <div
                data-lenis-prevent
                data-lenis-prevent-wheel
                data-lenis-prevent-touch
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 sm:p-5"
                style={{ paddingBottom: `calc(${Math.max(0, Math.round(navHeight || 0))}px + 1rem)` }}
              >
                <div className="mb-4 border-b border-black/10 pb-4 lg:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold tracking-widest text-black uppercase">Draft</p>
                    <p className="text-xs font-semibold text-black/70">{draftItems.length} items</p>
                  </div>

                  <div className="mt-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
                    {draftItems.length > 0 ? (
                      draftItems.map((item) => (
                        <MobileDraftRowItem
                          key={`mobile-${item.entityType}-${item.entityId}`}
                          item={item}
                          onRemove={onRemoveDraftItem}
                        />
                      ))
                    ) : (
                      <div className="flex h-14 min-w-[180px] items-center justify-center border border-dashed border-black/10 bg-white/60 px-3 text-xs text-black/55">
                        No titles yet
                      </div>
                    )}
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {searchResults.map((item) => (
                      <SearchGridCard
                        key={`${item.entityType}-${item.entityId}`}
                        item={item}
                        isAdded={selectedKeys.has(`${item.entityType}-${item.entityId}`)}
                        onAdd={onResultAdd}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 border border-dashed border-black/10 bg-white/60 px-6 text-center text-sm text-black/55 sm:min-h-[280px]">
                    <Icon
                      icon={searchQuery.trim() && !isSearching ? 'solar:ghost-smile-bold' : 'solar:magnifer-linear'}
                      size={32}
                      className="text-black/25"
                    />
                    {searchQuery.trim()
                      ? isSearching
                        ? 'Searching'
                        : 'No results found'
                      : 'Search to start adding titles'}
                  </div>
                )}
              </div>
            </section>

            <aside className="hidden min-h-0 flex-col border-t border-black/10 lg:flex lg:border-t-0">
              <div className="border-b border-black/10 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold tracking-widest text-black uppercase">Draft</p>
                  <p className="text-xs font-semibold text-black/60">{draftItems.length} items</p>
                </div>
              </div>

              <div
                data-lenis-prevent
                data-lenis-prevent-wheel
                data-lenis-prevent-touch
                className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain p-4 sm:p-5"
                style={{ paddingBottom: `calc(${Math.max(0, Math.round(navHeight || 0))}px + 1rem)` }}
              >
                {draftItems.length > 0 ? (
                  draftItems.map((item, index) => (
                    <DraftItemCard
                      key={`${item.entityType}-${item.entityId}`}
                      index={index}
                      item={item}
                      onRemove={onRemoveDraftItem}
                    />
                  ))
                ) : (
                  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 border border-dashed border-black/10 bg-white/60 px-5 text-center text-sm text-black/55 sm:min-h-[220px] sm:gap-3">
                    <Icon icon="solar:box-minimalistic-bold" size={30} className="text-black/25" />
                    No titles yet
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </AccountSectionReveal>
    </main>
  );
}
