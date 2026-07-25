'use client';

import { useDeferredValue, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TMDB_IMG } from '@/core/constants';
import { useAuth } from '@/core/modules/auth';
import { Container } from '@/core/modules/modal';
import { useModalActions } from '@/core/modules/modal';
import { useToast } from '@/core/modules/notification';
import { createUserListWithItems } from '@/core/services/media/lists';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { cn, formatYear } from '@/core/utils';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;
  const entityId = String(item?.id ?? item?.entityId ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();
  if (!entityId || (!title && !name)) return null;
  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId,
    entityType,
    genre_ids: Array.isArray(item?.genre_ids)
      ? item.genre_ids
      : Array.isArray(item?.genreIds)
        ? item.genreIds
        : [],
    id: entityId,
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || null,
    first_air_date: item?.first_air_date || null,
    release_date: item?.release_date || null,
    title: title || name,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

function getDraftMediaKey(item) {
  return `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`;
}

function getItemDisplayTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

function getItemYear(item) {
  return formatYear(item?.release_date || item?.first_air_date);
}

export default function CreateListModal({ close, data }) {
  const auth = useAuth();
  const { closeAllModals } = useModalActions();
  const toast = useToast();
  const router = useRouter();
  const seedMedia = data?.media ?? null;

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftItems, setDraftItems] = useState(() => {
    if (!seedMedia) return [];
    const normalized = normalizeSearchResult(seedMedia);
    return normalized ? [normalized] : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));
  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults =
    searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  useEffect(() => {
    if (!seedMedia) return;
    const normalized = normalizeSearchResult(seedMedia);
    if (!normalized) return;
    setDraftItems((current) => {
      const key = getDraftMediaKey(normalized);
      if (current.some((item) => getDraftMediaKey(item) === key)) return current;
      return [...current, normalized];
    });
  }, [seedMedia]);

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          TmdbService.searchContent(deferredSearchQuery, 'movie', 1),
          TmdbService.searchContent(deferredSearchQuery, 'tv', 1),
        ]);
        const results = [
          ...(movieResponse?.data?.results || []),
          ...(tvResponse?.data?.results || []),
        ]
          .map(normalizeSearchResult)
          .filter(Boolean);
        if (!ignore) {
          startSearchTransition(() => setSearchResults(results));
        }
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);
    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  const handleAdd = (item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((current) => {
      if (current.some((existing) => getDraftMediaKey(existing) === key)) return current;
      return [...current, item];
    });
  };

  const handleRemove = (item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((current) => current.filter((existing) => getDraftMediaKey(existing) !== key));
  };

  const handleQuickAdd = () => {
    if (!searchResults.length) return;
    handleAdd(searchResults[0]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (isSaving || !canSubmit) return;
    if (!auth.user?.id) {
      toast.error('You must be signed in to create a list');
      return;
    }
    setIsSaving(true);
    try {
      const nextList = await createUserListWithItems({
        description: draftDescription,
        items: draftItems,
        title: draftTitle,
        userId: auth.user.id,
      });
      closeAllModals({
        success: true,
        list: nextList,
      });
      const ownerHandle = nextList?.ownerSnapshot?.username;
      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`);
      }
    } catch (error) {
      toast.error(error?.message || 'The list could not be created');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container
      className="flex h-[92dvh] max-h-[100dvh] w-full flex-col justify-between sm:h-full sm:max-h-full sm:w-[560px] md:w-[600px] lg:w-[640px]"
      header={false}
      close={close}
      bodyClassName="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="List title (required)"
            autoFocus
            className={{
              wrapper:
                'flex h-11 items-center rounded-2xl border border-black/10 bg-black/5 px-4 focus-within:border-black/20 focus-within:bg-white',
              input:
                'h-full w-full bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/50',
            }}
          />
          <Input
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            placeholder="Description (optional)"
            className={{
              wrapper:
                'flex h-11 items-center rounded-2xl border border-black/10 bg-black/5 px-4 focus-within:border-black/20 focus-within:bg-white',
              input:
                'h-full w-full bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/50',
            }}
          />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="Search movies or TV shows to add..."
            leftIcon={<Icon icon="solar:magnifer-linear" size={16} className="text-black/50" />}
            rightIcon={
              isSearching ? (
                <Icon
                  icon="solar:spinner-bold-duotone"
                  size={16}
                  className="animate-spin text-black/50"
                />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-black/50 hover:text-black"
                >
                  <Icon icon="material-symbols:close-rounded" size={16} />
                </button>
              ) : null
            }
            className={{
              wrapper:
                'flex h-11 items-center rounded-2xl border border-black/10 bg-black/5 px-4 focus-within:border-black/20 focus-within:bg-white',
              input:
                'h-full w-full bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/50',
              leftIcon: 'flex shrink-0 items-center pr-2.5',
              rightIcon: 'flex shrink-0 items-center pl-2',
            }}
          />
        </div>

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
        >
          {showSearchResults ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[10px] font-bold tracking-wider text-black/50 uppercase">
                  Search Results ({searchResults.length})
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {searchResults.map((item, index) => (
                  <SearchResultRow
                    key={getDraftMediaKey(item)}
                    index={index}
                    item={item}
                    isAdded={selectedKeys.has(getDraftMediaKey(item))}
                    onAdd={handleAdd}
                  />
                ))}
                {isSearching && searchResults.length === 0 && (
                  <div className="flex h-24 items-center justify-center text-sm font-medium text-black/50">
                    Searching titles...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {draftItems.length > 0 && (
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-[10px] font-bold tracking-wider text-black/50 uppercase">
                    Selected Titles ({draftItems.length})
                  </span>
                </div>
              )}
              {draftItems.length > 0 ? (
                draftItems.map((item) => (
                  <DraftItemRow key={getDraftMediaKey(item)} item={item} onRemove={handleRemove} />
                ))
              ) : (
                <div
                  key="empty-draft"
                  className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-black/5 p-6 text-center"
                >
                  <Icon
                    icon="solar:clapperboard-play-bold-duotone"
                    size={24}
                    className="text-black/50"
                  />
                  <div>
                    <p className="text-xs font-semibold text-black/70">No titles added yet</p>
                    <p className="mt-0.5 text-[11px] text-black/50">
                      Search movies or TV shows above to start building your list
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-black/10 pt-3">
          <div className="flex items-center justify-between px-1 text-xs font-medium text-black/50">
            <span>
              {draftItems.length} {draftItems.length === 1 ? 'title' : 'titles'} selected
            </span>
            {!draftTitle.trim() && (
              <span className="text-error/80 font-normal">List title required</span>
            )}
          </div>

          <div className={NAV_ACTION_STYLES.row}>
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={getNavActionClass({
                isActive: false,
                className: 'flex-1',
              })}
            >
              <Icon icon="solar:close-circle-bold" size={NAV_ACTION_STYLES.icon} />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              disabled={isSaving || !canSubmit}
              className={getNavActionClass({
                isActive: true,
                className: 'flex-1 disabled:cursor-not-allowed disabled:opacity-50',
              })}
            >
              <Icon
                icon={isSaving ? 'solar:spinner-bold-duotone' : 'solar:add-folder-bold'}
                size={NAV_ACTION_STYLES.icon}
                className={isSaving ? 'animate-spin' : ''}
              />
              <span>{isSaving ? 'Creating...' : 'Create List'}</span>
            </button>
          </div>
        </div>
      </form>
    </Container>
  );
}

function SearchResultRow({ item, isAdded, onAdd, index }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const posterPath = item?.poster_path;
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <div
      onClick={() => !isAdded && onAdd(item)}
      className={cn(
        'group flex w-full cursor-pointer items-center justify-between rounded-[16px] border border-transparent p-1 select-none',
        isAdded
          ? 'cursor-default bg-black/5 opacity-60'
          : 'bg-white hover:border-black/5 hover:bg-black/5',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[14px]">
          <AdaptiveImage
            mode="img"
            src={posterPath ? `${TMDB_IMG}/w92${posterPath}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-black/10"
          />
        </div>

        <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span className="truncate text-sm leading-tight font-bold text-black uppercase">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mr-1 flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-xl border px-2.5 text-xs font-bold tracking-wider uppercase',
          isAdded
            ? 'bg-info/10 text-info border-transparent'
            : 'border-black/10 bg-black/5 text-black/70 group-hover:border-transparent group-hover:bg-black group-hover:text-white',
        )}
      >
        <Icon icon={isAdded ? 'solar:check-circle-bold' : 'solar:add-circle-bold'} size={16} />
        <span>{isAdded ? 'Added' : 'Add'}</span>
      </div>
    </div>
  );
}

function DraftItemRow({ item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  const posterPath = item?.poster_path;
  const isTv = item?.media_type === 'tv' || item?.entityType === 'tv';

  return (
    <div className="group flex w-full items-center justify-between rounded-[16px] border border-black/5 bg-white p-1 select-none hover:bg-black/5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[14px]">
          <AdaptiveImage
            mode="img"
            src={posterPath ? `${TMDB_IMG}/w92${posterPath}` : undefined}
            alt={title}
            className="h-full w-full object-cover"
            wrapperClassName="h-full w-full bg-black/10"
          />
        </div>

        <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span className="truncate text-sm leading-tight font-bold text-black uppercase">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70 uppercase">
                {isTv ? 'TV' : 'Movie'}
              </span>
            </div>
            {year !== 'N/A' && (
              <div className="flex w-fit items-center gap-1 rounded-[8px] border border-black/5">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-tight text-black/70">
                  {year}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
        className="hover:border-error/20 hover:bg-error/10 hover:text-error mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-black/5 text-black/50"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </button>
    </div>
  );
}
