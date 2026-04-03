'use client'

import { useMemo } from 'react'
import Link from 'next/link'

import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/core/constants'
import { cn, formatYear } from '@/core/utils'
import { Button, Input, Textarea } from '@/ui/elements'
import Icon from '@/ui/icon'

function getPosterSrc(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

function getItemTitle(item) {
  return item?.title || item?.name || 'Untitled'
}

function getItemMeta(item) {
  const year = formatYear(item?.release_date)

  return `Movie ${year !== 'N/A' ? `• ${year}` : ''}`.trim()
}

function PanelHeader({ badge, title, meta = null }) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-widest text-white uppercase">
          {badge}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>
      {meta ? (
        <p className="shrink-0 text-sm font-medium tracking-tight text-white">
          {meta}
        </p>
      ) : null}
    </div>
  )
}

function SearchResultCard({ isAdded, item, onAdd }) {
  const posterSrc = getPosterSrc(item)

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={isAdded}
      className={cn(
        'grid w-full grid-cols-[72px_minmax(0,1fr)_auto] gap-3  p-3 text-left transition sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:p-4',
        isAdded
          ? 'cursor-default '
          : 'hover:'
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden ">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={getItemTitle(item)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white">
            <Icon icon="solar:videocamera-record-bold" size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-white">
            {getItemTitle(item)}
          </h3>
          <span className="text-[11px] font-medium tracking-wide text-white uppercase">
            Movie
          </span>
        </div>
        <p className="mt-1 text-xs font-medium tracking-wide text-white uppercase">
          {getItemMeta(item)}
        </p>
        {item?.overview ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white">
            {item.overview}
          </p>
        ) : null}
      </div>

      <div className="flex items-start">
        <span
          className={cn(
            'inline-flex min-w-[84px] items-center justify-center px-3 py-2 text-[10px] font-bold tracking-widest uppercase',
            isAdded
              ? ' text-white'
              : ' text-white'
          )}
        >
          {isAdded ? 'Added' : 'Add'}
        </span>
      </div>
    </button>
  )
}

function DraftItemCard({ index, item, onRemove }) {
  const posterSrc = getPosterSrc(item)

  return (
    <div className="grid grid-cols-[24px_56px_minmax(0,1fr)_auto] items-center gap-3  p-2">
      <span className="text-center text-[11px] font-medium tracking-wide text-white">
        {index + 1}
      </span>

      <div className="relative aspect-[2/3] overflow-hidden ">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={getItemTitle(item)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white">
            <Icon icon="solar:videocamera-record-bold" size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {getItemTitle(item)}
        </p>
        <p className="mt-1 text-[10px] font-medium tracking-wide text-white uppercase">
          {getItemMeta(item)}
        </p>
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
  )
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
    () =>
      new Set(draftItems.map((item) => `${item.entityType}-${item.entityId}`)),
    [draftItems]
  )

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-4 pb-20 pt-8 sm:px-8 sm:pb-24 sm:pt-10`}
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-zuume text-5xl leading-none tracking-tight uppercase text-white sm:text-6xl">
            Create List
          </h1>
          {seededItemTitle ? (
            <p className="text-sm leading-6 text-white">
              Seeded with <span className="text-white">{seededItemTitle}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <section>
              <PanelHeader badge="List Details" title="Details" />

              <div className="grid gap-3 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold tracking-widest text-white uppercase">
                    Title
                  </label>
                  <Input
                    value={draftTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder="90s Sci-Fi Essentials"
                    className={{
                      wrapper:
                        ' px-4 transition focus-within:',
                      input:
                        'h-12 text-sm text-white placeholder:text-white outline-none',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold tracking-widest text-white uppercase">
                    Description
                  </label>
                  <Textarea
                    value={draftDescription}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder="Optional"
                    maxHeight={220}
                    className={{
                      textarea:
                        'w-full min-h-[120px]  px-4 py-3 text-sm text-white outline-none transition placeholder:text-white focus:',
                    }}
                  />
                </div>
              </div>
            </section>

            <section>
              <PanelHeader badge="Quick Add" title="Quick Add" />

              <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                <Input
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      onQuickAddTopResult()
                    }
                  }}
                  placeholder="Search movies"
                  autoFocus
                  leftIcon={<Icon icon="solar:magnifer-bold" size={16} />}
                  rightIcon={
                    isSearching ? (
                      <Icon
                        icon="solar:spinner-bold"
                        size={16}
                        className="animate-spin"
                      />
                    ) : null
                  }
                  className={{
                    wrapper:
                      ' px-4 transition focus-within:',
                    input:
                      'h-13 text-sm text-white placeholder:text-white outline-none',
                    leftIcon: 'flex shrink-0 items-center pr-3 text-white',
                    rightIcon: 'flex shrink-0 items-center pl-3 text-white',
                  }}
                />

                {searchError ? (
                  <div className=" px-4 py-3 text-sm text-white">
                    {searchError}
                  </div>
                ) : null}

                <div className="space-y-2.5">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <SearchResultCard
                        key={`${item.entityType}-${item.entityId}`}
                        item={item}
                        isAdded={selectedKeys.has(
                          `${item.entityType}-${item.entityId}`
                        )}
                        onAdd={onResultAdd}
                      />
                    ))
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center  px-6 text-center text-sm text-white">
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
            <section>
              <PanelHeader
                badge="Draft"
                title="Draft"
                meta={`${draftItems.length}`}
              />

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
                  <div className="flex min-h-40 items-center justify-center  px-6 text-center text-sm text-white">
                    No titles yet
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Link
                    href={listIndexHref}
                    className="inline-flex h-11 items-center justify-center gap-2  px-5 text-[11px] font-bold tracking-widest text-white uppercase transition hover: disabled:cursor-not-allowed"
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
  )
}
